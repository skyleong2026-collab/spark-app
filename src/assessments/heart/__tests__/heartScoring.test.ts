import { describe, it, expect } from 'vitest';
import type {
  HeartResponses,
  ItemKey,
  LikertResponse,
  Stance,
  Center,
} from '../lib/heartTypes';
import {
  STANCE_ITEM_KEYS,
  CENTER_ITEM_KEYS,
  TYPE_MATRIX,
} from '../lib/heartConstants';
import {
  computeSubScaleScores,
  rankDimensions,
  determineType,
  determineSecondaryType,
  classifyConfidence,
  minConfidence,
  detectFlatResponse,
  shouldTriggerConfirmation,
  resolveFinalType,
  scoreHeartAssessment,
} from '../lib/heartScoring';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a full HeartResponses object from per-dimension overrides. Default = 2. */
function buildResponses(overrides: Partial<Record<Stance | Center, LikertResponse>>): HeartResponses {
  const responses = {} as Record<string, LikertResponse>;
  const defaultValue: LikertResponse = 2;

  for (const [stance, keys] of Object.entries(STANCE_ITEM_KEYS)) {
    const val = overrides[stance as Stance] ?? defaultValue;
    for (const k of keys) responses[k] = val;
  }
  for (const [center, keys] of Object.entries(CENTER_ITEM_KEYS)) {
    const val = overrides[center as Center] ?? defaultValue;
    for (const k of keys) responses[k] = val;
  }
  return responses as HeartResponses;
}

/** Builds responses where specific item keys get specific values. */
function buildResponsesFromItems(
  defaults: LikertResponse,
  itemOverrides: Partial<Record<ItemKey, LikertResponse>>,
): HeartResponses {
  const responses = {} as Record<string, LikertResponse>;
  for (const keys of Object.values(STANCE_ITEM_KEYS)) {
    for (const k of keys) responses[k] = defaults;
  }
  for (const keys of Object.values(CENTER_ITEM_KEYS)) {
    for (const k of keys) responses[k] = defaults;
  }
  for (const [k, v] of Object.entries(itemOverrides)) {
    responses[k] = v;
  }
  return responses as HeartResponses;
}

// ── computeSubScaleScores ───────────────────────────────────────────────────

describe('computeSubScaleScores', () => {
  it('returns correct range for uniform responses', () => {
    const responses = buildResponses({});  // all 2s
    const { stance, center } = computeSubScaleScores(responses);

    // 4 items × 2 = 8; 8/20 = 0.4
    expect(stance.assertive).toBeCloseTo(0.4);
    expect(stance.dependent).toBeCloseTo(0.4);
    expect(stance.withdrawn).toBeCloseTo(0.4);
    expect(center.body).toBeCloseTo(0.4);
    expect(center.heart).toBeCloseTo(0.4);
    expect(center.head).toBeCloseTo(0.4);
  });

  it('returns 1.0 for max responses on a sub-scale', () => {
    const responses = buildResponses({ assertive: 5 });
    const { stance } = computeSubScaleScores(responses);
    expect(stance.assertive).toBeCloseTo(1.0);  // 4×5=20, 20/20=1.0
    expect(stance.dependent).toBeCloseTo(0.4);
  });

  it('returns 0.2 for min responses on a sub-scale', () => {
    const responses = buildResponses({ withdrawn: 1 });
    const { stance } = computeSubScaleScores(responses);
    expect(stance.withdrawn).toBeCloseTo(0.2);  // 4×1=4, 4/20=0.2
  });
});

// ── rankDimensions ──────────────────────────────────────────────────────────

describe('rankDimensions', () => {
  it('ranks correctly with clear separation', () => {
    const result = rankDimensions({ a: 0.9, b: 0.5, c: 0.3 });
    expect(result.primary).toBe('a');
    expect(result.secondary).toBe('b');
    expect(result.separation).toBeCloseTo(0.4);
  });

  it('ranks correctly when top two are close', () => {
    const result = rankDimensions({ a: 0.5, b: 0.48, c: 0.3 });
    expect(result.primary).toBe('a');
    expect(result.secondary).toBe('b');
    expect(result.separation).toBeCloseTo(0.02);
  });
});

