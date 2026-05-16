import type {
  HeartResponses,
  Stance,
  Center,
  EnneagramType,
  ConfidenceLevel,
  ConfirmationOutcome,
  ResponsePatternFlag,
  HeartScoringResult,
  ConfusablePair,
} from './heartTypes';

import {
  STANCE_ITEM_KEYS,
  CENTER_ITEM_KEYS,
  TYPE_MATRIX,
  CONFUSABLE_PAIRS,
  HIGH_SEPARATION_THRESHOLD,
  MODERATE_SEPARATION_THRESHOLD,
  FLAT_RESPONSE_THRESHOLD,
  ASSESSMENT_VERSION,
} from './heartConstants';

/**
 * Sums item responses per sub-scale, divides by 20.
 * Each sub-scale has 4 items scored 1–5; sum range is 4–20, so result is 0.20–1.00.
 */
export function computeSubScaleScores(responses: HeartResponses): {
  stance: Record<Stance, number>;
  center: Record<Center, number>;
} {
  const stance = {} as Record<Stance, number>;
  for (const [s, keys] of Object.entries(STANCE_ITEM_KEYS) as [Stance, readonly string[]][]) {
    let sum = 0;
    for (const k of keys) sum += responses[k as keyof HeartResponses];
    stance[s] = sum / 20;
  }

  const center = {} as Record<Center, number>;
  for (const [c, keys] of Object.entries(CENTER_ITEM_KEYS) as [Center, readonly string[]][]) {
    let sum = 0;
    for (const k of keys) sum += responses[k as keyof HeartResponses];
    center[c] = sum / 20;
  }

  return { stance, center };
}

/**
 * Ranks dimensions by score descending. Returns primary, secondary, and separation
 * (difference between first and second scores).
 */
export function rankDimensions<T extends string>(
  scores: Record<T, number>,
): { primary: T; secondary: T; separation: number } {
  const sorted = (Object.entries(scores) as [T, number][]).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0]![0];
  const secondary = sorted[1]![0];
  const separation = sorted[0]![1] - sorted[1]![1];
  return { primary, secondary, separation: Math.round(separation * 1000) / 1000 };
}

/** Matrix lookup: Stance × Center → EnneagramType. */
export function determineType(stance: Stance, center: Center): EnneagramType {
  return TYPE_MATRIX[stance][center];
}

/**
 * Picks the secondary type from the two candidates:
 *   - Candidate A: flip stance → TYPE_MATRIX[secondaryStance][primaryCenter]
 *   - Candidate B: flip center → TYPE_MATRIX[primaryStance][secondaryCenter]
 * Selects whichever candidate's differing-dimension score is higher
 * (i.e., whichever dimension came closer to winning).
 */
export function determineSecondaryType(
  primaryStance: Stance,
  secondaryStance: Stance,
  primaryCenter: Center,
  secondaryCenter: Center,
  stanceScores: Record<Stance, number>,
  centerScores: Record<Center, number>,
): EnneagramType {
  const candidateA = TYPE_MATRIX[secondaryStance][primaryCenter];
  const candidateB = TYPE_MATRIX[primaryStance][secondaryCenter];

  const scoreA = stanceScores[secondaryStance];
  const scoreB = centerScores[secondaryCenter];

  // Higher score = that dimension came closer to being primary → more likely secondary type.
  // On tie, prefer the stance-flip candidate (arbitrary but deterministic).
  return scoreA >= scoreB ? candidateA : candidateB;
}

/** Applies HIGH / MODERATE / LOW thresholds to a separation value. */
export function classifyConfidence(separation: number): ConfidenceLevel {
  if (separation >= HIGH_SEPARATION_THRESHOLD) return 'high';
  if (separation >= MODERATE_SEPARATION_THRESHOLD) return 'moderate';
  return 'low';
}

/** Ordered minimum: low < moderate < high. */
export function minConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const order: Record<ConfidenceLevel, number> = { low: 0, moderate: 1, high: 2 };
  return order[a] <= order[b] ? a : b;
}

/**
 * Returns 'flat' if both the stance score range and center score range
 * are below FLAT_RESPONSE_THRESHOLD (i.e., all responses are nearly identical).
 */
export function detectFlatResponse(
  stanceScores: Record<Stance, number>,
  centerScores: Record<Center, number>,
): ResponsePatternFlag {
  const stanceVals = Object.values(stanceScores) as number[];
  const centerVals = Object.values(centerScores) as number[];

  const stanceRange = Math.max(...stanceVals) - Math.min(...stanceVals);
  const centerRange = Math.max(...centerVals) - Math.min(...centerVals);

  return stanceRange < FLAT_RESPONSE_THRESHOLD && centerRange < FLAT_RESPONSE_THRESHOLD
    ? 'flat'
    : 'normal';
}

/**
 * Determines whether the confirmation step should be shown.
 * Pair-gated: at least one of the three spec rules must fire AND the primary/secondary
 * pair must be in CONFUSABLE_PAIRS. When rules fire but no valid pair exists,
 * triggered is false but reason records the fired rules for instrumentation.
 */
