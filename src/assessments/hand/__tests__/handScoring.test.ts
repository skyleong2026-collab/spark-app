import { describe, it, expect } from 'vitest';
import type { Phase, Phase1Response, Phase2Response, ConfidenceLevel } from '../lib/handTypes';
import { PHASE1_PAIRS } from '../lib/handPairs';
import {
  computeDrainScores,
  identifyDrainPhases,
  shouldTriggerEarlyLock,
  filterRemainingPairs,
  identifyEnergyPhases,
  classifyDrainConfidence,
  classifyEnergyConfidence,
  minConfidence,
  selectPhase2Candidates,
  scoreHandAssessment,
} from '../lib/handScoring';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build Phase 1 responses by specifying which phase was picked as "drains more" per pair. */
function buildPhase1Responses(
  picks: Record<string, Phase>,
): Phase1Response[] {
  return Object.entries(picks).map(([pairKey, selectedPhase]) => ({
    pairKey,
    selectedPhase,
  }));
}

/**
 * Build a full set of 10 Phase 1 responses where each pair's "drains more"
 * selection is determined by a pick function. The pick function receives
 * phaseA and phaseB and returns the selected (draining) phase.
 */
function buildFullPhase1(pickFn: (a: Phase, b: Phase) => Phase): Phase1Response[] {
  return PHASE1_PAIRS.map(p => ({
    pairKey: p.pairKey,
    selectedPhase: pickFn(p.phaseA, p.phaseB),
  }));
}

function buildPhase2Responses(picks: Record<string, Phase>): Phase2Response[] {
  return Object.entries(picks).map(([pairKey, selectedPhase]) => ({
    pairKey,
    selectedPhase,
  }));
}

// ── computeDrainScores ──────────────────────────────────────────────────────

describe('computeDrainScores', () => {
  it('tallies correctly from responses', () => {
    const responses = buildPhase1Responses({
      p1_sensing_generating: 'generating',
      p1_generating_evaluating: 'generating',
      p1_generating_mobilizing: 'generating',
      p1_generating_completing: 'generating',
    });
    const scores = computeDrainScores(responses);
    expect(scores.generating).toBe(4);
    expect(scores.sensing).toBe(0);
  });
});

// ── identifyDrainPhases ─────────────────────────────────────────────────────

