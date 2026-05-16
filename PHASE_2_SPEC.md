SPARK Phase 2 Implementation Spec — Hand Assessment Rebuild
Purpose: Rebuild the Hand assessment from the trademark-exposed 6-type Working Genius model (Lantern, Forge, Compass, Drum, Scaffold, Anchor) to a 5-phase energy/drain model (Sensing, Generating, Evaluating, Mobilizing, Completing). Phase 2 depends on Phase 1 being complete (TypeScript installed, migrations dir initialized, existing patterns understood).
Pre-work
Before any file creation:

Confirm Phase 1 completed successfully and all Phase 1 review checkpoints passed
Read src/components/HandAssessment.jsx and src/pages/AssessmentHand.jsx (current implementation being replaced)
Read the Phase 1 Heart code to match patterns: src/assessments/heart/ structure, scoring module conventions, persistence layer, state machine hook, component styling
Read PHASE_1_SPEC.md if context is lost — Phase 2 mirrors its structure

Summarize what you observe in the current Hand implementation back to the user before writing new code.
Project-wide setup tasks
None. Phase 1 handled TypeScript install, migrations directory, and convention-setting. Phase 2 writes new files in established patterns.
Task 0.1 — Archive old Hand files

Move src/pages/AssessmentHand.jsx → src/_archived/AssessmentHand.v1.jsx
Move src/components/HandAssessment.jsx → src/_archived/HandAssessment.v1.jsx
Add header comment: // ARCHIVED {date} — replaced by Hand v2 five-phase architecture. Kept for reference only; not imported anywhere.
Update imports that referenced the old files; expect src/App.jsx routes to need pointer changes to Hand v2 location

Architecture overview
The Hand assessment identifies which phases of the collaborative work cycle energize versus drain the person. Distinct from skill — measures energetic fit, not ability.
Five phases (sequential in any collaborative project):

Sensing — Noticing what needs attention
Generating — Producing possibilities
Evaluating — Testing what's worth pursuing
Mobilizing — Creating momentum toward action
Completing — Bringing things to finished state

Output categories:

Energy phases (1–2): where contribution lives, sustains without depletion
Drain phases (1–2): where effort produces depletion regardless of competence
Neutral phases (remainder): competent with normal cost

Measurement: Cross-phase paired comparison with early lock. Two phases:

Phase 1 (drain identification): up to 10 pairs, "which drains more?"
Phase 2 (energy identification): 3 pairs from non-drain phases, "which produces more energy?"

Total: 10–13 comparisons depending on early lock triggers.
No opening instruction card beyond the standard intro — prompt wording differs between Phase 1 and Phase 2 but is shown per-pair, not in a top-level intro.
File structure
src/assessments/hand/
  HandAssessment.tsx                   -- top-level orchestrator
  components/
    HandIntro.tsx                       -- opening instruction
    HandPairPresenter.tsx               -- paired-comparison UI (used in both phases)
    HandProgressBar.tsx                 -- dynamic pair count
    HandResult.tsx                      -- energy/drain/neutral display
  hooks/
    useHandAssessment.ts                -- state machine, phase transition, early lock
  lib/
    handTypes.ts                        -- TypeScript types
    handConstants.ts                    -- phase descriptions, thresholds
    handPairs.ts                        -- 10 Phase 1 pairs + Phase 2 pair generator
    handScoring.ts                      -- pure scoring functions
    handPersistence.ts                  -- localStorage + Supabase
  __tests__/
    handScoring.test.ts                 -- unit tests

supabase/migrations/
  {timestamp}_hand_assessments_v2.sql  -- schema migration
Task 1 — Types and constants
src/assessments/hand/lib/handTypes.ts
Define:

Phase — union 'sensing' | 'generating' | 'evaluating' | 'mobilizing' | 'completing'
PairKey — string type for pair identification
HandPair — { pairKey: string; phaseA: Phase; phaseB: Phase; }
Phase1Response — { pairKey: string; selectedPhase: Phase; } (the phase selected as "drains more")
Phase2Response — { pairKey: string; selectedPhase: Phase; } (the phase selected as "produces more energy")
ConfidenceLevel — 'high' | 'moderate' | 'low'
HandScoringResult — matches Supabase row shape