// ── determineType ───────────────────────────────────────────────────────────

describe('determineType', () => {
  it('looks up all 9 types correctly', () => {
    expect(determineType('assertive', 'body')).toBe(8);
    expect(determineType('assertive', 'heart')).toBe(3);
    expect(determineType('assertive', 'head')).toBe(7);
    expect(determineType('dependent', 'body')).toBe(1);
    expect(determineType('dependent', 'heart')).toBe(2);
    expect(determineType('dependent', 'head')).toBe(6);
    expect(determineType('withdrawn', 'body')).toBe(9);
    expect(determineType('withdrawn', 'heart')).toBe(4);
    expect(determineType('withdrawn', 'head')).toBe(5);
  });
});

// ── classifyConfidence ──────────────────────────────────────────────────────

describe('classifyConfidence', () => {
  it('returns high for separation >= 0.25', () => {
    expect(classifyConfidence(0.25)).toBe('high');
    expect(classifyConfidence(0.5)).toBe('high');
  });
  it('returns moderate for separation >= 0.10 and < 0.25', () => {
    expect(classifyConfidence(0.10)).toBe('moderate');
    expect(classifyConfidence(0.24)).toBe('moderate');
  });
  it('returns low for separation < 0.10', () => {
    expect(classifyConfidence(0.09)).toBe('low');
    expect(classifyConfidence(0)).toBe('low');
  });
});

// ── minConfidence ───────────────────────────────────────────────────────────

describe('minConfidence', () => {
  it('returns the lower of two confidence levels', () => {
    expect(minConfidence('high', 'high')).toBe('high');
    expect(minConfidence('high', 'moderate')).toBe('moderate');
    expect(minConfidence('moderate', 'high')).toBe('moderate');
    expect(minConfidence('high', 'low')).toBe('low');
    expect(minConfidence('low', 'moderate')).toBe('low');
    expect(minConfidence('low', 'low')).toBe('low');
  });
});

// ── detectFlatResponse ──────────────────────────────────────────────────────

describe('detectFlatResponse', () => {
  it('returns flat when all items are identical', () => {
    // All 3s → each sub-scale = 12/20 = 0.6, range = 0
    const responses = buildResponses({ assertive: 3, dependent: 3, withdrawn: 3, body: 3, heart: 3, head: 3 });
    const { stance, center } = computeSubScaleScores(responses);
    expect(detectFlatResponse(stance, center)).toBe('flat');
  });

  it('returns normal when there is differentiation', () => {
    const responses = buildResponses({ assertive: 5, body: 5 });
    const { stance, center } = computeSubScaleScores(responses);
    expect(detectFlatResponse(stance, center)).toBe('normal');
  });
});

// ── shouldTriggerConfirmation (pair-gated) ──────────────────────────────────