describe('identifyDrainPhases', () => {
  it('clear single-drain: generating selected in all 4 of its pairs', () => {
    // generating appears in pairs: s/g, g/e, g/m, g/c — pick generating every time
    const responses = buildFullPhase1((a, b) =>
      a === 'generating' || b === 'generating'
        ? 'generating'
        : a  // other pairs: pick phaseA (arbitrary, low scores)
    );
    const scores = computeDrainScores(responses);
    const { drainPhases, reason } = identifyDrainPhases(scores, responses);

    expect(scores.generating).toBe(4);
    expect(drainPhases).toContain('generating');
    expect(drainPhases.length).toBeLessThanOrEqual(2);
    expect(reason).toBe('clear');
  });

  it('two-drain pattern: generating and completing both hit 3+', () => {
    // generating pairs: s/g, g/e, g/m, g/c — pick generating in 3 of 4
    // completing pairs: s/c, g/c, e/c, m/c — pick completing in 3 of 4
    const responses = buildFullPhase1((a, b) => {
      // generating wins 3: s/g, g/e, g/m (not g/c — completing wins that one)
      if (a === 'generating' && b !== 'completing') return 'generating';
      if (b === 'generating' && a !== 'completing') return 'generating';
      // completing wins 3: s/c, e/c, m/c (not g/c — already counted above)
      if (a === 'completing' || b === 'completing') return 'completing';
      // remaining: s/e, s/m, e/m — spread around
      return a;
    });
    const scores = computeDrainScores(responses);
    const { drainPhases, reason } = identifyDrainPhases(scores, responses);

    expect(scores.generating).toBeGreaterThanOrEqual(3);
    expect(scores.completing).toBeGreaterThanOrEqual(3);
    expect(drainPhases).toEqual(expect.arrayContaining(['generating', 'completing']));
    expect(drainPhases.length).toBe(2);
    expect(reason).toBe('clear');
  });

  it('no clear drain: all scores 1-2', () => {
    const balancedResponses = buildPhase1Responses({
      p1_sensing_generating: 'sensing',
      p1_sensing_evaluating: 'evaluating',
      p1_sensing_mobilizing: 'sensing',
      p1_sensing_completing: 'completing',
      p1_generating_evaluating: 'generating',
      p1_generating_mobilizing: 'mobilizing',
      p1_generating_completing: 'generating',
      p1_evaluating_mobilizing: 'evaluating',
      p1_evaluating_completing: 'completing',
      p1_mobilizing_completing: 'mobilizing',
    });
    const balancedScores = computeDrainScores(balancedResponses);
    const result = identifyDrainPhases(balancedScores, balancedResponses);

    // Each phase should have score ~2
    for (const p of ['sensing', 'generating', 'evaluating', 'mobilizing', 'completing'] as Phase[]) {
      expect(balancedScores[p]).toBeLessThanOrEqual(2);
    }
    expect(result.drainPhases).toEqual([]);
    expect(result.reason).toBe('none');
  });

  it('three-way drain tie: cap at top 2 with pairwise tiebreaker', () => {
    // sensing=3, generating=3, evaluating=3, mobilizing=1, completing=0
    const fixedResponses = buildPhase1Responses({
      p1_sensing_generating: 'sensing',
      p1_sensing_evaluating: 'evaluating',
      p1_sensing_mobilizing: 'sensing',
      p1_sensing_completing: 'sensing',
      p1_generating_evaluating: 'generating',
      p1_generating_mobilizing: 'generating',
      p1_generating_completing: 'generating',
      p1_evaluating_mobilizing: 'evaluating',
      p1_evaluating_completing: 'evaluating',
      p1_mobilizing_completing: 'mobilizing',
    });
    const fixedScores = computeDrainScores(fixedResponses);

    expect(fixedScores.sensing).toBe(3);
    expect(fixedScores.generating).toBe(3);
    expect(fixedScores.evaluating).toBe(3);

    const { drainPhases, reason } = identifyDrainPhases(fixedScores, fixedResponses);
    expect(drainPhases.length).toBe(2);
    expect(reason).toBe('capped');
    // All three are tied at 3 — pairwise tiebreaker determines which 2
    // Pairwise within {s,g,e}: s beat g (s/g→sensing), g beat e (g/e→generating), e beat s (s/e→evaluating)
    // Pairwise drain counts: s=1, g=1, e=1 → still tied → deterministic by array sort
  });
});

// ── shouldTriggerEarlyLock ──────────────────────────────────────────────────

describe('shouldTriggerEarlyLock', () => {
  it('lock fires at exactly pair 6 when generating hits 4', () => {
    const reorderedResponses: Phase1Response[] = [
      { pairKey: 'p1_sensing_generating', selectedPhase: 'generating' },
      { pairKey: 'p1_generating_evaluating', selectedPhase: 'generating' },
      { pairKey: 'p1_generating_mobilizing', selectedPhase: 'generating' },
      { pairKey: 'p1_sensing_evaluating', selectedPhase: 'sensing' },
      { pairKey: 'p1_sensing_mobilizing', selectedPhase: 'sensing' },
      { pairKey: 'p1_generating_completing', selectedPhase: 'generating' },
    ];
    const reorderedScores = computeDrainScores(reorderedResponses);
    expect(reorderedScores.generating).toBe(4);

    const locked = shouldTriggerEarlyLock(reorderedScores, 6, reorderedResponses);
    expect(locked).toBe('generating');
  });

  it('lock blocked before pair 6 even if threshold reached', () => {
    const responses: Phase1Response[] = [
      { pairKey: 'p1_sensing_generating', selectedPhase: 'generating' },
      { pairKey: 'p1_generating_evaluating', selectedPhase: 'generating' },
      { pairKey: 'p1_generating_mobilizing', selectedPhase: 'generating' },
      { pairKey: 'p1_generating_completing', selectedPhase: 'generating' },
      { pairKey: 'p1_sensing_evaluating', selectedPhase: 'sensing' },
    ];
    const scores = computeDrainScores(responses);
    expect(scores.generating).toBe(4);

    const locked = shouldTriggerEarlyLock(scores, 5, responses);
    expect(locked).toBeNull();
  });

  it('multiple phases cross threshold simultaneously — picks highest score, not declaration order', () => {
    // Two phases can't both reach 4 (they share a pair), but completing=4 and sensing=3
    // tests that completing (later in PHASES) is picked over sensing (earlier in PHASES)
    // when completing has the higher score.
    const fixedResponses: Phase1Response[] = [
      // completing gets 4 from its 4 pairs
      { pairKey: 'p1_sensing_completing', selectedPhase: 'completing' },
      { pairKey: 'p1_generating_completing', selectedPhase: 'completing' },
      { pairKey: 'p1_evaluating_completing', selectedPhase: 'completing' },
      { pairKey: 'p1_mobilizing_completing', selectedPhase: 'completing' },
      // sensing gets 3 (not at threshold, but let's verify completing is picked)
      { pairKey: 'p1_sensing_generating', selectedPhase: 'sensing' },
      { pairKey: 'p1_sensing_evaluating', selectedPhase: 'sensing' },
      { pairKey: 'p1_sensing_mobilizing', selectedPhase: 'sensing' },
    ];
    const fixedScores = computeDrainScores(fixedResponses);
    expect(fixedScores.completing).toBe(4);
    expect(fixedScores.sensing).toBe(3);

    // completing is later in PHASES array but has higher score → should be picked
    const locked = shouldTriggerEarlyLock(fixedScores, 7, fixedResponses);
    expect(locked).toBe('completing');
  });
});