export function shouldTriggerConfirmation(
  primaryType: EnneagramType,
  secondaryType: EnneagramType,
  stanceConfidence: ConfidenceLevel,
  centerConfidence: ConfidenceLevel,
  overallConfidence: ConfidenceLevel,
): { triggered: boolean; pair: ConfusablePair | null; reason: string } {
  // Collect all fired rules
  const firedRules: string[] = [];

  // Rule 1: overall confidence is moderate or low
  if (overallConfidence === 'moderate' || overallConfidence === 'low') {
    firedRules.push(`overall confidence is ${overallConfidence}`);
  }

  // Rule 2: primary/secondary form a confusable pair
  const pair = makePairKey(primaryType, secondaryType);
  if (pair !== null) {
    firedRules.push('confusable pair match');
  }

  // Rule 3: stance and center confidence disagree (one high, one low)
  if (
    (stanceConfidence === 'high' && centerConfidence === 'low') ||
    (stanceConfidence === 'low' && centerConfidence === 'high')
  ) {
    firedRules.push(`split confidence: stance=${stanceConfidence}, center=${centerConfidence}`);
  }

  // No rules fired → no trigger
  if (firedRules.length === 0) {
    return { triggered: false, pair: null, reason: 'no trigger' };
  }

  // Rules fired but pair not in CONFUSABLE_PAIRS → no trigger (instrumented)
  if (pair === null) {
    return {
      triggered: false,
      pair: null,
      reason: `rules_fired_no_pair: ${firedRules.join(', ')}`,
    };
  }

  // Rules fired AND valid pair → trigger confirmation
  return {
    triggered: true,
    pair,
    reason: firedRules.join(', '),
  };
}

/**
 * Applies confirmation outcome rules to produce the final type assignment.
 *
 * agreed    → finalType = algorithm primary, finalConfidence = 'high'
 * disagreed �� finalType = user pick, finalSecondary = algorithm primary, finalConfidence = 'low'
 * uncertain → finalType = algorithm primary, finalConfidence = 'low'
 * null      → finalType = algorithm primary, finalConfidence = algorithmic overall confidence
 */
export function resolveFinalType(
  algorithmType: EnneagramType,
  algorithmSecondary: EnneagramType,
  algorithmConfidence: ConfidenceLevel,
  confirmation: ConfirmationOutcome | null,
): { finalType: EnneagramType; finalSecondary: EnneagramType; finalConfidence: ConfidenceLevel } {
  if (confirmation === null) {
    return {
      finalType: algorithmType,
      finalSecondary: algorithmSecondary,
      finalConfidence: algorithmConfidence,
    };
  }

  switch (confirmation.result) {
    case 'agreed':
      return {
        finalType: algorithmType,
        finalSecondary: algorithmSecondary,
        finalConfidence: 'high',
      };
    case 'disagreed':
      return {
        finalType: confirmation.userPick,
        finalSecondary: algorithmType,
        finalConfidence: 'low',
      };
    case 'uncertain':
      return {
        finalType: algorithmType,
        finalSecondary: algorithmSecondary,
        finalConfidence: 'low',
      };
  }
}

/**
 * Top-level scoring function. Composes all scoring steps from raw responses.
 * Returns a HeartScoringResult with confirmation fields set to their pre-confirmation
 * defaults (null). Call resolveFinalType after the confirmation step to update
 * final_type, final_secondary, and final_confidence.
 */
export function scoreHeartAssessment(responses: HeartResponses): HeartScoringResult {
  const { stance: stanceScores, center: centerScores } = computeSubScaleScores(responses);

  const stanceRank = rankDimensions(stanceScores);
  const centerRank = rankDimensions(centerScores);

  const primaryType = determineType(stanceRank.primary, centerRank.primary);
  const secondaryType = determineSecondaryType(
    stanceRank.primary,
    stanceRank.secondary,
    centerRank.primary,
    centerRank.secondary,
    stanceScores,
    centerScores,
  );

  const stanceConfidence = classifyConfidence(stanceRank.separation);
  const centerConfidence = classifyConfidence(centerRank.separation);
  const overallConfidence = minConfidence(stanceConfidence, centerConfidence);

  const responsePatternFlag = detectFlatResponse(stanceScores, centerScores);

  const confirmation = shouldTriggerConfirmation(
    primaryType,
    secondaryType,
    stanceConfidence,
    centerConfidence,
    overallConfidence,
  );

  // Pre-confirmation defaults: resolve as if no confirmation occurred
  const { finalType, finalSecondary, finalConfidence } = resolveFinalType(
    primaryType,
    secondaryType,
    overallConfidence,
    null,
  );

  return {
    assessment_version: ASSESSMENT_VERSION,
    responses,
    stance_scores: stanceScores,
    center_scores: centerScores,
    primary_stance: stanceRank.primary,
    secondary_stance: stanceRank.secondary,
    primary_center: centerRank.primary,
    secondary_center: centerRank.secondary,
    stance_separation: stanceRank.separation,
    center_separation: centerRank.separation,
    primary_type: primaryType,
    secondary_type: secondaryType,
    stance_confidence: stanceConfidence,
    center_confidence: centerConfidence,
    overall_confidence: overallConfidence,
    confirmation_triggered: confirmation.triggered,
    confirmation_pair: confirmation.pair,
    confirmation_reason: confirmation.reason,
    confirmation_result: null,
    confirmation_user_pick: null,
    final_type: finalType,
    final_secondary: finalSecondary,
    final_confidence: finalConfidence,
    response_pattern_flag: responsePatternFlag,
    randomization_seed: 0,   // Set by the hook, not the scoring module
    item_order: [],           // Set by the hook, not the scoring module
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Builds a sorted pair key and checks membership in CONFUSABLE_PAIRS. */
function makePairKey(a: EnneagramType, b: EnneagramType): ConfusablePair | null {
  const sorted = a < b ? `${a}|${b}` : `${b}|${a}`;
  return CONFUSABLE_PAIRS.has(sorted as ConfusablePair) ? (sorted as ConfusablePair) : null;
}
