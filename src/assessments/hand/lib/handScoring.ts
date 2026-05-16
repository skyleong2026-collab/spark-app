import type {
  Phase,
  Phase1Response,
  Phase2Response,
  HandPair,
  ConfidenceLevel,
  HandScoringResult,
} from './handTypes';

import {
  PHASES,
  DRAIN_LOCK_THRESHOLD,
  DRAIN_CONFIRMED_THRESHOLD,
  MINIMUM_PAIRS_BEFORE_LOCK,
  ASSESSMENT_VERSION,
} from './handConstants';

// ── Helpers ─────────────────────────────────────────────────────────────────

function emptyPhaseScores(): Record<Phase, number> {
  return { sensing: 0, generating: 0, evaluating: 0, mobilizing: 0, completing: 0 };
}

/**
 * Pairwise tiebreaker: among `tiedPhases`, count how many times each was
 * selected as "drains more" in head-to-head matchups involving only the
 * tied group. Returns the phases sorted by descending pairwise drain count
 * (highest drain first).
 */
function sortByPairwiseDrain(
  tiedPhases: Phase[],
  phase1Responses: Phase1Response[],
): Phase[] {
  const pairwiseDrain = emptyPhaseScores();
  const tiedSet = new Set(tiedPhases);

  for (const r of phase1Responses) {
    // Only count matchups between two phases that are both in the tied group.
    // TODO: accept HandPair[] argument instead of parsing pairKey.
    // Parsing works only because phase names are single tokens.
    const parts = r.pairKey.split('_');
    const phaseA = parts[1] as Phase;
    const phaseB = parts.slice(2).join('_') as Phase;

    if (tiedSet.has(phaseA) && tiedSet.has(phaseB)) {
      pairwiseDrain[r.selectedPhase] += 1;
    }
  }

  return [...tiedPhases].sort((a, b) => pairwiseDrain[b] - pairwiseDrain[a]);
}

// ── Phase 1: Drain scoring ──────────────────────────────────────────────────

/**
 * Tallies how many times each phase was selected as "drains more" in Phase 1.
 */
export function computeDrainScores(
  phase1Responses: Phase1Response[],
): Record<Phase, number> {
  const scores = emptyPhaseScores();
  for (const r of phase1Responses) {
    scores[r.selectedPhase] += 1;
  }
  return scores;
}

/**
 * Identifies drain phases from drain scores.
 * Rules:
 *   - Phase with score ≥ DRAIN_CONFIRMED_THRESHOLD (3) qualifies as drain
 *   - Cap at top 2 drain phases
 *   - If 3+ phases qualify, tiebreak by pairwise head-to-head; top 2 become drain
 *
 * Returns reason:
 *   'clear' — 1–2 phases cleanly qualified
 *   'capped' — 3+ phases qualified, had to cap at 2
 *   'none' — no phase reached threshold
 */
export function identifyDrainPhases(
  drainScores: Record<Phase, number>,
  phase1Responses: Phase1Response[],
): { drainPhases: Phase[]; reason: 'clear' | 'capped' | 'none' } {
  const qualifying = PHASES.filter(p => drainScores[p] >= DRAIN_CONFIRMED_THRESHOLD);

  if (qualifying.length === 0) {
    return { drainPhases: [], reason: 'none' };
  }

  if (qualifying.length <= 2) {
    // Sort by score descending for consistent ordering
    const sorted = [...qualifying].sort((a, b) => drainScores[b] - drainScores[a]);
    return { drainPhases: sorted, reason: 'clear' };
  }

  // 3+ phases qualify — cap at top 2 using pairwise tiebreaker
  const sorted = [...qualifying].sort((a, b) => {
    const diff = drainScores[b] - drainScores[a];
    if (diff !== 0) return diff;
    return 0; // ties resolved below
  });

  // Group by score to find where ties exist
  const topScore = drainScores[sorted[0]!];
  const atTop = sorted.filter(p => drainScores[p] === topScore);

  if (atTop.length >= 2) {
    // Tie at the top — use pairwise tiebreaker among all at top score
    const tiebroken = sortByPairwiseDrain(atTop, phase1Responses);
    return { drainPhases: tiebroken.slice(0, 2), reason: 'capped' };
  }

  // Top is clear; tie is at second place
  const secondScore = drainScores[sorted[1]!];
  const atSecond = sorted.filter(p => drainScores[p] === secondScore);

  if (atSecond.length > 1) {
    const tiebroken = sortByPairwiseDrain(atSecond, phase1Responses);
    return { drainPhases: [sorted[0]!, tiebroken[0]!], reason: 'capped' };
  }

  return { drainPhases: sorted.slice(0, 2), reason: 'capped' };
}