src/assessments/hand/lib/handConstants.ts
typescriptexport const PHASES = ['sensing', 'generating', 'evaluating', 'mobilizing', 'completing'] as const;

export const PHASE_DESCRIPTIONS = {
  sensing: "Noticing what needs attention before others do — the problem, the opportunity, the question worth asking, the thing being missed.",
  generating: "Producing new possibilities, proposals, and approaches — ideation when the direction isn't yet clear.",
  evaluating: "Testing ideas for soundness and viability — examining weaknesses, assessing risk, filtering possibilities.",
  mobilizing: "Creating momentum toward action — rallying people, building shared commitment, getting movement started.",
  completing: "Carrying work to finished state — executing the final stretch, closing loops, handling what's left.",
} as const;

export const DRAIN_LOCK_THRESHOLD = 4;          // phase locks as confirmed drain
export const DRAIN_CONFIRMED_THRESHOLD = 3;     // phase counts as drain phase in final output
export const MINIMUM_PAIRS_BEFORE_LOCK = 6;     // no lock can fire before pair 6

export const PHASE1_DRAIN_PROMPT = "Which of these drains more energy when you have to do it?";
export const PHASE2_ENERGY_PROMPT = "Which of these produces more energy when you get to do it?";

export const ASSESSMENT_VERSION = 'hand_v2_five_phase';
Task 2 — Pair definitions
src/assessments/hand/lib/handPairs.ts
Export the 10 Phase 1 pairs as data, each with custom verbatim item text (do not use PHASE_DESCRIPTIONS for Phase 1 — each pair has its own calibrated language):
typescriptexport const PHASE1_PAIRS: HandPair[] = [
  { pairKey: 'p1_sensing_generating', phaseA: 'sensing', phaseB: 'generating',
    textA: "Noticing that something in a situation isn't quite right and needs to be examined, before anyone else has named the problem.",
    textB: "Coming up with new possibilities or proposals when a problem needs solutions — generating ideas that don't yet exist." },
  // ... 9 more pairs
];
The 10 Phase 1 pair verbatim texts, in order:

sensing vs generating — see content spec Pair 1
sensing vs evaluating — Pair 2
sensing vs mobilizing — Pair 3
sensing vs completing — Pair 4
generating vs evaluating — Pair 5
generating vs mobilizing — Pair 6
generating vs completing — Pair 7
evaluating vs mobilizing — Pair 8
evaluating vs completing — Pair 9
mobilizing vs completing — Pair 10