describe('shouldTriggerConfirmation', () => {
  it('triggers on confusable pair with moderate confidence', () => {
    const result = shouldTriggerConfirmation(1, 6, 'moderate', 'high', 'moderate');
    expect(result.triggered).toBe(true);
    expect(result.pair).toBe('1|6');
    expect(result.reason).toContain('overall confidence is moderate');
    expect(result.reason).toContain('confusable pair match');
  });

  it('triggers on confusable pair match even at high confidence', () => {
    const result = shouldTriggerConfirmation(1, 6, 'high', 'high', 'high');
    expect(result.triggered).toBe(true);
    expect(result.pair).toBe('1|6');
    expect(result.reason).toBe('confusable pair match');
  });

  it('does NOT trigger when rules fire but pair is not confusable', () => {
    // Types 1 and 7 are NOT a confusable pair, but confidence is low
    const result = shouldTriggerConfirmation(1, 7, 'low', 'low', 'low');
    expect(result.triggered).toBe(false);
    expect(result.pair).toBeNull();
    expect(result.reason).toMatch(/^rules_fired_no_pair:/);
    expect(result.reason).toContain('overall confidence is low');
  });

  it('does not trigger when no rules fire', () => {
    // High confidence, non-confusable pair
    const result = shouldTriggerConfirmation(8, 7, 'high', 'high', 'high');
    expect(result.triggered).toBe(false);
    expect(result.reason).toBe('no trigger');
  });

  it('triggers on split confidence when pair is confusable', () => {
    const result = shouldTriggerConfirmation(5, 6, 'high', 'low', 'low');
    expect(result.triggered).toBe(true);
    expect(result.pair).toBe('5|6');
    expect(result.reason).toContain('split confidence');
  });

  it('accumulates multiple fired rules in reason', () => {
    // Low overall + confusable pair + split confidence
    const result = shouldTriggerConfirmation(1, 6, 'high', 'low', 'low');
    expect(result.triggered).toBe(true);
    expect(result.reason).toContain('overall confidence is low');
    expect(result.reason).toContain('confusable pair match');
    expect(result.reason).toContain('split confidence');
  });

  it('orders pair key correctly regardless of argument order', () => {
    const result = shouldTriggerConfirmation(6, 1, 'high', 'high', 'high');
    expect(result.pair).toBe('1|6');
  });

  // v2.1 expanded pairs
  it('triggers on confusable pair 2|6', () => {
    const result = shouldTriggerConfirmation(2, 6, 'high', 'high', 'high');
    expect(result.triggered).toBe(true);
    expect(result.pair).toBe('2|6');
  });

  it('triggers on confusable pair 3|8', () => {
    const result = shouldTriggerConfirmation(3, 8, 'high', 'high', 'high');
    expect(result.triggered).toBe(true);
    expect(result.pair).toBe('3|8');
  });

  it('triggers on confusable pair 7|9', () => {
    const result = shouldTriggerConfirmation(7, 9, 'high', 'high', 'high');
    expect(result.triggered).toBe(true);
    expect(result.pair).toBe('7|9');
  });

  it('triggers on confusable pair 5|9', () => {
    const result = shouldTriggerConfirmation(5, 9, 'high', 'high', 'high');
    expect(result.triggered).toBe(true);
    expect(result.pair).toBe('5|9');
  });
});

// ── resolveFinalType ────────────────────────────────────────────────────────

describe('resolveFinalType', () => {
  it('returns algorithm result when no confirmation', () => {
    const result = resolveFinalType(1, 6, 'moderate', null);
    expect(result.finalType).toBe(1);
    expect(result.finalSecondary).toBe(6);
    expect(result.finalConfidence).toBe('moderate');
  });

  it('agreed → keeps algorithm type, upgrades to high confidence', () => {
    const result = resolveFinalType(1, 6, 'moderate', { result: 'agreed' });
    expect(result.finalType).toBe(1);
    expect(result.finalSecondary).toBe(6);
    expect(result.finalConfidence).toBe('high');
  });

  it('disagreed → uses user pick, demotes algorithm to secondary, low confidence', () => {
    const result = resolveFinalType(1, 6, 'moderate', { result: 'disagreed', userPick: 6 });
    expect(result.finalType).toBe(6);
    expect(result.finalSecondary).toBe(1);
    expect(result.finalConfidence).toBe('low');
  });

  it('uncertain → keeps algorithm type, drops to low confidence', () => {
    const result = resolveFinalType(1, 6, 'moderate', { result: 'uncertain' });
    expect(result.finalType).toBe(1);
    expect(result.finalSecondary).toBe(6);
    expect(result.finalConfidence).toBe('low');
  });
});

// ── scoreHeartAssessment: clean type results ────────────────────────────────

