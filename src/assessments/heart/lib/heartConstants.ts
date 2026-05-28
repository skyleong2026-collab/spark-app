import type { Stance, Center, EnneagramType, ConfusablePair } from './heartTypes';

export const HIGH_SEPARATION_THRESHOLD = 0.25;
export const MODERATE_SEPARATION_THRESHOLD = 0.10;
export const FLAT_RESPONSE_THRESHOLD = 0.10;

// Threshold for "thin center margin" — triggers confirmation pair (Spec 2 Trigger A)
// Equivalent to ≤1 pick difference in forced-choice model mapped to Likert separation
export const THIN_CENTER_MARGIN_THRESHOLD = 0.10;

export const STANCE_ITEM_KEYS: Record<Stance, readonly string[]> = {
  assertive: ['S1', 'S2', 'S3', 'S4'] as const,
  dependent: ['S5', 'S6', 'S7', 'S8'] as const,
  withdrawn: ['S9', 'S10', 'S11', 'S12'] as const,
};

export const CENTER_ITEM_KEYS: Record<Center, readonly string[]> = {
  body:  ['C1', 'C2', 'C3', 'C4'] as const,
  heart: ['C5', 'C6', 'C7', 'C8'] as const,
  head:  ['C9', 'C10', 'C11', 'C12'] as const,
};

export const TYPE_MATRIX = {
  assertive: { body: 8, heart: 3, head: 7 },
  dependent: { body: 1, heart: 2, head: 6 },
  withdrawn: { body: 9, heart: 4, head: 5 },
} as const satisfies Record<Stance, Record<Center, EnneagramType>>;

// D3 correction proxy: which stances are structurally compatible with each center
// (Body-center pressure → Assertive/Withdrawn; Heart → Assertive/Dependent; Head → Dependent/Withdrawn)
export const CENTER_STANCE_COMPATIBILITY: Record<Center, readonly Stance[]> = {
  body:  ['assertive', 'withdrawn'],
  heart: ['assertive', 'dependent'],
  head:  ['dependent', 'withdrawn'],
};

// Active confirmation pairs: same-stance only, fired on thin center margin (Spec 2)
// Retired: 1|8, 2|3, 5|6, 2|9 (Stage 1 handles cross-stance ambiguity)
export const CONFUSABLE_PAIRS: ReadonlySet<ConfusablePair> = new Set<ConfusablePair>([
  '1|6', '3|7', '4|5', '4|9',
]);

export const ASSESSMENT_VERSION = 'heart_v2_stance_center';
