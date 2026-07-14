#!/usr/bin/env node
/**
 * Stage B — Haiku judge runner for 144 Profiles QA pipeline.
 * Spec: ⚖️ Stage B — Haiku Judge Prompts v1 (DRAFT 2026-06-11)
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node scripts/qa/stage-b.mjs [options] <stage-a-manifest.json> <profile-dir>
 *
 * Options:
 *   --calibration   Calibration mode: log results under calibration_run key per profile
 *   --delay <ms>    Milliseconds between API calls (default: 150)
 *   --pretty        Pretty-print JSON output
 *   --dry-run       Parse inputs and print profile list without calling API
 *
 * Input:
 *   stage-a-manifest.json  JSON array output from stage-a.mjs
 *   profile-dir            Directory containing the source profile text files (.txt/.md)
 *                          Files must be named <profile_id>.txt or <profile_id>.md
 *
 * Profiles with stage_a !== "pass" are skipped (status: "stage_a_fail").
 *
 * Output (stdout): JSON array, one object per profile:
 *   {
 *     profile_id,
 *     stage_a: "pass",
 *     b1: { verdict, reasons, flagged_spans },
 *     b2: { verdict, reasons, flagged_spans },
 *     b3: { verdict, reasons, flagged_spans },
 *     b4: { verdict, reasons, flagged_spans },
 *     status: "clean" | "flagged" | "opus_queue",
 *     calibration_run?: { timestamp, model, all_clean }  // only in --calibration mode
 *   }
 *
 * Status logic:
 *   opus_queue  — B4 verdict is "barnum" (route to Stage C Opus spot-check)
 *   flagged     — any judge non-clean (but B4 != "barnum")
 *   clean       — B1=preserved, B2=conformant, B3=pass, B4=specific
 *
 * Exit codes: 0 = all clean, 1 = one or more flagged/opus_queue, 2 = usage/API error
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { parseArgs } from 'util';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 400;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// ─── Judge definitions ────────────────────────────────────────────────────────
// Prompts transcribed verbatim from Notion: ⚖️ Stage B — Haiku Judge Prompts v1

const B1_SYSTEM = `You are a precision rubric judge for a personality profile QA pipeline. You output only valid JSON. You do not add commentary outside the JSON object.`;

const B1_USER = `You are checking a personality profile for TENSION PRESERVATION failures.

The core rule (Rule 11): A profile that synthesizes two or more center-tensions (Heart type + Head stack + Hand pattern) must NOT resolve, harmonize, or explain away the contradictions between them. The tension is the product. Violations include:

  - Explicit resolution: "these qualities complement each other", "together this makes you well-rounded", "this gives you the best of both"
  - Soft resolution framing: "your challenge is to balance X with Y" (implies balance is possible and desirable)
  - Harmonizing narrative: describing how the centers work together smoothly rather than against each other
  - Reframing the friction as a strength without acknowledging the ongoing cost
  - Ending a section with closure language that dissolves the tension ("and that is why...", "which is ultimately a gift")

Growth-edge sentences may name a direction without promising resolution — that is NOT a violation. Capability acknowledgments ("this is a real capability, not a consolation") are permitted if the tension is still held open.

## PASS EXAMPLE
Profile excerpt: "The tension doesn't resolve. Your growth edge is letting the analysis count as care — trusting that an honest read, delivered, is a form of love your pattern hasn't priced in."
Verdict: {"verdict":"preserved","reasons":["Growth edge named without promising the tension closes","No harmonizing language"],"flagged_spans":[]}

## FAIL EXAMPLE
Profile excerpt: "Your analytical mind and your warm heart actually reinforce each other — the precision you bring to relationships is what makes your care so effective. Together they give you the best of both worlds."
Verdict: {"verdict":"soft_resolution","reasons":["'reinforce each other' and 'best of both worlds' harmonize the centers rather than holding the contradiction open"],"flagged_spans":["your analytical mind and your warm heart actually reinforce each other","Together they give you the best of both worlds"]}

## PROFILE TO EVALUATE
{{PROFILE_TEXT}}

## OUTPUT SCHEMA
Return exactly this JSON object, no other text:
{
  "verdict": "preserved" | "soft_resolution" | "resolved",
  "reasons": ["<string>", ...],
  "flagged_spans": ["<exact quoted text from profile>", ...]
}

If verdict is "preserved", flagged_spans must be an empty array.
If verdict is "soft_resolution" or "resolved", flagged_spans must contain at least one exact quote.`;

const B2_SYSTEM = `You are a precision rubric judge for a personality profile QA pipeline. You output only valid JSON. You do not add commentary outside the JSON object.`;

const B2_USER = `You are checking a personality profile for REGISTER CONFORMANCE failures.

The voice charter for this profile series requires:
  - Second-person diagnostic prose: "you do X", not "you should X" and not "you will X"
  - No flattery or complimentary framing of the reader's rarity, gifts, or exceptionalism
  - No exclamation marks or rhetorical uplift register
  - No fortune-telling certainty ("will", "are destined", "this will serve")
  - No coaching imperatives in body sections ("Stop", "Start", "Make sure", "Practice")
  - No therapy-speak: no "healing", "inner child", "sitting with feelings", "self-compassion"
  - Tone is dry, precise, slightly austere — emotional warmth permitted, reassurance is not
  - Growth-edge sentences may suggest a direction; they may NOT promise outcomes or issue commands

Flag any sentence or phrase that violates one or more of these constraints. A single violation is enough for a "drift" verdict.

## PASS EXAMPLE
Profile excerpt: "The attentiveness keeps connection close, which is what the pattern feeds on. The friction: your own needs surface late and sideways, often as sudden hurt that seems disproportionate."
Verdict: {"verdict":"conformant","reasons":["Diagnostic, second-person, no uplift, no imperatives"],"flagged_spans":[]}

## FAIL EXAMPLE
Profile excerpt: "Your rare gift for reading people is something most individuals never develop! Embrace this superpower and start using it consciously — you will find it transforms your relationships."
Verdict: {"verdict":"drift","reasons":["'rare gift' is flattery","Exclamation mark violates register","'Embrace' and 'start using' are coaching imperatives","'you will find it transforms' is fortune-telling certainty"],"flagged_spans":["Your rare gift for reading people is something most individuals never develop!","Embrace this superpower and start using it consciously","you will find it transforms your relationships"]}

## PROFILE TO EVALUATE
{{PROFILE_TEXT}}

## OUTPUT SCHEMA
Return exactly this JSON object, no other text:
{
  "verdict": "conformant" | "drift",
  "reasons": ["<string>", ...],
  "flagged_spans": ["<exact quoted text from profile>", ...]
}

If verdict is "conformant", flagged_spans must be an empty array.
If verdict is "drift", flagged_spans must contain at least one exact quote from the profile.`;

const B3_SYSTEM = `You are a precision rubric judge for a personality profile QA pipeline. You output only valid JSON. You do not add commentary outside the JSON object.`;

const B3_USER = `You are checking a personality profile for SYNONYM EVASION of banned vocabulary.

The profile series bans specific words via script (Stage A). Your job is to catch text that performs the *work* of those banned words without using them. Flag constructions that:

  - Convey uniqueness or rarity in a flattering way: "few people can", "unlike most", "rare combination", "seldom found", "exceptional"
  - Convey balance or harmony between tensions: "equilibrium", "the best of both", "bridges X and Y", "integrates X with Y", "fusion of"
  - Convey giftedness: "superpower", "natural talent" used as flattery, "innate gift"
  - Use synonyms for banned title-words as identity labels: helmsman, lighthouse, lodestar, cartographer, pathfinder, pillar, rudder — especially if capitalized mid-prose or used in a title-like role

Do NOT flag:
  - Neutral capability acknowledgments without flattery: "this gives the work a precision warmth alone doesn't produce" — observation, not rarity claim
  - Growth-edge sentences that describe a possible direction without implying the reader is exceptional
  - Accurate descriptions of what a configuration makes easier vs. harder

## PASS EXAMPLE
Profile excerpt: "The method gives the search rigor most seekers lack, which reinforces it."
Verdict: {"verdict":"pass","reasons":["Describes a structural consequence, not a flattering rarity claim"],"flagged_spans":[]}

## FAIL EXAMPLE
Profile excerpt: "You sit at a rare intersection of emotional intelligence and analytical rigor — few individuals can hold both, and this uncommon blend is what makes your insight so penetrating."
Verdict: {"verdict":"fail","reasons":["'rare intersection' and 'uncommon blend' are synonym evasions of banned rarity framing","'few individuals can hold both' is a synonym evasion of banned uniqueness language"],"flagged_spans":["a rare intersection of emotional intelligence and analytical rigor","few individuals can hold both","this uncommon blend"]}

## PROFILE TO EVALUATE
{{PROFILE_TEXT}}

## OUTPUT SCHEMA
Return exactly this JSON object, no other text:
{
  "verdict": "pass" | "fail",
  "reasons": ["<string>", ...],
  "flagged_spans": ["<exact quoted text from profile>", ...]
}

If verdict is "pass", flagged_spans must be an empty array.
If verdict is "fail", flagged_spans must contain at least one exact quote.`;

const B4_SYSTEM = `You are a precision rubric judge for a personality profile QA pipeline. You output only valid JSON. You do not add commentary outside the JSON object.`;

const B4_USER = `You are checking a personality profile for GENERIC / BARNUM content.

Barnum text is prose so broad and universally appealing that it could appear unchanged in a large fraction of all personality profiles without feeling wrong. It passes not because it's true but because it's vague enough to be true for almost anyone.

Examples of Barnum patterns:
  - "You care deeply about the people in your life"
  - "Sometimes you feel misunderstood by those around you"
  - "You have a tendency to hold yourself to high standards"
  - "You are capable of great insight when you give yourself the space to reflect"
  - "Others may not always see how much effort you put in"

You are evaluating the profile TEXT ONLY — no type labels, no stack notation, no pattern name has been provided. Your task:
1. Read the full profile text.
2. Identify the THREE most generic sentences — sentences that could appear unchanged in at least half of all profiles.
3. Decide: is the profile "specific" (most content is tightly tied to a recognizable configuration), "partially_generic" (some sections do real work but others are filler), or "barnum" (the dominant character of the prose is generic and could describe almost anyone).

A single generic sentence in an otherwise specific profile does NOT make it "barnum". Use your judgment on the overall character of the text.

## PASS EXAMPLE
Profile excerpt: "Your Ti-Ne thinking builds internal models — you take what you observe about a person, test it against your own logic, and generate possibilities for what they might need next. This gives your care a precision warmth alone doesn't produce: you're not just attentive, you're correct, often anticipating a need before the person has located it themselves."
Verdict: {"verdict":"specific","reasons":["Content is tied to a specific cognitive pattern and describes a particular mechanism, not a universal trait"],"flagged_spans":[]}

## FAIL EXAMPLE
Profile excerpt: "You are a thoughtful and caring person who wants the best for others. Sometimes your depth is hard for people to understand. You have a lot to offer when you let yourself shine."
Verdict: {"verdict":"barnum","reasons":["All three sentences could appear in virtually any profile without modification"],"flagged_spans":["You are a thoughtful and caring person who wants the best for others","Sometimes your depth is hard for people to understand","You have a lot to offer when you let yourself shine"]}

## PROFILE TO EVALUATE (TYPE LABELS STRIPPED)
{{PROFILE_TEXT_LABELS_STRIPPED}}

## OUTPUT SCHEMA
Return exactly this JSON object, no other text:
{
  "verdict": "specific" | "partially_generic" | "barnum",
  "reasons": ["<string>", ...],
  "flagged_spans": ["<exact quoted text — the three most generic sentences>", ...]
}

flagged_spans must always contain exactly three entries (the three most generic sentences found, even if verdict is "specific" — these are the candidates the human reviewer can sanity-check).`;

const JUDGES = [
  { id: 'b1', system: B1_SYSTEM, user: B1_USER, placeholder: '{{PROFILE_TEXT}}',               cleanVerdicts: ['preserved'] },
  { id: 'b2', system: B2_SYSTEM, user: B2_USER, placeholder: '{{PROFILE_TEXT}}',               cleanVerdicts: ['conformant'] },
  { id: 'b3', system: B3_SYSTEM, user: B3_USER, placeholder: '{{PROFILE_TEXT}}',               cleanVerdicts: ['pass'] },
  { id: 'b4', system: B4_SYSTEM, user: B4_USER, placeholder: '{{PROFILE_TEXT_LABELS_STRIPPED}}', cleanVerdicts: ['specific'] },
];

// ─── Type-label stripping (for B4) ───────────────────────────────────────────

function stripTypeLabels(text) {
  return text
    // Remove composite title / first non-empty line
    .replace(/^[^\n]*\n/, '')
    // Enneagram: "Type 1", "Type 2w3", "E4", "9w1", standalone
    .replace(/\bType\s+\d+(?:w\d+)?\b/gi, '')
    .replace(/\b[Ee]\d+(?:w\d+)?\b/g, '')
    .replace(/\b\d+w\d+\b/g, '')
    // Cognitive function stacks: Ti-Ne, Fe-Ni, Te-Si, etc.
    .replace(/\b[A-Z][ie]-[A-Z][ie](?:-[A-Z][ie]-[A-Z][ie])?\b/g, '')
    // Hand pattern labels: Mobilizing, Wonder, Invention, Discernment, Galvanizing, Enablement, Tenacity (as capitalized labels)
    .replace(/\b(Mobilizing|Wonder|Invention|Discernment|Galvanizing|Enablement|Tenacity)\b/g, '')
    // Clean up any orphaned punctuation from removals
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function callJudge(apiKey, systemPrompt, userPrompt, judgeId) {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * Math.pow(2, attempt - 1));
    let res;
    try {
      res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body,
      });
    } catch (e) {
      lastErr = e;
      continue;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '(no body)');
      lastErr = new Error(`${judgeId} HTTP ${res.status}: ${errText}`);
      if (res.status < 500) break; // 4xx: don't retry
      continue;
    }

    const data = await res.json();
    const raw = data?.content?.[0]?.text ?? '';
    try {
      return JSON.parse(raw.trim());
    } catch {
      throw new Error(`${judgeId}: model returned non-JSON:\n${raw}`);
    }
  }
  throw lastErr ?? new Error(`${judgeId}: exhausted retries`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deriveStatus(b1, b2, b3, b4) {
  if (b4.verdict === 'barnum') return 'opus_queue';
  const allClean =
    JUDGES[0].cleanVerdicts.includes(b1.verdict) &&
    JUDGES[1].cleanVerdicts.includes(b2.verdict) &&
    JUDGES[2].cleanVerdicts.includes(b3.verdict) &&
    JUDGES[3].cleanVerdicts.includes(b4.verdict);
  return allClean ? 'clean' : 'flagged';
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const { values: opts, positionals: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    calibration: { type: 'boolean', default: false },
    pretty:      { type: 'boolean', default: false },
    'dry-run':   { type: 'boolean', default: false },
    delay:       { type: 'string',  default: '150' },
  },
  allowPositionals: true,
});

if (args.length !== 2) {
  process.stderr.write(
    'Stage B runner — 144 Profiles QA pipeline\n' +
    'Usage: ANTHROPIC_API_KEY=sk-... node scripts/qa/stage-b.mjs [options] <stage-a-manifest.json> <profile-dir>\n' +
    '\nOptions:\n' +
    '  --calibration   Log calibration_run metadata per profile\n' +
    '  --delay <ms>    Delay between API calls (default: 150)\n' +
    '  --pretty        Pretty-print JSON output\n' +
    '  --dry-run       List profiles without calling API\n'
  );
  process.exit(2);
}

const [manifestPath, profileDir] = args.map(p => resolve(p));
const delayMs = parseInt(opts.delay, 10);
if (isNaN(delayMs) || delayMs < 0) {
  process.stderr.write(`Invalid --delay value: ${opts.delay}\n`);
  process.exit(2);
}

const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
if (!apiKey && !opts['dry-run']) {
  process.stderr.write('ANTHROPIC_API_KEY environment variable is required.\n');
  process.exit(2);
}

// Load stage-a manifest
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (e) {
  process.stderr.write(`Failed to read stage-a manifest: ${e.message}\n`);
  process.exit(2);
}
if (!Array.isArray(manifest)) {
  process.stderr.write('stage-a manifest must be a JSON array.\n');
  process.exit(2);
}

// Build a lookup from profile_id → file path
const profileFiles = {};
for (const f of readdirSync(profileDir)) {
  const ext = extname(f).toLowerCase();
  if (['.txt', '.md'].includes(ext)) {
    const id = basename(f, ext);
    profileFiles[id] = resolve(profileDir, f);
  }
}

if (opts['dry-run']) {
  const rows = manifest.map(r => ({
    profile_id: r.profile_id,
    stage_a: r.stage_a === 'pass' ? 'pass' : 'fail',
    file_found: r.profile_id in profileFiles,
  }));
  process.stdout.write(JSON.stringify(rows, null, opts.pretty ? 2 : 0) + '\n');
  process.exit(0);
}

// ─── Main loop ────────────────────────────────────────────────────────────────

const results = [];

for (const entry of manifest) {
  const { profile_id } = entry;

  if (entry.stage_a !== 'pass') {
    results.push({ profile_id, stage_a: entry.stage_a, status: 'stage_a_fail' });
    continue;
  }

  const filePath = profileFiles[profile_id];
  if (!filePath || !existsSync(filePath)) {
    process.stderr.write(`Warning: no file found for profile "${profile_id}" in ${profileDir}\n`);
    results.push({ profile_id, stage_a: 'pass', status: 'file_not_found' });
    continue;
  }

  const profileText = readFileSync(filePath, 'utf8');
  const profileTextStripped = stripTypeLabels(profileText);

  const judgeResults = {};

  for (const judge of JUDGES) {
    const userPrompt = judge.user.replace(judge.placeholder,
      judge.placeholder === '{{PROFILE_TEXT_LABELS_STRIPPED}}' ? profileTextStripped : profileText
    );

    let judgeResult;
    try {
      judgeResult = await callJudge(apiKey, judge.system, userPrompt, judge.id);
    } catch (e) {
      process.stderr.write(`Error in ${judge.id} for "${profile_id}": ${e.message}\n`);
      judgeResult = { verdict: 'error', reasons: [e.message], flagged_spans: [] };
    }

    judgeResults[judge.id] = judgeResult;
    if (delayMs > 0) await sleep(delayMs);
  }

  const { b1, b2, b3, b4 } = judgeResults;
  const status = (b1.verdict === 'error' || b2.verdict === 'error' || b3.verdict === 'error' || b4.verdict === 'error')
    ? 'error'
    : deriveStatus(b1, b2, b3, b4);

  const result = {
    profile_id,
    stage_a: 'pass',
    b1, b2, b3, b4,
    status,
  };

  if (opts.calibration) {
    result.calibration_run = {
      timestamp: new Date().toISOString(),
      model: MODEL,
      all_clean: status === 'clean',
    };
  }

  results.push(result);
}

process.stdout.write(JSON.stringify(results, null, opts.pretty ? 2 : 0) + '\n');

const anyFail = results.some(r => r.status !== 'clean');
process.exit(anyFail ? 1 : 0);