describe('scoreHeartAssessment — clean types', () => {
  it('clean Type 1: dependent + body, high confidence, no confirmation', () => {
    // withdrawn=3 makes it the clear secondary stance → secondary type = withdrawn+body = 9
    // Pair 1|9 is not confusable → no confirmation trigger
    const responses = buildResponsesFromItems(2, {
      S5: 5, S6: 5, S7: 5, S8: 5,    // dependent = 1.0
      C1: 5, C2: 5, C3: 5, C4: 5,    // body = 1.0
      S9: 3, S10: 3, S11: 3, S12: 3,  // withdrawn = 0.6 (clear secondary stance)
    });
    const result = scoreHeartAssessment(responses);

    expect(result.primary_type).toBe(1);
    expect(result.secondary_type).toBe(9);
    expect(result.stance_confidence).toBe('high');
    expect(result.center_confidence).toBe('high');
    expect(result.overall_confidence).toBe('high');
    expect(result.confirmation_triggered).toBe(false);
  });

  it('clean Type 5: withdrawn + head', () => {
    const responses = buildResponses({ withdrawn: 5, head: 5 });
    const result = scoreHeartAssessment(responses);
    expect(result.primary_type).toBe(5);
  });

  // Parameterized: all 9 types with clean inputs
  const stances: Stance[] = ['assertive', 'dependent', 'withdrawn'];
  const centers: Center[] = ['body', 'heart', 'head'];

  for (const stance of stances) {
    for (const center of centers) {
      const expectedType = TYPE_MATRIX[stance][center];
      it(`clean Type ${expectedType}: ${stance} + ${center}`, () => {
        const responses = buildResponses({ [stance]: 5, [center]: 5 });
        const result = scoreHeartAssessment(responses);
        expect(result.primary_type).toBe(expectedType);
        expect(result.primary_stance).toBe(stance);
        expect(result.primary_center).toBe(center);
      });
    }
  }
});

// ── scoreHeartAssessment: confidence and confirmation scenarios ──────────────