// ── filterRemainingPairs ────────────────────────────────────────────────────

describe('filterRemainingPairs', () => {
  it('removes pairs involving locked phases', () => {
    const remaining = PHASE1_PAIRS.slice(5); // pairs 6-10
    const filtered = filterRemainingPairs(remaining, ['generating']);

    for (const p of filtered) {
      expect(p.phaseA).not.toBe('generating');
      expect(p.phaseB).not.toBe('generating');
    }
    // generating appears in pairs 6 (g/m) and 7 (g/c), so 2 should be removed
    expect(filtered.length).toBe(remaining.length - 2);
  });
});

// ── selectPhase2Candidates ──────────────────────────────────────────────────

describe('selectPhase2Candidates', () => {
  it('always returns exactly 3 phases', () => {
    // Test with various drain score distributions
    const testCases: Record<Phase, number>[] = [
      // 0 drains — all scores low
      { sensing: 1, generating: 1, evaluating: 2, mobilizing: 2, completing: 2 },
      // 1 drain — one phase clearly high
      { sensing: 0, generating: 4, evaluating: 1, mobilizing: 2, completing: 1 },
      // 2 drains — two phases high
      { sensing: 0, generating: 4, evaluating: 0, mobilizing: 3, completing: 1 },
      // 3 drains — three phases ≥3
      { sensing: 3, generating: 3, evaluating: 3, mobilizing: 0, completing: 0 },
      // 4 drains — four phases ≥3
      { sensing: 3, generating: 3, evaluating: 3, mobilizing: 3, completing: 0 },
      // 5 drains — all phases ≥3 (extreme edge case)
      { sensing: 3, generating: 3, evaluating: 3, mobilizing: 3, completing: 3 },
    ];

    for (const scores of testCases) {
      // Build minimal responses for tiebreaker (just enough to have pairKeys)
      const responses: Phase1Response[] = [];
      const candidates = selectPhase2Candidates(scores, responses);
      expect(candidates.length).toBe(3);

      // Verify the 3 returned have the lowest drain scores
      const returned = new Set(candidates);
      const excluded = (['sensing', 'generating', 'evaluating', 'mobilizing', 'completing'] as Phase[])
        .filter(p => !returned.has(p));

      for (const inc of candidates) {
        for (const exc of excluded) {
          expect(scores[inc]).toBeLessThanOrEqual(scores[exc]);
        }
      }
    }
  });

  it('tiebreaks at cut point using pairwise drain', () => {
    // sensing=0, generating=0, evaluating=2, mobilizing=2, completing=4
    // Cut is between position 2 (score=2) and position 3 (score=2) — tie
    // evaluating and mobilizing are tied. Need pairwise tiebreak.
    // In e/m pair, if mobilizing was picked as draining → mobilizing has higher pairwise drain → excluded
    const scores: Record<Phase, number> = { sensing: 0, generating: 0, evaluating: 2, mobilizing: 2, completing: 4 };
    const responses: Phase1Response[] = [
      { pairKey: 'p1_evaluating_mobilizing', selectedPhase: 'mobilizing' },
    ];
    const candidates = selectPhase2Candidates(scores, responses);
    expect(candidates).toContain('sensing');
    expect(candidates).toContain('generating');
    expect(candidates).toContain('evaluating'); // evaluating wins tiebreak (less drain in h2h)
    expect(candidates).not.toContain('mobilizing');
  });
});

