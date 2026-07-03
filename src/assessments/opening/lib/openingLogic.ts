import type { RegisterBand, RegisterClass, RegisterProfile, Verbosity } from './openingTypes';

// Turn-2 follow-up bank — verbatim from spec, keyed by register class
export const OPENING_FOLLOWUPS_V1: Record<RegisterClass, string> = {
  'situation-heavy / interiority-light': "What's it been like for you to sit with that?",
  'interiority-heavy / situation-light': "What brought that to the surface this week?",
  'very short / guarded': "No need to go deep — even a small thing counts. What else has been around?",
  'default / balanced': "What about it has stayed with you?",
};

// Turn-3 widening bank — per DEVIATIONS.md DEV-04 (copy not defined in spec)
const TURN3_WIDENING: Record<RegisterClass, string> = {
  'situation-heavy / interiority-light': "Is there any part of it that's been present for you — inside?",
  'interiority-heavy / situation-light': "What else has been present for you around it?",
  'very short / guarded': "Even a word or two is enough — what else has been around lately?",
  'default / balanced': "What else has been on your mind this week?",
};

export function getTurn3Widening(registerClass: RegisterClass): string {
  return TURN3_WIDENING[registerClass];
}

// Inner-state word list for interiority heuristic
const INNER_STATE_WORDS = new Set([
  'feel', 'felt', 'feeling', 'think', 'thought', 'thinking', 'thoughts',
  'realize', 'realized', 'realizing', 'wonder', 'wondered', 'wondering',
  'worry', 'worried', 'worrying', 'fear', 'feared', 'fearing', 'hope',
  'hoped', 'hoping', 'wish', 'wished', 'wishing', 'believe', 'believed',
  'believing', 'notice', 'noticed', 'noticing', 'sense', 'sensed', 'sensing',
  'imagine', 'imagined', 'imagining', 'want', 'wanted', 'wanting', 'need',
  'needed', 'needing', 'confused', 'anxious', 'curious', 'excited', 'scared',
  'sad', 'happy', 'frustrated', 'overwhelmed', 'upset', 'angry', 'nervous',
  'stressed', 'tired', 'exhausted', 'proud', 'grateful', 'disappointed',
  'surprised', 'uncomfortable', 'unsure', 'uncertain', 'conflicted', 'torn',
  'dread', 'dreading', 'dreaded', 'expect', 'expected', 'expecting',
  'remember', 'remembered', 'remembering', 'dream', 'dreamed', 'dreaming',
  'longing', 'missing', 'love', 'loved', 'loving', 'hate', 'hated', 'hating',
  'enjoy', 'enjoyed', 'enjoying', 'resent', 'resented', 'resenting',
  'struggle', 'struggled', 'struggling', 'doubt', 'doubted', 'doubting',
  'regret', 'regretted', 'regretting', 'relief', 'relieved',
]);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function interiorityRatio(text: string): number {
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const innerCount = tokens.filter(t => INNER_STATE_WORDS.has(t)).length;
  return innerCount / tokens.length;
}

// Classify Turn-1 text into a register class for Turn-2 selection
// Thresholds per DEVIATIONS.md DEV-05 (BETA-TUNE)
export function classifyRegister(turn1Text: string): RegisterClass {
  const wordCount = countWords(turn1Text);

  if (wordCount < 20) return 'very short / guarded';

  const ratio = interiorityRatio(turn1Text);

  if (ratio > 0.20) return 'interiority-heavy / situation-light';
  if (ratio < 0.08) return 'situation-heavy / interiority-light';
  return 'default / balanced';
}

// Determine if Turn 3 should fire
// Per DEVIATIONS.md DEV-06 / DEV-07 (BETA-TUNE thresholds)
export function shouldFireTurn3(turn1Text: string, turn2Text: string): boolean {
  const combined = `${turn1Text} ${turn2Text}`;
  const wordCount = countWords(combined);
  if (wordCount < 40) return true;
  const ratio = interiorityRatio(combined);
  if (ratio < 0.05) return true;
  return false;
}

function verbosityBand(total: number): RegisterBand {
  if (total < 30) return 'terse';
  if (total <= 80) return 'moderate';
  return 'expansive';
}

// Build verbosity object from response texts
export function buildVerbosity(
  turn1Text: string,
  turn2Text: string,
  turn3Text: string | null,
): Verbosity {
  const t1 = countWords(turn1Text);
  const t2 = countWords(turn2Text);
  const t3 = turn3Text !== null ? countWords(turn3Text) : null;
  const total = t1 + t2 + (t3 ?? 0);
  return {
    turn1_words: t1,
    turn2_words: t2,
    turn3_words: t3,
    total_words: total,
    band: verbosityBand(total),
  };
}

// Build a deterministic-only register profile (fallback when Haiku call fails)
export function buildDeterministicProfile(
  turn1Text: string,
  turn2Text: string,
  turn3Text: string | null,
): RegisterProfile {
  const verbosity = buildVerbosity(turn1Text, turn2Text, turn3Text);
  const combined = [turn1Text, turn2Text, turn3Text ?? ''].join(' ');
  const ratio = interiorityRatio(combined);

  return {
    verbosity,
    interiority_ratio: Math.round(ratio * 1000) / 1000,
    affect: { valence: 'neutral', intensity: 'flat' },
    abstraction: 'mixed',
    agency: 'mixed',
    closure_cue: 'unclear',
  };
}

// Merge Haiku qualitative dims onto deterministic base
export function mergeQualitative(
  base: RegisterProfile,
  qualitative: Partial<Pick<RegisterProfile, 'affect' | 'abstraction' | 'agency' | 'closure_cue'>>,
): RegisterProfile {
  return {
    ...base,
    ...(qualitative.affect !== undefined && { affect: qualitative.affect }),
    ...(qualitative.abstraction !== undefined && { abstraction: qualitative.abstraction }),
    ...(qualitative.agency !== undefined && { agency: qualitative.agency }),
    ...(qualitative.closure_cue !== undefined && { closure_cue: qualitative.closure_cue }),
  };
}