describe('scoreHeartAssessment — confidence scenarios', () => {
  it('moderate stance confidence with confusable pair triggers confirmation', () => {
    // Dependent=5 (1.0), assertive slightly behind, withdrawn low → moderate stance separation
    // Body=5 (1.0), others=2 → high center confidence
    // Primary: dependent+body = type 1. Secondary stance = assertive → type 8.
    // 1|8 is confusable → should trigger.
    // Stance: dep=1.0, assertive needs to be ~0.85 for 0.15 sep → moderate
    // 4 items at 5 = 20/20 = 1.0. For 0.85: 17/20 → items at mix of 4s and 5s.
    // Use item-level control: assertive items S1=5,S2=4,S3=4,S4=4 → sum=17, 17/20=0.85
    const responses = buildResponsesFromItems(2, {
      // Dependent all 5s → 1.0
      S5: 5, S6: 5, S7: 5, S8: 5,
      // Assertive slightly behind → 0.85
      S1: 5, S2: 4, S3: 4, S4: 4,
      // Body all 5s → 1.0
      C1: 5, C2: 5, C3: 5, C4: 5,
    });

    const result = scoreHeartAssessment(responses);
    expect(result.primary_stance).toBe('dependent');
    expect(result.stance_confidence).toBe('moderate');  // 0.15 separation
    expect(result.primary_type).toBe(1);
    expect(result.confirmation_triggered).toBe(true);
    expect(result.confirmation_pair).toBe('1|8');
  });

  it('confusable pair triggers confirmation even at high overall confidence', () => {
    // Need primary=1, secondary=6 with high confidence on both axes.
    // Stance: dependent=5(1.0), assertive=2(0.4) → separation 0.6 → high
    // Center: body=5(1.0), head needs to beat heart for secondary → head=2(0.4), heart=2(0.4)
    // Secondary type: dependent+head=6 or assertive+body=8. dep_head score=0.4, assertive score=0.4 → tie → stance-flip wins → assertive+body=8
    // That gives pair 1|8, not 1|6. Need head to score higher than assertive for center-flip to win.
    // Stance: dependent=5(1.0), withdrawn=2(0.4), assertive=2(0.4) → high stance confidence
    // Center: body=5(1.0), head=3(0.6), heart=2(0.4) → secondary=head, sep=0.4 → high
    // Secondary: stance-flip(withdrawn+body=9, score=0.4) vs center-flip(dependent+head=6, score=0.6) → center-flip wins → type 6
    // Pair 1|6 is confusable → triggers despite high confidence
    const responses = buildResponsesFromItems(2, {
      S5: 5, S6: 5, S7: 5, S8: 5,  // dependent = 1.0
      C1: 5, C2: 5, C3: 5, C4: 5,  // body = 1.0
      C9: 3, C10: 3, C11: 3, C12: 3,  // head = 0.6
    });

    const result = scoreHeartAssessment(responses);
    expect(result.primary_type).toBe(1);
    expect(result.secondary_type).toBe(6);
    expect(result.overall_confidence).toBe('high');
    expect(result.confirmation_triggered).toBe(true);
    expect(result.confirmation_pair).toBe('1|6');
    expect(result.confirmation_reason).toBe('confusable pair match');
  });

  it('split confidence triggers confirmation when pair is confusable', () => {
    // Stance high, center low, and pair in CONFUSABLE_PAIRS.
    // Stance: dependent=5(1.0), others=2(0.4) → sep=0.6 → high
    // Center: body=3(0.6), heart=3(0.6), head=2(0.4) → sep=0.0 → low
    // Primary: dependent+body=1 (body wins tie by sort order)
    // Secondary depends on which center is secondary. With body/heart tied, secondary could be heart.
    // dependent+heart=2. Pair 1|2 is NOT confusable → won't trigger.
    // Let's use: withdrawn(high) + head(low, with 5|6 as confusable pair).
    // Stance: withdrawn=5(1.0), others=2(0.4) → high
    // Center: head=3(0.6), heart=2.75(0.55), body=2(0.4) → sep=0.05 → low
    // Primary: withdrawn+head=5
    // Secondary: stance-flip → assertive/dependent + head. center-flip → withdrawn+heart=4.
    // center score for heart=0.55, stance score for dep/assertive=0.4 → center-flip wins → type 4.
    // Wait, 4|5 is confusable! But I need 5|6.
    // Try: center head=3(0.6) and body=2.75(0.55) → secondary center=body → withdrawn+body=9 → pair 5|9, not confusable.
    // OK let me just craft 5|6 directly.
    // Stance: withdrawn=5(1.0), dependent=3.5(0.7), assertive=2(0.4) → sep=0.3 → high
    // Center: head=3(0.6), heart=2.75(0.55), body=2(0.4) → sep=0.05 → low
    // Primary: withdrawn+head=5. Secondary: stance-flip(dependent+head=6, score=0.7) vs center-flip(withdrawn+heart=4, score=0.55) → stance-flip wins → type 6
    // Pair 5|6 is confusable. Split confidence: high+low → trigger!
    const responses = buildResponsesFromItems(2, {
      S9: 5, S10: 5, S11: 5, S12: 5,  // withdrawn = 1.0
      S5: 4, S6: 3, S7: 3, S8: 4,    // dependent = 0.7
      C9: 3, C10: 3, C11: 3, C12: 3,  // head = 0.6
      C5: 3, C6: 3, C7: 2, C8: 3,    // heart = 0.55
    });

    const result = scoreHeartAssessment(responses);
    expect(result.primary_type).toBe(5);
    expect(result.secondary_type).toBe(6);
    expect(result.stance_confidence).toBe('high');
    expect(result.center_confidence).toBe('low');
    expect(result.confirmation_triggered).toBe(true);
    expect(result.confirmation_pair).toBe('5|6');
    expect(result.confirmation_reason).toContain('split confidence');
  });

  it('rules fire but non-confusable pair → no trigger, instrumented reason', () => {
    // Need primary=8, secondary=9 (pair 8|9 is NOT confusable) with low confidence.
    // Stance: assertive=3(0.6), withdrawn=2.75(0.55), dependent=2(0.4) → sep=0.05 → low
    // Center: body=3(0.6), heart=2(0.4), head=2(0.4) → sep=0.2 → moderate
    // Primary: assertive+body=8. Secondary: stance-flip(withdrawn+body=9, score=0.55) vs center-flip(assertive+heart=3, score=0.4) → stance-flip wins → type 9
    // Pair: 8|9 → NOT confusable → rules fire (low overall) but no trigger.
    const responses = buildResponsesFromItems(2, {
      S1: 3, S2: 3, S3: 3, S4: 3,      // assertive = 0.6
      S9: 3, S10: 3, S11: 2, S12: 3,    // withdrawn = 0.55
      C1: 3, C2: 3, C3: 3, C4: 3,      // body = 0.6
    });

    const result = scoreHeartAssessment(responses);
    expect(result.primary_type).toBe(8);
    expect(result.secondary_type).toBe(9);
    expect(result.confirmation_triggered).toBe(false);
    expect(result.confirmation_reason).toMatch(/^rules_fired_no_pair:/);
  });
});

// ── scoreHeartAssessment: flat response detection ───────────────────────────