// ── Energy identification ───────────────────────────────────────────────────

describe('identifyEnergyPhases', () => {
  it('clean energy identification: top 2 → energy, bottom → neutral', () => {
    const energyScores: Record<Phase, number> = {
      sensing: 2, generating: 1, evaluating: 0, mobilizing: 0, completing: 0,
    };
    const phase2Responses = buildPhase2Responses({
      p2_sensing_generating: 'sensing',
      p2_sensing_evaluating: 'sensing',
      p2_generating_evaluating: 'generating',
    });
    const { energyPhases, neutralPhases } = identifyEnergyPhases(
      energyScores, ['mobilizing', 'completing'], phase2Responses,
    );
    expect(energyPhases).toEqual(['sensing', 'generating']);
    expect(neutralPhases).toEqual(['evaluating']);
  });

  it('Phase 2 tie: tiebreak uses direct pairwise comparison (non-cyclic)', () => {
    // sensing=2, generating=1, evaluating=0 → clear ordering
    // Tiebreak not needed here, but verifying pairwise is consulted on a (1,1) tie:
    const energyScores: Record<Phase, number> = {
      sensing: 1, generating: 1, evaluating: 0, mobilizing: 0, completing: 0,
    };
    const phase2Responses = buildPhase2Responses({
      p2_sensing_generating: 'generating',   // generating beat sensing in h2h
      p2_sensing_evaluating: 'sensing',
      p2_generating_evaluating: 'generating',
    });
    const { energyPhases, neutralPhases } = identifyEnergyPhases(
      energyScores, ['mobilizing', 'completing'], phase2Responses,
    );
    // sensing=1, generating=1 → tied. h2h: generating beat sensing → generating ranks higher
    expect(energyPhases).toEqual(['generating', 'sensing']);
    expect(neutralPhases).toEqual(['evaluating']);
  });
});

// ── Confidence ──────────────────────────────────────────────────────────────

describe('classifyDrainConfidence', () => {
  it('high: top ≥ 3 and second ≤ 1', () => {
    expect(classifyDrainConfidence({ sensing: 4, generating: 1, evaluating: 0, mobilizing: 0, completing: 0 })).toBe('high');
  });

  it('high: two phases both ≥ 3', () => {
    expect(classifyDrainConfidence({ sensing: 4, generating: 3, evaluating: 1, mobilizing: 0, completing: 0 })).toBe('high');
  });

  it('moderate: top ≥ 3 and second = 2', () => {
    expect(classifyDrainConfidence({ sensing: 3, generating: 2, evaluating: 2, mobilizing: 1, completing: 0 })).toBe('moderate');
  });

  it('low: no phase ≥ 3', () => {
    expect(classifyDrainConfidence({ sensing: 2, generating: 2, evaluating: 2, mobilizing: 2, completing: 2 })).toBe('low');
  });
});

describe('classifyEnergyConfidence', () => {
  /**
   * Energy confidence is binary high/low by design.
   *
   * With exactly 3 Phase 2 candidates and 3 pairwise comparisons, the total
   * selections sum to 3. Only two score distributions are possible:
   *   (2, 1, 0) — one clear winner → 'high'
   *   (1, 1, 1) — cycle, no clear winner → 'low'
   *
   * 'moderate' is unreachable because no distribution exists where the top
   * score is 1 and there's a unique winner (a top of 1 with two others at
   * 1 is a three-way tie, and a top of 1 with one at 0 requires only 2
   * total selections, but we always have 3).
   */
  it('high: (2,1,0) distribution', () => {
    const scores: Record<Phase, number> = { sensing: 2, generating: 1, evaluating: 0, mobilizing: 0, completing: 0 };
    expect(classifyEnergyConfidence(scores, ['sensing', 'generating', 'evaluating'])).toBe('high');
  });

  it('low: (1,1,1) cycle', () => {
    const scores: Record<Phase, number> = { sensing: 1, generating: 1, evaluating: 1, mobilizing: 0, completing: 0 };
    expect(classifyEnergyConfidence(scores, ['sensing', 'generating', 'evaluating'])).toBe('low');
  });
});