[CC: when you reach this file, ask the user for the 10 verbatim pair texts. They are in the content spec and must be reproduced exactly.]
Phase 2 pairs are generated dynamically. Export a function:
typescriptexport function generatePhase2Pairs(nonDrainPhases: Phase[]): HandPair[]
Given 3 non-drain phases, return the 3 pairwise combinations. For pair text, use the short PHASE_DESCRIPTIONS from handConstants.ts (the Phase 1 custom texts are drain-framed and don't transfer cleanly to energy framing).
Edge cases: If Phase 1 ends with fewer than 3 non-drain phases (because 3+ phases hit drain threshold), pass only the top 3 non-drain phases by ascending drain score.
Task 3 — Scoring module and schema
src/assessments/hand/lib/handScoring.ts — pure functions.
Export:

computeDrainScores(phase1Responses: Phase1Response[], phase1PairsShown: HandPair[]): Record<Phase, number> — tallies how many times each phase was selected as "drains more". Counts are bounded by how many pairs involving that phase were actually shown (early lock reduces this).
identifyDrainPhases(drainScores: Record<Phase, number>): { drainPhases: Phase[]; reason: 'clear' | 'capped' | 'none' } — applies the rules: ≥3 = drain, cap at top 2, handle 3+ tie with pair-level tiebreaker (pass additional context if needed for tiebreak).
shouldTriggerEarlyLock(drainScores: Record<Phase, number>, pairsAnswered: number): Phase | null — returns a phase to lock if any has hit DRAIN_LOCK_THRESHOLD and pairsAnswered ≥ MINIMUM_PAIRS_BEFORE_LOCK; otherwise null.
filterRemainingPairs(remainingPairs: HandPair[], lockedPhases: Phase[]): HandPair[] — removes pairs involving any locked phase from the queue.
computeEnergyScores(phase2Responses: Phase2Response[], phase2PairsShown: HandPair[]): Record<Phase, number> — same tally pattern.
identifyEnergyPhases(energyScores: Record<Phase, number>, drainPhases: Phase[]): { energyPhases: Phase[]; neutralPhases: Phase[] } — top 2 by energy score → energy; remaining non-drain → neutral.
classifyDrainConfidence(drainScores: Record<Phase, number>): ConfidenceLevel — per the spec rules (top ≥3 and second ≤1 = high; top ≥3 and second =2 = moderate; no phase ≥3 = low).
classifyEnergyConfidence(energyScores: Record<Phase, number>): ConfidenceLevel — per spec.
minConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel — reuse from Phase 1 if exported, otherwise duplicate.
scoreHandAssessment(allInput: {...}): HandScoringResult — top-level composer.

supabase/migrations/{timestamp}_hand_assessments_v2.sql — full schema. Draft from the column list in the content spec:
Columns: id uuid pk, user_id uuid fk nullable, session_id uuid, phase1_responses jsonb, phase2_responses jsonb, phase1_completed_pairs smallint, drain_scores jsonb, energy_scores jsonb, energy_phases text[], drain_phases text[], neutral_phases text[], drain_confidence text enum-checked, energy_confidence text enum-checked, overall_confidence text enum-checked, early_lock_triggered boolean default false, locked_phases text[] default '{}', randomization_seed bigint, pair_order jsonb, assessment_version text default 'hand_v2_five_phase', started_at timestamptz default now(), completed_at timestamptz, created_at + updated_at.
Constraints: all enum text fields have check constraints against ('high','moderate','low'); all phase text[] fields have check constraints against the phase enum set; phase1_completed_pairs between 0 and 10.
RLS: same pattern as Heart — read/update/insert own rows; anon insert allowed with null user_id.
Show the user the full SQL before anything is applied. User applies manually via dashboard.
Task 4 — Unit tests
src/assessments/hand/__tests__/handScoring.test.ts
Test cases:

Clear single-drain pattern: user selects "generating" as drains-more in all 4 pairs involving it; drain score = 4, lock triggers on pair 6 (if generating has been in 6+ pairs by then, which it should), other drain scores <= 2. Assert: drain_phases = ['generating'], early_lock_triggered = true.
Two-drain pattern: generating and completing both hit drain score 3+ without either reaching 4. Assert: drain_phases = ['generating', 'completing'] (order by score desc), early_lock_triggered = false.
No clear drain pattern: all drain scores 1-2, none ≥3. Assert: drain_phases = [], drain_confidence = 'low', all 5 phases proceed to Phase 2 (with top-3 rule applied).
Three-way drain tie: three phases at score 3. Assert: cap at top 2, tiebreaker rule applied, third phase demoted to neutral.
Early lock at exactly pair 6: generating reaches 4 on answer 6. Assert: lock fires; pairs 7-10 that involve generating are filtered out.
Early lock blocked before pair 6: generating reaches 4 on answer 5. Assert: lock does NOT fire; pair 6 still shown.
Clean energy identification: 3 non-drain phases → 3 Phase 2 pairs → one phase wins both its Phase 2 pairs (score 2), one wins one (score 1), one wins zero (score 0). Assert: top 2 → energy, bottom 1 → neutral.
Phase 2 tie: two phases both score 1 in Phase 2. Assert: tiebreaker uses the direct pairwise comparison.
Confidence combinations: test each cell of (drain_confidence × energy_confidence) matrix produces correct overall_confidence (min rule).
Response pattern edge case: user only sees 10 Phase 1 pairs + 3 Phase 2 pairs = 13 total → handled correctly; vs user triggers lock after 6 Phase 1 pairs, sees 7 Phase 1 + 3 Phase 2 = 10 total → also correct.

Task 5 — Persistence and state machine
src/assessments/hand/lib/handPersistence.ts
Functions mirror Heart:

saveProgressToLocalStorage(sessionId, state) — writes to spark_hand_session_${sessionId}
loadSessionFromLocalStorage(sessionId)
clearLocalSession(sessionId)
persistFinalResultToSupabase(result, userId)
associateSessionWithUser(sessionId, userId)

Use the same supabase singleton from src/lib/supabase.js and respect the spark_fresh_start flag from AssessmentContext.
src/assessments/hand/hooks/useHandAssessment.ts
State machine: 'intro' | 'phase1' | 'phase2' | 'scoring' | 'result' | 'error'
Responsibilities:

On mount: generate sessionId + randomization seed, shuffle Phase 1 pairs once, randomize A/B within each pair, write seed to state
During phase1: present next pair, capture response, update drain scores, check lock condition after each response (but only from pair 6+), filter remaining pairs on lock
Transition phase1 → phase2 when all Phase 1 pairs complete (either all 10 shown, or remaining pairs empty after lock-filtering)
Generate Phase 2 pairs from non-drain remainder (with top-3 rule for edge cases)
During phase2: same pair presenter, swap prompt language
Transition phase2 → scoring → result after 3 Phase 2 responses
Write final result to Supabase on entering 'result' state

Hook returns: current state, current pair + prompt text, pair number + total (dynamic — updates if lock fires), response handlers, final result.
Task 6 — UI components
Match the inline-style-object convention from the archived Heart and Hand components. Read src/_archived/HandAssessment.v1.jsx first to match existing visual design.

HandIntro.tsx — opening instruction (use language from content spec about energy vs skill, what gives you life)
HandPairPresenter.tsx — two-option A/B UI with the current prompt ("Which drains more?" / "Which produces more energy?") shown above the options. Keyboard shortcuts: A/B keys or 1/2.
HandProgressBar.tsx — "Comparison N of M" where M is dynamic; handle lock transitions smoothly (don't abruptly change the denominator mid-view, animate it).
HandResult.tsx — displays energy phases, drain phases, neutral phases with phase descriptions from PHASE_DESCRIPTIONS, applies confidence language per spec (especially the distinctive Low-confidence message about generalists).

Task 7 — Orchestrator
src/assessments/hand/HandAssessment.tsx — consumes useHandAssessment, renders per state. Router target for /assessment/hand.
Update src/App.jsx to import from new location. Previous route was <Route path="/assessment/hand" element={<AssessmentHand />} /> importing from ./pages/AssessmentHand; new import should point to the new orchestrator's wrapper page, or (cleaner) the old page pattern can be preserved as a thin wrapper that imports the new component.
Task 8 — AssessmentContext integration
Current context fields: handType, handGeniusTypes, handFrustrationTypes, with setters. These use the old Working Genius naming.
New Heart v2 (Phase 1) introduced the convention of final_type being an integer and heartResult being the full scoring object. Hand is different structurally — there is no single "type," there are arrays of energy/drain/neutral phases.
Recommended change: deprecate handType, handGeniusTypes, handFrustrationTypes — keep them as-is for now to avoid breaking other code, but stop writing to them. Add a single new field:

handResult — stores the full HandScoringResult object (which contains energy_phases, drain_phases, neutral_phases, confidences, etc.)
setHandResult(v) — writes to spark_hand_result in localStorage

Update KEYS array in AssessmentContext.jsx to include spark_hand_result.
Flag to user: downstream consumers (src/pages/Results.jsx, src/pages/admin/TestSynthesis.jsx, generate-synthesis edge function) likely read handType, handGeniusTypes, handFrustrationTypes. Do NOT fix these in Phase 2. List them.
Review checkpoints
Pause for user review after:

Task 0 complete (old files archived, src/App.jsx routes updated to placeholder)
Task 3 complete (scoring module + schema drafted) — user reviews scoring logic including early-lock edge cases before UI work
Task 4 complete (tests passing, especially the edge cases around lock timing)
Task 7 complete (full Hand flow working end-to-end locally) — user tests the assessment
Task 8 complete (context integration + downstream consumer list flagged)

Known deferrals

Retake pathway for low-confidence results (placeholder message only)
Fixing downstream consumers of handType/handGeniusTypes/handFrustrationTypes — these break in Phase 2 and get fixed incidentally through Phase 3 (Head) and Phase 4 (synthesis migration)
Styling polish
Migration of existing .jsx files to .tsx

Questions CC should ask the user during implementation

The 10 verbatim Phase 1 pair texts (Task 2)
The exact opening instruction language for Hand intro (in content spec — can summarize if brief)
The exact Low-confidence language for Hand results ("generalist by disposition" framing)
Confirmation on whether to silently preserve the old handType/handGeniusTypes/handFrustrationTypes context fields or remove them (recommendation: preserve for now)


End of spec.