/**
 * Checks if any phase should be locked (removed from remaining Phase 1 pairs).
 * A phase locks when:
 *   - Its drain score ≥ DRAIN_LOCK_THRESHOLD (4)
 *   - AND pairsAnswered ≥ MINIMUM_PAIRS_BEFORE_LOCK (6)
 *
 * If multiple phases cross threshold on the same pair, returns the one with
 * the highest drain score; ties broken by pairwise tiebreaker (highest drain first).
 */
export function shouldTriggerEarlyLock(
  drainScores: Record<Phase, number>,
  pairsAnswered: number,
  phase1Responses: Phase1Response[],
): Phase | null {
  if (pairsAnswered < MINIMUM_PAIRS_BEFORE_LOCK) return null;

  const atThreshold = PHASES.filter(p => drainScores[p] >= DRAIN_LOCK_THRESHOLD);

  if (atThreshold.length === 0) return null;
  if (atThreshold.length === 1) return atThreshold[0]!;

  // Multiple phases crossed threshold — pick highest drain score, tiebreak by pairwise
  const sorted = [...atThreshold].sort((a, b) => drainScores[b] - drainScores[a]);
  const topScore = drainScores[sorted[0]!];
  const atTop = sorted.filter(p => drainScores[p] === topScore);

  if (atTop.length === 1) return atTop[0]!;
  return sortByPairwiseDrain(atTop, phase1Responses)[0]!;
}

/** Removes pairs involving any locked phase from the queue. */
export function filterRemainingPairs(
  remainingPairs: HandPair[],
  lockedPhases: Phase[],
): HandPair[] {
  const locked = new Set(lockedPhases);
  return remainingPairs.filter(p => !locked.has(p.phaseA) && !locked.has(p.phaseB));
}

// ── Phase 2 candidate selection ─────────────────────────────────────────────

/**
 * INVARIANT: Phase 2 always receives exactly 3 candidate phases.
 *
 * candidates_for_phase2 = the 3 phases with the LOWEST drain scores.
 * This is independent of drain_phases determination (which caps at top 2).
 * Ties at the cut point are broken by the same pairwise tiebreaker used
 * in identifyDrainPhases — the phase selected as "drains more" more often
 * in head-to-head matchups ranks higher in drain (and thus loses its
 * candidacy for Phase 2).
 */
export function selectPhase2Candidates(
  drainScores: Record<Phase, number>,
  phase1Responses: Phase1Response[],
): Phase[] {
  // Sort ascending by drain score (lowest drain = best candidate)
  const sorted = [...PHASES].sort((a, b) => drainScores[a] - drainScores[b]);

  // Check for tie at the cut point (position 2 vs position 3)
  const cutScore = drainScores[sorted[2]!];
  const excludeScore = drainScores[sorted[3]!];

  if (cutScore !== excludeScore) {
    // Clean cut — no tie at the boundary
    return sorted.slice(0, 3);
  }

  // Tie at the cut point — split into "clearly in" and "tied at boundary"
  const clearlyIn = sorted.filter(p => drainScores[p] < cutScore);
  const tied = sorted.filter(p => drainScores[p] === cutScore);
  const slotsNeeded = 3 - clearlyIn.length;

  // Tiebreak: sort tied phases by pairwise drain descending, then take
  // the LAST slotsNeeded (lowest pairwise drain = best phase2 candidate)
  const tiebroken = sortByPairwiseDrain(tied, phase1Responses);
  const winners = tiebroken.slice(tiebroken.length - slotsNeeded);

  return [...clearlyIn, ...winners];
}

// ── Phase 2: Energy scoring ─────────────────────────────────────────────────

/**
 * Tallies how many times each phase was selected as "produces more energy" in Phase 2.
 */
export function computeEnergyScores(
  phase2Responses: Phase2Response[],
): Record<Phase, number> {
  const scores = emptyPhaseScores();
  for (const r of phase2Responses) {
    scores[r.selectedPhase] += 1;
  }
  return scores;
}

/**
 * Identifies energy and neutral phases from Phase 2 scores.
 * Top 2 by energy score → energy; remaining non-drain → neutral.
 * Ties at the cut point are broken by the direct Phase 2 pairwise comparison.
 */