describe('minConfidence', () => {
  it('returns the lower of two levels', () => {
    expect(minConfidence('high', 'high')).toBe('high');
    expect(minConfidence('high', 'moderate')).toBe('moderate');
    expect(minConfidence('high', 'low')).toBe('low');
    expect(minConfidence('moderate', 'low')).toBe('low');
    expect(minConfidence('low', 'low')).toBe('low');
  });
});

describe('confidence combinations (drain × energy → overall)', () => {
  it.each([
    ['high', 'high', 'high'],
    ['high', 'low', 'low'],
    ['moderate', 'high', 'moderate'],
    ['moderate', 'low', 'low'],
    ['low', 'high', 'low'],
    ['low', 'low', 'low'],
  ] as [ConfidenceLevel, ConfidenceLevel, ConfidenceLevel][])('drain=%s × energy=%s → overall=%s', (drain, energy, expected) => {
    expect(minConfidence(drain, energy)).toBe(expected);
  });
});

// ── End-to-end: scoreHandAssessment ─────────────────────────────────────────

describe('scoreHandAssessment', () => {
  it('full flow: 10 Phase 1 + 3 Phase 2 pairs', () => {
    // generating and completing are drains (score 3+ each)
    const phase1 = buildFullPhase1((a, b) => {
      if (a === 'generating' || b === 'generating') {
        if (a === 'completing' || b === 'completing') return 'generating'; // g/c → generating
        return 'generating';
      }
      if (a === 'completing' || b === 'completing') return 'completing';
      return a;
    });

    // Phase 2: sensing, evaluating, mobilizing
    const phase2 = buildPhase2Responses({
      p2_sensing_evaluating: 'sensing',
      p2_sensing_mobilizing: 'sensing',
      p2_evaluating_mobilizing: 'evaluating',
    });

    const result = scoreHandAssessment({
      sessionId: 'test-session',
      phase1Responses: phase1,
      phase2Responses: phase2,
      phase1CompletedPairs: 10,
      earlyLockTriggered: false,
      lockedPhases: [],
      randomizationSeed: 42,
      pairOrder: PHASE1_PAIRS.map(p => p.pairKey),
    });

    expect(result.drain_phases).toEqual(expect.arrayContaining(['generating', 'completing']));
    expect(result.energy_phases).toEqual(['sensing', 'evaluating']);
    expect(result.neutral_phases).toEqual(['mobilizing']);
    expect(result.assessment_version).toBe('hand_v2_five_phase');
  });

  it('early lock flow: 7 Phase 1 + 3 Phase 2 = 10 total', () => {
    // Simulate: generating locks after pair 6, remaining pairs filtered
    const phase1: Phase1Response[] = [
      { pairKey: 'p1_sensing_generating', selectedPhase: 'generating' },
      { pairKey: 'p1_generating_evaluating', selectedPhase: 'generating' },
      { pairKey: 'p1_generating_mobilizing', selectedPhase: 'generating' },
      { pairKey: 'p1_sensing_evaluating', selectedPhase: 'sensing' },
      { pairKey: 'p1_sensing_mobilizing', selectedPhase: 'mobilizing' },
      { pairKey: 'p1_generating_completing', selectedPhase: 'generating' }, // lock fires here
      // After lock, generating pairs filtered. Remaining: s/c, e/m, e/c, m/c
      { pairKey: 'p1_sensing_completing', selectedPhase: 'completing' },
    ];

    const phase2 = buildPhase2Responses({
      p2_sensing_evaluating: 'sensing',
      p2_sensing_mobilizing: 'sensing',
      p2_evaluating_mobilizing: 'evaluating',
    });

    const result = scoreHandAssessment({
      sessionId: 'test-lock',
      phase1Responses: phase1,
      phase2Responses: phase2,
      phase1CompletedPairs: 7,
      earlyLockTriggered: true,
      lockedPhases: ['generating'],
      randomizationSeed: 99,
      pairOrder: phase1.map(r => r.pairKey),
    });

    expect(result.early_lock_triggered).toBe(true);
    expect(result.locked_phases).toEqual(['generating']);
    expect(result.drain_scores.generating).toBe(4);
    expect(result.energy_phases.length).toBe(2);
    expect(result.phase1_completed_pairs).toBe(7);
  });
});
