#!/usr/bin/env node
/**
 * Stage A — Deterministic checker for 144 Profiles QA pipeline.
 * Spec: 📋 Stage A — Canonical Vocabulary + Regex Spec (DRAFT 2026-06-11)
 * Single source of truth for vocabulary; do not duplicate lists elsewhere.
 *
 * Usage:
 *   node scripts/qa/stage-a.mjs [--format bold|h2] [--pretty] <file|dir>...
 *
 * --format bold   Sections use **Section Name:** headers (default, matches gold-standard profiles)
 * --format h2     Sections use ## Section Name headers (matches Batch Runner Scaffold output)
 * --pretty        Pretty-print JSON output
 *
 * Output: JSON array of result objects:
 *   { profile_id, stage_a: "pass" | [{rule, line, matched, note}], flags? }
 *   flags = [{rule, line, matched, severity: "flag_for_review", note}]
 *
 * Exit codes: 0 = all pass, 1 = one or more fail or flag, 2 = usage error
 *
 * Header format is pending Jon's decision (bold vs h2). Pass the correct flag
 * once confirmed. Both formats are fully supported.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { parseArgs } from 'util';

// ─── Vocabulary ───────────────────────────────────────────────────────────────
// Per canonical list maintenance rule: update this file first, then rerun.
// A vocabulary change invalidates all prior Stage A passes — rerun required.

// Rule 1 — Banned synthesis words (body text only)
// Source: SPARK MP §0 Rule 12
const BANNED_SYNTHESIS = /\b(unique(?:ly|ness|s)?|gift(?:ed|edness)?|rar(?:e|ely|est|ity)|special(?:ly|ness)?|(?:im)?balance[ds]?|balanc(?:ing|ed))\b/gi;

// Rule 2a — Banned title words (composite title field)
// Rule 2b — Same words capitalized mid-prose in body (de facto title usage)
// Source: SPARK MP §0 Rule 12
const BANNED_TITLE_IN_FIELD = /\b(architect|navigator|bridge|compass|beacon|anchor|weaver|guide)\b/gi;
const BANNED_TITLE_MIDPROSE = /\b(Architect|Navigator|Bridge|Compass|Beacon|Anchor|Weaver|Guide)\b/g;

// Rule 3a — MBTI 4-letter type codes (body + title)
const MBTI_CODE = /\b[IE][NS][TF][JP]\b/g;

// Rule 3b — MBTI framework references (body + title)
const MBTI_STRINGS = /\b(Myers|MBTI|Myers[- ]Briggs)\b/gi;

// Rule 3c — introvert/extravert used as type label, not as modifier
// Permitted: "introverted orientation" — excluded via negative lookahead
const MBTI_TYPE_LABEL = /\b(introvert|extravert|extrovert)s?\b(?!\s+orientation)/gi;

// Rule 4 — Working Genius: framework name = hard fail
const WG_FRAMEWORK = /\b(Working\s+Genius|Lencioni|Patrick\s+Lencioni)\b/gi;

// Rule 4 — WG genius-type labels: flag-for-review when framework name absent;
// hard-fail when co-present with WG_FRAMEWORK. Mobilizing is explicitly excluded
// (it is this system's own Hand-phase vocabulary).
// Jon decision pending: confirm flag-for-review vs. hard-fail for standalone terms.
const WG_TERMS = /\b(Wonder|Invention|Discernment|Galvanizing|Enablement|Tenacity)\b/gi;

// Rule 4 — Additional licensed-framework leakage (Dependency 3)
const FRAMEWORK_LEAKAGE = /\b(RHETI|YSQ|SMI|Schema\s+Mode\s+Inventory|Young\s+Schema\s+Questionnaire)\b/gi;

// Rule 5c — Third-person voice drift (body text)
const THIRD_PERSON = /\bthis type (tends?|is|has|will|can|may|might|often|always|rarely|usually)\b/gi;
const THIRD_PERSON_EXT = /\b(people of this type|they tend to|such people|this configuration tends)\b/gi;

// Rule 5 — Canonical section names and order (8 sections per profile)
// Source: Batch Runner Prompt Scaffold v1 (DRAFT 2026-06-11)
// Dependency 1 resolved: 8 sections × N profiles (not 32 distinct names).
const CANONICAL_SECTIONS = [
  'Core Motivation',
  'Processing Architecture',
  'Contribution and Drain',
  'Intersection',
  'Blind Spot',
  'In the Room',
  'Growth Edge',
  'What Would Disconfirm',
];

// Rule 5b — Per-section word count bounds (locked)
const WORD_MIN = 100;
const WORD_MAX = 130;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lineOf(text, index) {
  // 1-based line number of character at `index` within `text`
  return text.slice(0, index).split('\n').length;
}

function findAll(re, text, rule, note) {
  const results = [];
  const pattern = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  pattern.lastIndex = 0;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    results.push({ rule, line: lineOf(text, m.index), matched: m[0], note });
  }
  return results;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function sectionRe(format) {
  // Returns a regex that captures the section name from a header line.
  if (format === 'h2') return /^##\s+(.+?)\s*$/;
  // bold: **Section Name:** or **Section Name**
  return /^\*\*(.+?):?\*\*\s*$/;
}

function parseProfile(text, format) {
  const lines = text.split('\n');
  let title = '';
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed) {
      // Strip optional "Title:" or "Composite Title:" prefix
      title = trimmed.replace(/^(composite\s+)?title\s*:\s*/i, '').trim();
      bodyStart = i + 1;
      break;
    }
  }

  const headerPattern = sectionRe(format);
  const sections = [];
  let current = null;
  let sectionLines = [];
  let sectionBodyStart = bodyStart;

  for (let i = bodyStart; i < lines.length; i++) {
    const m = lines[i].match(headerPattern);
    if (m) {
      if (current !== null) {
        sections.push({ name: current, body: sectionLines.join('\n'), bodyLineStart: sectionBodyStart });
      }
      current = m[1].trim();
      sectionLines = [];
      sectionBodyStart = i + 1;
    } else {
      sectionLines.push(lines[i]);
    }
  }
  if (current !== null) {
    sections.push({ name: current, body: sectionLines.join('\n'), bodyLineStart: sectionBodyStart });
  }

  return {
    title,
    bodyText: lines.slice(bodyStart).join('\n'),
    bodyLineOffset: bodyStart,
    sections,
  };
}