export function identifyEnergyPhases(
  energyScores: Record<Phase, number>,
  drainPhases: Phase[],
  phase2Responses: Phase2Response[],
): { energyPhases: Phase[]; neutralPhases: Phase[] } {
  const drainSet = new Set(drainPhases);
  const candidates = PHASES.filter(p => !drainSet.has(p));

  // Sort descending by energy score
  const sorted = [...candidates].sort((a, b) => {
    const diff = energyScores[b] - energyScores[a];
    if (diff !== 0) return diff;

    // Tiebreak by direct Phase 2 pairwise: did one beat the other?
    // TODO: accept HandPair[] argument instead of parsing pairKey.
    // Parsing works only because phase names are single tokens.
    for (const r of phase2Responses) {
      const parts = r.pairKey.split('_');
      const phaseA = parts[1] as Phase;
      const phaseB = parts.slice(2).join('_') as Phase;

      if ((phaseA === a && phaseB === b) || (phaseA === b && phaseB === a)) {
        // The phase that was selected as "more energy" wins
        return r.selectedPhase === a ? -1 : 1;
      }
    }
    return 0;
  });

  const energyPhases = sorted.slice(0, 2);
  const neutralPhases = sorted.slice(2);

  return { energyPhases, neutralPhases };
}

// ── Confidence ──────────────────────────────────────────────────────────────

/**
 * Drain confidence:
 *   - no phase ≥ 3 → 'low'
 *   - top ≥ 3 AND second ≥ 3 → 'high' (two strong drains = strong signal)
 *   - top ≥ 3 AND second ≤ 1 → 'high'
 *   - top ≥ 3 AND second = 2 → 'moderate'
 */
export function classifyDrainConfidence(
  drainScores: Record<Phase, number>,
): ConfidenceLevel {
  const sorted = [...PHASES].map(p => drainScores[p]).sort((a, b) => b - a);
  const top = sorted[0]!;
  const second = sorted[1]!;

  if (top < DRAIN_CONFIRMED_THRESHOLD) return 'low';
  if (second >= DRAIN_CONFIRMED_THRESHOLD) return 'high';
  if (second <= 1) return 'high';
  return 'moderate'; // second = 2
}

/**
 * Energy confidence (Phase 2 has exactly 3 phases and 3 pairs):
 *   - Possible score distributions: (2,1,0) or (1,1,1)
 *   - (2,1,0): clear winner → 'high'
 *   - (1,1,1): cycle, no clear winner → 'low'
 */
export function classifyEnergyConfidence(
  energyScores: Record<Phase, number>,
  phase2Candidates: Phase[],
): ConfidenceLevel {
  const candidateScores = phase2Candidates
    .map(p => energyScores[p])
    .sort((a, b) => b - a);

  const top = candidateScores[0] ?? 0;

  if (top >= 2) return 'high';
  return 'low';
}

/** Ordered minimum: low < moderate < high. */
export function minConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const order: Record<ConfidenceLevel, number> = { low: 0, moderate: 1, high: 2 };
  return order[a] <= order[b] ? a : b;
}

// ── Top-level composer ──────────────────────────────────────────────────────

export interface ScoreHandInput {
  sessionId: string;
  phase1Responses: Phase1Response[];
  phase2Responses: Phase2Response[];
  phase1CompletedPairs: number;
  earlyLockTriggered: boolean;
  lockedPhases: Phase[];
  randomizationSeed: number;
  pairOrder: string[];
}

export function scoreHandAssessment(input: ScoreHandInput): HandScoringResult {
  const drainScores = computeDrainScores(input.phase1Responses);
  const { drainPhases } = identifyDrainPhases(drainScores, input.phase1Responses);

  const phase2Candidates = selectPhase2Candidates(drainScores, input.phase1Responses);
  const energyScores = computeEnergyScores(input.phase2Responses);
  const { energyPhases, neutralPhases } = identifyEnergyPhases(
    energyScores,
    drainPhases,
    input.phase2Responses,
  );

  const drainConfidence = classifyDrainConfidence(drainScores);
  const energyConfidence = classifyEnergyConfidence(energyScores, phase2Candidates);
  const overallConfidence = minConfidence(drainConfidence, energyConfidence);

  return {
    assessment_version: ASSESSMENT_VERSION,
    session_id: input.sessionId,
    phase1_responses: input.phase1Responses,
    phase2_responses: input.phase2Responses,
    phase1_completed_pairs: input.phase1CompletedPairs,
    drain_scores: drainScores,
    energy_scores: energyScores,
    energy_phases: energyPhases,
    drain_phases: drainPhases,
    neutral_phases: neutralPhases,
    drain_confidence: drainConfidence,
    energy_confidence: energyConfidence,
    overall_confidence: overallConfidence,
    early_lock_triggered: input.earlyLockTriggered,
    locked_phases: input.lockedPhases,
    randomization_seed: input.randomizationSeed,
    pair_order: input.pairOrder,
  };
}
