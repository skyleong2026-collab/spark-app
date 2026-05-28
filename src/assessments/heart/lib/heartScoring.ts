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
  StageSplitType,
  SynthesisVariant,
} from './heartTypes';

import {
  STANCE_ITEM_KEYS,
  CENTER_ITEM_KEYS,
  TYPE_MATRIX,
  CONFUSABLE_PAIRS,
  CENTER_STANCE_COMPATIBILITY,
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
 * Selects whichever candidate's differing-dimension score is higher.
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
 * are below FLAT_RESPONSE_THRESHOLD.
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
 * Detects Stage 1 stance split type from Likert sub-scale scores.
 *
 * In the Likert model:
 *   clean   = top stance has separation ≥ MODERATE_SEPARATION_THRESHOLD from #2
 *   2-2-0   = top two stances close (< threshold), third stance clearly lower (≥ threshold below #2)
 *   2-1-1   = all three stances within threshold of each other
 */
export function detectStanceSplitType(stanceScores: Record<Stance, number>): StageSplitType {
  const sorted = (Object.entries(stanceScores) as [Stance, number][]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]![1];
  const mid = sorted[1]![1];
  const bot = sorted[2]![1];

  if (top - mid >= MODERATE_SEPARATION_THRESHOLD) return 'clean';
  if (mid - bot >= MODERATE_SEPARATION_THRESHOLD) return '2-2-0';
  return '2-1-1';
}

/**
 * D3 correction proxy (Spec 1).
 * In the forced-choice model, D3 is a specific disruption item that probes pressure-fallback
 * behavior. In the Likert model, the primary center acts as the D3 equivalent — it reflects
 * which Disruption center dominates under sustained pressure.
 *
 * Returns the split stance that D3/center evidence supports, or null if symmetric
 * (center is compatible with both split stances — does not resolve).
 */
export function d3StanceLean(
  primaryCenter: Center,
  splitStanceA: Stance,
  splitStanceB: Stance,
): Stance | null {
  const compatible = CENTER_STANCE_COMPATIBILITY[primaryCenter];
  const aCompatible = (compatible as readonly Stance[]).includes(splitStanceA);
  const bCompatible = (compatible as readonly Stance[]).includes(splitStanceB);

  if (aCompatible && !bCompatible) return splitStanceA;
  if (bCompatible && !aCompatible) return splitStanceB;
  return null; // symmetric — does not resolve split
}

/**
 * Spec 2 Trigger A: confirmation pair fires when:
 *   1. Top two type candidates share the same stance (same-stance ambiguity only)
 *   2. Center confidence is low (thin center margin)
 *   3. Stance confidence is not low (low stance → reframe gate, not pairs)
 *   4. Primary/secondary form one of the 4 active pairs
 *
 * Cross-stance ambiguity is handled by Spec 1 (split detection + D3 correction).
 * Note: caller passes stanceConfidence (not overall) as the 6th arg — overall would
 * always be 'low' when center is thin, permanently blocking the trigger.
 */
export function shouldTriggerConfirmation(
  primaryType: EnneagramType,
  secondaryType: EnneagramType,
  primaryStance: Stance,
  secondaryStance: Stance,
  centerConfidence: ConfidenceLevel,
  stanceConfidence: ConfidenceLevel,
): { triggered: boolean; pair: ConfusablePair | null; reason: string } {
  // Low stance confidence → no pairs, route to reframe gate
  if (stanceConfidence === 'low') {
    return { triggered: false, pair: null, reason: 'low_stance_confidence' };
  }

  // Cross-stance candidates → no confirmation pair (Stage 1 handles cross-stance)
  if (primaryStance !== secondaryStance) {
    return { triggered: false, pair: null, reason: 'cross_stance_no_trigger' };
  }

  // Center margin must be thin (≤ 1 pick equivalent in Likert model)
  if (centerConfidence !== 'low') {
    return { triggered: false, pair: null, reason: 'center_margin_not_thin' };
  }

  // Check active pair
  const pair = makePairKey(primaryType, secondaryType);
  if (pair === null) {
    return { triggered: false, pair: null, reason: 'no_active_pair_for_intersection' };
  }

  return { triggered: true, pair, reason: 'trigger_a_same_stance_thin_center' };
}

/**
 * Synthesis variant routing (CC Dispatch Requirement B).
 *
 * Requirement A: twoCandidate=true + confidence=low → synthesisVariant=null (skip synthesis)
 * Requirement B: confirmationPairFired=true + confidence=moderate → use synthesis_high variant
 */
export function getSynthesisVariant(
  confidence: ConfidenceLevel,
  confirmationPairFired: boolean,
  twoCandidate: boolean,
): SynthesisVariant | null {
  if (twoCandidate && confidence === 'low') return null;
  if (confidence === 'high') return 'synthesis_high';
  // Pair-resolved: regardless of pre-confirmation overall confidence, confirmation resolved the
  // center ambiguity — treat as high-quality synthesis. (Pairs fire when stance is clear but center
  // is thin, so overall = low; after the pair picks the center, the result is definitive.)
  if (confirmationPairFired) return 'synthesis_high';
  if (confidence === 'moderate') return 'synthesis_moderate';
  return 'synthesis_low';
}

/**
 * Applies confirmation outcome rules to produce the final type assignment.
 *
 * Per Spec 2: pair selection always resolves at Moderate confidence.
 * Exception: if original confidence was High and user agrees → stays High.
 *
 * agreed    → finalConfidence = min(original, high) = original if high, else moderate
 * disagreed → finalType = user pick, finalConfidence = moderate
 * uncertain → finalType = algorithm primary, finalConfidence = low (Head only; Heart UI is forced-choice)
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
      // High confidence stays high; moderate/low pair-fires resolve at moderate
      return {
        finalType: algorithmType,
        finalSecondary: algorithmSecondary,
        finalConfidence: algorithmConfidence === 'high' ? 'high' : 'moderate',
      };
    case 'disagreed':
      return {
        finalType: confirmation.userPick,
        finalSecondary: algorithmType,
        finalConfidence: 'moderate',
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
 * Top-level scoring function. Incorporates Spec 1 (ambiguity scoring) and Spec 2 (trigger logic).
 * Returns a HeartScoringResult with confirmation fields set to pre-confirmation defaults.
 * Call resolveFinalType after the confirmation step to update final_type etc.
 */
export function scoreHeartAssessment(responses: HeartResponses): HeartScoringResult {
  const { stance: stanceScores, center: centerScores } = computeSubScaleScores(responses);

  const stanceRank = rankDimensions(stanceScores);
  const centerRank = rankDimensions(centerScores);

  // Spec 1: detect stance split type
  const stage1SplitType = detectStanceSplitType(stanceScores);

  let primaryStance = stanceRank.primary;
  let stanceConfidence = classifyConfidence(stanceRank.separation);
  const centerConfidence = classifyConfidence(centerRank.separation);
  let twoCandidate = false;
  let confirmationReason = 'no_trigger';

  // Spec 1 — apply D3 correction for split cases
  if (stage1SplitType === '2-2-0') {
    const sorted = (Object.entries(stanceScores) as [Stance, number][]).sort((a, b) => b[1] - a[1]);
    const splitA = sorted[0]![0] as Stance;
    const splitB = sorted[1]![0] as Stance;

    const lean = d3StanceLean(centerRank.primary, splitA, splitB);

    if (lean !== null) {
      // Case A: D3 resolves — use D3-leaning stance, Moderate confidence
      primaryStance = lean;
      stanceConfidence = 'moderate';
      confirmationReason = 'd3_resolved_case_a';
    } else {
      // Case B: D3 symmetric — check for active confirmation pair across split stances
      const candidateA = TYPE_MATRIX[splitA][centerRank.primary];
      const candidateB = TYPE_MATRIX[splitB][centerRank.primary];
      const crossPair = makePairKey(candidateA, candidateB);

      if (crossPair === null) {
        // No pair for cross-stance candidates → two-candidate Low display
        twoCandidate = true;
        stanceConfidence = 'low';
        confirmationReason = 'two_candidate_no_pair_case_b';
      } else {
        // Pair exists for cross-stance (should be rare; cross-stance pairs retired)
        stanceConfidence = 'moderate';
        confirmationReason = 'cross_stance_pair_case_b';
      }
    }
  } else if (stage1SplitType === '2-1-1') {
    // Case C: all stances close — Low confidence, D3 as soft lean only
    const lean = d3StanceLean(centerRank.primary, stanceRank.primary, stanceRank.secondary);
    if (lean !== null) {
      primaryStance = lean;
    }
    stanceConfidence = 'low';
    confirmationReason = 'distributed_split_case_c';
  }

  const primaryType = determineType(primaryStance, centerRank.primary);
  const secondaryType = determineSecondaryType(
    primaryStance,
    stanceRank.secondary !== primaryStance ? stanceRank.secondary : stanceRank.primary,
    centerRank.primary,
    centerRank.secondary,
    stanceScores,
    centerScores,
  );

  const overallConfidence = minConfidence(stanceConfidence, centerConfidence);

  const responsePatternFlag = detectFlatResponse(stanceScores, centerScores);

  // Spec 2: check confirmation pair trigger.
  // Pass stanceConfidence (not overall) as the gate: Trigger A fires when the stance is resolved
  // but the center is thin. overall = min(stance, center) would always be 'low' when center is
  // thin, which would permanently block Trigger A — not the intent.
  const secondaryTypeStance: Stance =
    TYPE_MATRIX[stanceRank.secondary][centerRank.primary] === secondaryType
      ? stanceRank.secondary
      : primaryStance;
  const confirmation = shouldTriggerConfirmation(
    primaryType,
    secondaryType,
    primaryStance,
    secondaryTypeStance,
    centerConfidence,
    stanceConfidence,
  );

  // Pre-confirmation defaults
  const { finalType, finalSecondary, finalConfidence } = resolveFinalType(
    primaryType,
    secondaryType,
    overallConfidence,
    null,
  );

  // Synthesis variant (Requirement A + B)
  const synthesisVariant = getSynthesisVariant(
    finalConfidence,
    confirmation.triggered,
    twoCandidate,
  );

  // Telemetry: which stances were in the split (null for clean reads)
  let stage1SplitStances: Stance[] | null = null;
  if (stage1SplitType !== 'clean') {
    const sorted = (Object.entries(stanceScores) as [Stance, number][]).sort((a, b) => b[1] - a[1]);
    if (stage1SplitType === '2-2-0') {
      stage1SplitStances = [sorted[0]![0] as Stance, sorted[1]![0] as Stance];
    } else {
      // 2-1-1: all three stances are in the split
      stage1SplitStances = sorted.map(([s]) => s as Stance);
    }
  }

  return {
    assessment_version: ASSESSMENT_VERSION,
    responses,
    stance_scores: stanceScores,
    center_scores: centerScores,
    primary_stance: primaryStance,
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
    stage1_split_type: stage1SplitType,
    stage1_split_stances: stage1SplitStances,
    two_candidate: twoCandidate,
    synthesis_variant: synthesisVariant,
    confirmation_triggered: confirmation.triggered,
    confirmation_pair: confirmation.pair,
    confirmation_reason: confirmation.triggered ? confirmation.reason : confirmationReason,
    confirmation_result: null,
    confirmation_user_pick: null,
    final_type: finalType,
    final_secondary: finalSecondary,
    final_confidence: finalConfidence,
    response_pattern_flag: responsePatternFlag,
    randomization_seed: 0,
    item_order: [],
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Builds a sorted pair key and checks membership in CONFUSABLE_PAIRS (active 4 only). */
function makePairKey(a: EnneagramType, b: EnneagramType): ConfusablePair | null {
  const sorted = a < b ? `${a}|${b}` : `${b}|${a}`;
  return CONFUSABLE_PAIRS.has(sorted as ConfusablePair) ? (sorted as ConfusablePair) : null;
}