// ─── Checker ─────────────────────────────────────────────────────────────────

function check(profileId, text, format) {
  const { title, bodyText, bodyLineOffset, sections } = parseProfile(text, format);

  const violations = [];
  const flags = [];

  // Helper: offset line numbers to be document-relative
  const bodyViolations = (re, rule, note) =>
    findAll(re, bodyText, rule, note).map(v => ({ ...v, line: v.line + bodyLineOffset }));

  // Rule 1 — Banned synthesis words (body)
  violations.push(...bodyViolations(BANNED_SYNTHESIS, 'R1_banned_synthesis', 'banned synthesis word (Rule 12)'));

  // Rule 2a — Banned title words in composite title field
  findAll(BANNED_TITLE_IN_FIELD, title, 'R2a_banned_title_field', 'banned word in composite title (Rule 12)').forEach(v =>
    violations.push({ ...v, line: 1 })
  );

  // Rule 2b — Banned title words capitalized mid-prose in body
  // Note: sentence-start false positives possible; add exclusion if needed in testing.
  bodyViolations(BANNED_TITLE_MIDPROSE, 'R2b_title_midprose', 'title word capitalized mid-prose — may be de facto title (Rule 12)').forEach(v =>
    violations.push(v)
  );

  // Rule 3a — MBTI 4-letter codes (body + title)
  violations.push(...bodyViolations(MBTI_CODE, 'R3a_mbti_code', 'MBTI 4-letter type code (Rules 10/16)'));
  findAll(MBTI_CODE, title, 'R3a_mbti_code_title', 'MBTI type code in title').forEach(v =>
    violations.push({ ...v, line: 1 })
  );

  // Rule 3b — MBTI framework strings (body + title)
  violations.push(...bodyViolations(MBTI_STRINGS, 'R3b_mbti_strings', 'MBTI framework reference (Rules 10/16)'));
  findAll(MBTI_STRINGS, title, 'R3b_mbti_strings_title', 'MBTI reference in title').forEach(v =>
    violations.push({ ...v, line: 1 })
  );

  // Rule 3c — introvert/extravert as type label
  violations.push(...bodyViolations(MBTI_TYPE_LABEL, 'R3c_type_label', 'introvert/extravert as type label — permitted only as modifier e.g. "introverted orientation" (Rule 16)'));

  // Rule 4 — WG framework hard fails
  const wgFrameworkHits = bodyViolations(WG_FRAMEWORK, 'R4_wg_framework', 'Working Genius framework reference (Rule 10)');
  violations.push(...wgFrameworkHits);

  // Rule 4 — WG genius-type standalone terms
  const wgTermHits = bodyViolations(WG_TERMS, 'R4_wg_terms', 'WG genius-type label — hard fail if co-present with framework name; flag-for-review otherwise');
  if (wgFrameworkHits.length > 0) {
    violations.push(...wgTermHits);
  } else {
    // Pending Jon decision: A=hard-fail, B=flag-for-review (current default), C=permit
    flags.push(...wgTermHits.map(v => ({ ...v, severity: 'flag_for_review' })));
  }

  // Rule 4 — Additional framework leakage
  violations.push(...bodyViolations(FRAMEWORK_LEAKAGE, 'R4_framework_leakage', 'licensed framework reference (Section 14)'));

  // Rule 5a — Section count and canonical order
  if (sections.length !== CANONICAL_SECTIONS.length) {
    violations.push({
      rule: 'R5a_section_count',
      line: null,
      matched: `${sections.length} sections found`,
      note: `expected ${CANONICAL_SECTIONS.length}: [${CANONICAL_SECTIONS.join(' / ')}]; got: [${sections.map(s => s.name).join(' / ')}]`,
    });
  } else {
    for (let i = 0; i < CANONICAL_SECTIONS.length; i++) {
      if (sections[i].name !== CANONICAL_SECTIONS[i]) {
        violations.push({
          rule: 'R5a_section_order',
          line: null,
          matched: `position ${i + 1}: "${sections[i].name}"`,
          note: `expected "${CANONICAL_SECTIONS[i]}"`,
        });
      }
    }
  }

  // Rule 5b — Per-section word count
  for (const section of sections) {
    const words = wordCount(section.body);
    if (words < WORD_MIN || words > WORD_MAX) {
      violations.push({
        rule: 'R5b_section_length',
        line: section.bodyLineStart,
        matched: `"${section.name}" — ${words} words`,
        note: `must be ${WORD_MIN}–${WORD_MAX} words`,
      });
    }
  }

  // Rule 5c — Third-person voice drift
  violations.push(...bodyViolations(THIRD_PERSON, 'R5c_voice_drift', 'third-person drift ("this type tends/is/has…")'));
  violations.push(...bodyViolations(THIRD_PERSON_EXT, 'R5c_voice_drift_ext', 'third-person drift (extended pattern)'));

  return {
    profile_id: profileId,
    stage_a: violations.length === 0 ? 'pass' : violations,
    ...(flags.length > 0 ? { flags } : {}),
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const { values: opts, positionals: paths } = parseArgs({
  args: process.argv.slice(2),
  options: {
    format: { type: 'string', default: 'bold' },
    pretty:  { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

if (paths.length === 0) {
  process.stderr.write(
    'Stage A checker — 144 Profiles QA pipeline\n' +
    'Usage: node scripts/qa/stage-a.mjs [--format bold|h2] [--pretty] <file|dir>...\n' +
    '\n--format bold  Sections use **Section Name:** (default)\n' +
    '--format h2    Sections use ## Section Name\n' +
    '--pretty       Pretty-print JSON\n'
  );
  process.exit(2);
}

if (!['bold', 'h2'].includes(opts.format)) {
  process.stderr.write(`Unknown format "${opts.format}". Use "bold" or "h2".\n`);
  process.exit(2);
}

function collectFiles(inputPaths) {
  const files = [];
  for (const p of inputPaths) {
    const abs = resolve(p);
    const s = statSync(abs);
    if (s.isDirectory()) {
      for (const f of readdirSync(abs)) {
        if (['.txt', '.md'].includes(extname(f).toLowerCase())) {
          files.push(resolve(abs, f));
        }
      }
    } else {
      files.push(abs);
    }
  }
  return files.sort();
}

const files = collectFiles(paths);
if (files.length === 0) {
  process.stderr.write('No .txt or .md files found in the given paths.\n');
  process.exit(2);
}

const results = files.map(fp => {
  const text = readFileSync(fp, 'utf8');
  const profileId = basename(fp, extname(fp));
  return check(profileId, text, opts.format);
});

process.stdout.write(JSON.stringify(results, null, opts.pretty ? 2 : 0) + '\n');

const anyFail = results.some(r => r.stage_a !== 'pass' || r.flags?.length > 0);
process.exit(anyFail ? 1 : 0);