describe('scoreHeartAssessment — flat response', () => {
  it('all items = 3 → flat flag', () => {
    const responses = buildResponses({
      assertive: 3, dependent: 3, withdrawn: 3,
      body: 3, heart: 3, head: 3,
    });
    const result = scoreHeartAssessment(responses);
    expect(result.response_pattern_flag).toBe('flat');
  });
});

// ── resolveFinalType: confirmation outcomes (end-to-end style) ──────────────

describe('resolveFinalType — confirmation outcomes', () => {
  it('disagreed: algorithm=1, user picks 6 → finalType=6, finalSecondary=1, low', () => {
    const result = resolveFinalType(1, 6, 'moderate', { result: 'disagreed', userPick: 6 });
    expect(result.finalType).toBe(6);
    expect(result.finalSecondary).toBe(1);
    expect(result.finalConfidence).toBe('low');
  });

  it('agreed: moderate confidence → upgraded to high', () => {
    const result = resolveFinalType(1, 6, 'moderate', { result: 'agreed' });
    expect(result.finalType).toBe(1);
    expect(result.finalConfidence).toBe('high');
  });

  it('uncertain: keeps algorithm primary, drops to low', () => {
    const result = resolveFinalType(1, 6, 'moderate', { result: 'uncertain' });
    expect(result.finalType).toBe(1);
    expect(result.finalSecondary).toBe(6);
    expect(result.finalConfidence).toBe('low');
  });
});

// ── determineSecondaryType ──────────────────────────────────────────────────

describe('determineSecondaryType', () => {
  it('picks stance-flip when secondary stance score is higher', () => {
    const result = determineSecondaryType(
      'dependent', 'assertive', 'body', 'heart',
      { assertive: 0.7, dependent: 1.0, withdrawn: 0.4 },
      { body: 1.0, heart: 0.5, head: 0.4 },
    );
    // stance-flip: assertive+body=8 (score 0.7) vs center-flip: dependent+heart=2 (score 0.5)
    expect(result).toBe(8);
  });

  it('picks center-flip when secondary center score is higher', () => {
    const result = determineSecondaryType(
      'dependent', 'assertive', 'body', 'heart',
      { assertive: 0.5, dependent: 1.0, withdrawn: 0.4 },
      { body: 1.0, heart: 0.7, head: 0.4 },
    );
    // stance-flip: assertive+body=8 (score 0.5) vs center-flip: dependent+heart=2 (score 0.7)
    expect(result).toBe(2);
  });

  it('tie-breaks to stance-flip', () => {
    const result = determineSecondaryType(
      'dependent', 'assertive', 'body', 'heart',
      { assertive: 0.6, dependent: 1.0, withdrawn: 0.4 },
      { body: 1.0, heart: 0.6, head: 0.4 },
    );
    // Both 0.6 → stance-flip wins → assertive+body=8
    expect(result).toBe(8);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('all items at minimum (1) still produces a valid result', () => {
    const responses = buildResponses({
      assertive: 1, dependent: 1, withdrawn: 1,
      body: 1, heart: 1, head: 1,
    });
    const result = scoreHeartAssessment(responses);
    expect(result.response_pattern_flag).toBe('flat');
    expect(result.primary_type).toBeGreaterThanOrEqual(1);
    expect(result.primary_type).toBeLessThanOrEqual(9);
  });

  it('all items at maximum (5) still produces a valid result', () => {
    const responses = buildResponses({
      assertive: 5, dependent: 5, withdrawn: 5,
      body: 5, heart: 5, head: 5,
    });
    const result = scoreHeartAssessment(responses);
    expect(result.response_pattern_flag).toBe('flat');
    expect(result.primary_type).toBeGreaterThanOrEqual(1);
    expect(result.primary_type).toBeLessThanOrEqual(9);
  });

  it('scoreHeartAssessment sets placeholder values for hook-owned fields', () => {
    const responses = buildResponses({ assertive: 5, body: 5 });
    const result = scoreHeartAssessment(responses);
    expect(result.randomization_seed).toBe(0);
    expect(result.item_order).toEqual([]);
    expect(result.confirmation_result).toBeNull();
    expect(result.confirmation_user_pick).toBeNull();
  });
});
