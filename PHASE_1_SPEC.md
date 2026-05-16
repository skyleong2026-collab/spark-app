SPARK Phase 1 Implementation Spec — Heart Assessment Rebuild
Purpose: Rebuild the Heart assessment from the old Filter 1/Filter 2 binary-pair architecture to a Stance × Center orthogonal behavioral-frequency model. This spec is complete and implementation-ready. Where the spec is silent, use best judgment consistent with the existing codebase patterns and note the decision in a code comment.
Pre-work: inspect the existing codebase before writing anything
Before any file creation, read these files and summarize back to the user what patterns you observe:

package.json
src/App.jsx (routing setup)
src/context/AssessmentContext.jsx (shared state pattern)
src/lib/supabase.js (client initialization)
src/pages/AssessmentHeart.jsx (current Heart page — being replaced)
src/components/HeartAssessment.jsx (current component — being replaced)

Specifically note: naming conventions (default vs named exports, file naming), import style (path aliases or relative), component style (function declarations vs arrow), how the existing AssessmentContext shapes Heart result data, and how Supabase writes are currently done. Match these conventions in new code unless they conflict with this spec.
Project-wide setup tasks (do these first, in order)
Task 0.1 — Add TypeScript to the project

Install: npm install -D typescript @types/node @types/react @types/react-dom
Create tsconfig.json with strict mode, React 19 JSX, ESM modules, path alias @/* → src/*
Create tsconfig.node.json for Vite config
Update vite.config.js → vite.config.ts
Update package.json scripts: add "typecheck": "tsc --noEmit"
Do NOT migrate existing .jsx files. New Heart files are .tsx; existing files stay .jsx and can be migrated later.
Verify: npm run typecheck passes, npm run dev still works, npm run build still works.

Task 0.2 — Initialize Supabase migrations directory

Create supabase/migrations/ directory
Create supabase/config.toml if it doesn't exist (use supabase init output as template)
Add a README at supabase/migrations/README.md explaining migration ordering and naming convention (YYYYMMDDHHMMSS_description.sql)
Do NOT attempt to introspect existing schema — the user will handle a one-time schema snapshot as a separate task. This directory is for going-forward migrations.

Task 0.3 — Archive old Heart files

Create src/_archived/ directory
Move src/pages/AssessmentHeart.jsx → src/_archived/AssessmentHeart.v1.jsx
Move src/components/HeartAssessment.jsx → src/_archived/HeartAssessment.v1.jsx
Add header comment to each archived file: // ARCHIVED 2026-04-18 — replaced by Heart v2 Stance×Center architecture. Kept for reference only; not imported anywhere.
Update any imports that referenced the old files to point at the new Heart v2 location (created in later tasks). Expect to fix src/App.jsx routes and possibly src/context/AssessmentContext.jsx.

Architecture overview
The Heart assessment identifies Enneagram type via two independent coordinates measured separately, intersected in a 3×3 matrix.
Coordinate 1: Stance — Assertive (types 3, 7, 8), Dependent (types 1, 2, 6), Withdrawn (types 4, 5, 9)
Coordinate 2: Center — Body (types 8, 9, 1), Heart (types 2, 3, 4), Head (types 5, 6, 7)
Type matrix:
BodyHeartHeadAssertive837Dependent126Withdrawn945
Measurement: 24 behavioral-frequency items on a 5-point scale (1=Never, 2=Rarely, 3=Sometimes, 4=Often, 5=Almost Always). 12 Stance items (4 per stance), 12 Center items (4 per center). Items presented in randomized order, no visible dimension grouping. No reverse-keyed items.
Opening instruction (show before first item):

Answer based on how you've consistently operated across your life — not just your current role, season, or the person you're trying to become. Think about your pattern over the past several years. For each statement, how often does this describe your actual behavior?

File structure (create in this order)
src/assessments/heart/
  HeartAssessment.tsx                  -- top-level orchestrator (Task 7)
  components/
    HeartIntro.tsx                      -- opening instruction (Task 6)
    HeartItemPresenter.tsx              -- single item + 5-point Likert (Task 6)
    HeartProgressBar.tsx                -- "Question N of 24" (Task 6)
    HeartConfirmation.tsx               -- two-paragraph disambiguation (Task 6)
    HeartResult.tsx                     -- final type + confidence (Task 6)
  hooks/
    useHeartAssessment.ts               -- state machine, response capture (Task 5)
  lib/
    heartTypes.ts                       -- TypeScript types (Task 1)
    heartConstants.ts                   -- thresholds, matrix, configs (Task 1)
    heartItems.ts                       -- the 24 items as data (Task 2)
    heartConfirmationPairs.ts           -- 8 pair descriptions as data (Task 2)
    heartScoring.ts                     -- pure scoring functions (Task 3)
    heartPersistence.ts                 -- localStorage + Supabase (Task 5)
  __tests__/
    heartScoring.test.ts                -- unit tests for scoring (Task 4)

supabase/migrations/
  {timestamp}_heart_assessments_v2.sql  -- schema migration (Task 3)
Task 1 — Types and constants
src/assessments/heart/lib/heartTypes.ts
Define TypeScript types for: LikertResponse (union of 1|2|3|4|5), ItemKey (union of 'S1'..'S12' | 'C1'..'C12'), HeartResponses (record mapping ItemKey → LikertResponse), Stance ('assertive' | 'dependent' | 'withdrawn'), Center ('body' | 'heart' | 'head'), EnneagramType (union 1|2|...|9), ConfidenceLevel ('high' | 'moderate' | 'low'), ConfirmationResult ('agreed' | 'disagreed' | 'uncertain'), ResponsePatternFlag ('normal' | 'flat'), plus a HeartScoringResult object type that matches the Supabase row shape in Task 3.
src/assessments/heart/lib/heartConstants.ts
Export as named constants:
typescriptexport const HIGH_SEPARATION_THRESHOLD = 0.25;
export const MODERATE_SEPARATION_THRESHOLD = 0.10;
export const FLAT_RESPONSE_THRESHOLD = 0.10;

export const STANCE_ITEM_KEYS = {
  assertive: ['S1', 'S2', 'S3', 'S4'] as const,
  dependent: ['S5', 'S6', 'S7', 'S8'] as const,
  withdrawn: ['S9', 'S10', 'S11', 'S12'] as const,
};
export const CENTER_ITEM_KEYS = {
  body:  ['C1', 'C2', 'C3', 'C4'] as const,
  heart: ['C5', 'C6', 'C7', 'C8'] as const,
  head:  ['C9', 'C10', 'C11', 'C12'] as const,
};
export const TYPE_MATRIX = {
  assertive: { body: 8, heart: 3, head: 7 },
  dependent: { body: 1, heart: 2, head: 6 },
  withdrawn: { body: 9, heart: 4, head: 5 },
} as const;

// Confusable pairs stored as sorted-tuple strings for O(1) lookup
export const CONFUSABLE_PAIRS = new Set([
  '1|6', '2|9', '3|7', '4|5', '4|9', '5|6', '1|8', '2|3'
]);

export const ASSESSMENT_VERSION = 'heart_v2_stance_center';
Task 2 — Item pool and confirmation pair data
src/assessments/heart/lib/heartItems.ts — export an array of 24 item objects, each with shape { key: ItemKey; text: string; dimension: Stance | Center; subCategory: string }.
The 24 items, verbatim from the content spec (do not reword):
Stance items

S1 / assertive / need expression: "When I want something, I push for it directly rather than waiting for the right moment."
S2 / assertive / conflict: "In conflict, I say what I think even if it creates friction."
S3 / assertive / emotional bypass: "When I'm hurt or disappointed, I move into action before I've fully felt it."
S4 / assertive / connection: "I notice myself driving forward on what I want before checking how others are receiving it."
S5 / dependent / need expression: "When I'm figuring out what I want, I think about it in terms of what others need or expect."
S6 / dependent / self-reflection filter: "I can articulate my values clearly, but they tend to form in reference to what I've been taught, told, or shown."
S7 / dependent / conflict: "When I'm uncertain about a decision, my first instinct is to check it against someone or something outside myself."
S8 / dependent / connection: "I notice what I want most clearly when I'm with someone whose reaction I'm tracking."
S9 / withdrawn / activation: "When something important needs to happen, I process it internally before — or instead of — acting on it."
S10 / withdrawn / activation gap: "I can see clearly what needs to be done and still not do it."
S11 / withdrawn / conflict: "Under pressure, my instinct is to pull back and wait rather than push forward."
S12 / withdrawn / connection: "I often have rich internal responses to situations that others never see from the outside."

Center items

C1 / body / somatic awareness: "When something's off, I feel it in my body before I can name what's wrong."
C2 / body / reactivity trigger: "I get tense or irritated when things are inefficient, incorrect, or unfair."
C3 / body / reactivity mode: "My first reaction to a problem tends to be physical — tension, restlessness, or forward motion."
C4 / body / core threat: "I notice when my will or autonomy is being pushed against, and I react to it quickly."
C5 / heart / attention focus: "I'm highly aware of how I'm being perceived in social situations."
C6 / heart / reactivity trigger: "I notice quickly when a relationship feels off, distant, or disconnected."
C7 / heart / identity coherence: "I think about who I'm being to different people — and I can tell when those versions aren't lining up."
C8 / heart / core threat: "My mood is strongly affected by whether I feel seen, valued, or understood by others."
C9 / head / anticipatory pattern: "I think ahead about what could go wrong and try to prepare for it."
C10 / head / reactivity trigger: "I notice uncertainty quickly and feel pulled to resolve it — by planning, researching, or imagining outcomes."
C11 / head / time orientation: "My reactions to situations are shaped by what I'm anticipating, not just what's happening now."
C12 / head / reactivity mode: "When I feel unsettled, my mind works the problem — running scenarios, checking assumptions, looking for a framework."

src/assessments/heart/lib/heartConfirmationPairs.ts — export a map from pair key (e.g., '1|6') to { patternA: { type: EnneagramType; description: string }, patternB: { type: EnneagramType; description: string } }. Descriptions below are final content; do not reword. Pattern A always shows the lower-numbered type, Pattern B the higher-numbered type.
Pair descriptions (full text of each Pattern A and Pattern B is in the content spec the user has; reproduce them exactly as written there — see "Confirmation Pair Descriptions" section):

'1|6': Type 1 vs Type 6
'2|3': Type 2 vs Type 3
'2|9': Type 2 vs Type 9
'3|7': Type 3 vs Type 7
'4|5': Type 4 vs Type 5
'4|9': Type 4 vs Type 9
'5|6': Type 5 vs Type 6
'1|8': Type 1 vs Type 8

[CC: ask user for the full confirmation pair descriptions when you reach this file. They are in the user's master reference doc and are long-form paragraphs that must be reproduced verbatim.]
Task 3 — Scoring module and schema
src/assessments/heart/lib/heartScoring.ts — pure functions, no side effects, fully unit-testable.
Export functions:

computeSubScaleScores(responses: HeartResponses): { stance: Record<Stance, number>, center: Record<Center, number> } — sums item responses per sub-scale, divides by 20, returns 0.2–1.0 range.
rankDimensions<T>(scores: Record<T, number>): { primary: T, secondary: T, separation: number } — generic ranking used for both stance and center.
determineType(stance: Stance, center: Center): EnneagramType — matrix lookup.
determineSecondaryType(primaryStance, secondaryStance, primaryCenter, secondaryCenter, stanceScores, centerScores): EnneagramType — picks the higher-scoring of the two candidate secondaries per the spec.
classifyConfidence(separation: number): ConfidenceLevel — applies HIGH/MODERATE thresholds.
minConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel — ordered min (low < moderate < high).
detectFlatResponse(stanceScores, centerScores): ResponsePatternFlag — returns 'flat' if both ranges are below FLAT_RESPONSE_THRESHOLD.
shouldTriggerConfirmation(primaryType, secondaryType, stanceConfidence, centerConfidence, overallConfidence): { triggered: boolean; pair: string | null; reason: string } — returns trigger state plus which rule fired (for instrumentation).
resolveFinalType(algorithmType, algorithmSecondary, algorithmConfidence, confirmation: { result, userPick } | null): { finalType: EnneagramType, finalSecondary: EnneagramType, finalConfidence: ConfidenceLevel } — applies the three confirmation outcome rules.
scoreHeartAssessment(responses: HeartResponses): HeartScoringResult — top-level function that composes the above.

Confirmation outcome rules (locked decisions from spec conversation):

agreed → finalType = algorithm primary, finalConfidence = 'high'
disagreed → finalType = confirmation user pick, finalSecondary = algorithm primary, finalConfidence = 'low'
uncertain → finalType = algorithm primary, finalConfidence = 'low'
No confirmation triggered → finalType = algorithm primary, finalConfidence = algorithmic overall confidence

Confirmation trigger rules:

Overall confidence is Moderate or Low, OR
Sorted pair {primaryType, secondaryType} is in CONFUSABLE_PAIRS, OR
Stance and Center confidence disagree (one High, one Low)

supabase/migrations/{timestamp}_heart_assessments_v2.sql — schema migration. Use the SQL from the architecture spec exactly as written, including RLS policies, indexes, and the assessment_version column defaulting to 'heart_v2_stance_center'. The key columns: responses jsonb, stance_scores jsonb, center_scores jsonb, primary_stance/secondary_stance, primary_center/secondary_center, stance_separation/center_separation numeric(4,3), primary_type/secondary_type smallint, stance_confidence/center_confidence/overall_confidence, confirmation_triggered/confirmation_pair/confirmation_result/confirmation_user_pick, final_type/final_confidence, response_pattern_flag, randomization_seed bigint, item_order jsonb, standard audit cols.
RLS: users read/update/insert own rows (where user_id = auth.uid() or user_id is null for anon inserts).
Task 4 — Unit tests for scoring module
src/assessments/heart/__tests__/heartScoring.test.ts — install Vitest if not already present (npm install -D vitest), add "test": "vitest" to package.json scripts.
Test cases (non-exhaustive; CC should add more for edge cases):

Clean Type 1 result: all dependent items = 5, all body items = 5, others at 2. Assert primary_type = 1, both confidences = High, no confirmation triggered.
Clean Type 5 result: all withdrawn items = 5, all head items = 5, others at 2. Assert primary_type = 5.
All 9 types: parameterized test generating clean inputs for each type, asserting each resolves correctly.
Moderate stance confidence: stance scores (0.8, 0.65, 0.4) → 0.15 separation → Moderate, confirmation triggered.
Confusable pair triggers confirmation even at high confidence: stance (0.9, 0.5, 0.4), center (0.9, 0.5, 0.4) mapped to produce primary=1, secondary=6 → confirmation triggers on pair match despite high confidence.
Split confidence triggers confirmation: stance High, center Low → confirmation triggers even if not confusable pair.
Flat response detection: all items = 3 → flag = 'flat'.
Disagreement outcome: algorithm returns type 1, user picks type 6 on confirmation → finalType=6, finalSecondary=1, finalConfidence='low'.
Agreement outcome: algorithm moderate confidence → user agrees → finalConfidence = 'high'.
Uncertain outcome: user picks 'uncertain' → finalType stays algorithm primary, finalConfidence = 'low'.

All tests should pass with npm test.
Task 5 — Persistence and state machine
src/assessments/heart/lib/heartPersistence.ts
Functions:

saveResponseToLocalStorage(sessionId: string, itemKey: ItemKey, value: LikertResponse): void — writes to spark_heart_session_${sessionId} key, merges with existing responses.
loadSessionFromLocalStorage(sessionId: string): Partial<HeartSessionState> | null
clearLocalSession(sessionId: string): void
persistFinalResultToSupabase(result: HeartScoringResult, userId: string | null): Promise<{ id: string } | { error: string }> — single insert to heart_assessments table. Handles anonymous (user_id: null) case.
associateSessionWithUser(sessionId: string, userId: string): Promise<void> — updates row on post-auth handoff.

src/assessments/heart/hooks/useHeartAssessment.ts — custom hook managing the state machine.
States: 'intro' | 'items' | 'scoring' | 'confirmation' | 'result' | 'error'
Hook returns: current state, current item (if in items state), current item index, response count, confirmation pair data (if in confirmation state), final result (if in result state), handlers: beginAssessment(), submitResponse(value: LikertResponse), submitConfirmation(result: ConfirmationResult, userPick?: EnneagramType).
Internally: generates sessionId on mount, generates randomization seed, shuffles items once using seed, writes every response to localStorage, transitions to scoring when responseCount === 24, computes scoring synchronously, transitions to confirmation if triggered else to result, writes final result to Supabase on entering 'result' state.
Task 6 — UI components
All components in src/assessments/heart/components/. Match the styling approach used by the existing (now archived) Heart components — CC: read them first before writing new ones to match the existing design system.

HeartIntro.tsx — shows opening instruction, a "Begin" button.
HeartItemPresenter.tsx — shows current item text, 5 Likert buttons (Never / Rarely / Sometimes / Often / Almost Always) with keyboard shortcuts (1-5 keys), does NOT show dimension label.
HeartProgressBar.tsx — "Question N of 24" with visual progress indicator.
HeartConfirmation.tsx — shows two paragraph descriptions with no type labels, radio selection for Pattern A / Pattern B / "I can't tell which fits."
HeartResult.tsx — shows final type (number and name), confidence language per spec:

High: no qualifier
Moderate: "Your results suggest [primary type name] with some characteristics of [secondary type name]."
Low: "Your responses reflect a genuine blend between [primary] and [secondary] — more nuanced than a single label."



Task 7 — Top-level orchestrator
src/assessments/heart/HeartAssessment.tsx — consumes useHeartAssessment, renders the appropriate sub-component based on current state. This is what the router imports. Update src/App.jsx route for /assessment/heart to point here.
Task 8 — Integration with existing AssessmentContext
After Task 7, update src/context/AssessmentContext.jsx (remains .jsx) so that the Heart result stored in context matches the new shape (EnneagramType 1-9, not proprietary names). This is a breaking change for anything downstream that reads heart.type expecting 'Conviction' etc. CC: grep for heart.type usage across the codebase and flag every caller to the user before making this change — the synthesis function and Results page are likely affected.
Do NOT fix the downstream consumers in Phase 1. Flag them. They get fixed in Phase 4 (synthesis migration) and incidentally as we rebuild Head and Hand.
Review checkpoints
Pause for user review after:

Task 0 complete (TypeScript added, migrations dir initialized, old files archived) — user confirms project still builds.
Task 3 complete (scoring module + schema migration) — user reviews scoring logic line-by-line before UI work begins.
Task 4 complete (tests passing) — user reviews test cases before moving to UI.
Task 7 complete (full Heart flow working end-to-end locally) — user tests the assessment themselves.
Task 8 complete (context integration) — user confirms list of downstream callers to fix in later phases.

Known deferrals (not Phase 1 scope)

Retake pathway UI for low-confidence results (placeholder message only)
Post-auth session handoff beyond the associateSessionWithUser function stub
Styling polish
Migration of existing .jsx files to .tsx
Synthesis prompt changes to handle response_pattern_flag (Phase 4)
Beta feedback instrumentation (Phase 5)

Questions CC should ask the user during implementation

The full text of the 8 confirmation pair descriptions (Task 2) — these are long-form paragraphs in the user's master reference doc and must be reproduced verbatim.
The exact Supabase project URL and whether the migration should be applied via supabase db push or manually through the dashboard SQL editor.
Whether to add Vitest now or use another test runner already installed (check package.json first).


End of spec.

---

## Addendum — Codebase-specific notes (added after spec review)

### AssessmentContext integration

The existing `src/context/AssessmentContext.jsx` uses these localStorage keys for Heart: `spark_heart` (the type) and `spark_heart_result` (the full result object). The setter is `setHeartType(resultType)` and `setHeartResult(result)`, called from `AssessmentHeart.jsx` in `handleComplete`.

New Heart v2 must keep the same integration surface:
- Still call `setHeartType(finalType)` and `setHeartResult(result)` on completion.
- `heartType` changes from string ('Conviction', 'Devotion', etc.) to integer (1-9). This is a breaking change for downstream code.
- `heartResult` shape changes to match the new HeartScoringResult type. Downstream consumers (Results page, admin TestSynthesis, generate-synthesis edge function) will break — flag them to the user, do not fix in Phase 1.

### Navigation pattern

`AssessmentHeart.jsx` currently navigates to `/assessment/head` on completion. New Heart v2 does the same.

### Supabase client

`src/lib/supabase.js` exports a singleton `supabase` client initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Import this in heartPersistence.ts — do NOT create a new client instance.

### Styling convention

The existing Heart component uses inline style objects at the bottom of the file (const `wrap = {...}`, `introCard = {...}`, etc.) plus a small `<style>` block for hover states. Match this pattern in new Heart v2 components — do not introduce Tailwind, CSS modules, or styled-components.

### Fresh-start mechanism

AssessmentContext has a `spark_fresh_start` sessionStorage flag that suppresses loading stored values on retake. The new Heart persistence layer should respect this flag: if `sessionStorage.getItem('spark_fresh_start') === 'true'`, ignore existing localStorage session data.

### New localStorage keys

Heart v2 introduces a per-session key `spark_heart_session_${sessionId}` for incremental response storage. This is separate from `spark_heart` and `spark_heart_result` which remain the final-result keys used by AssessmentContext. Clear the session key on successful completion.

### Auth hook

`src/hooks/useAuth.js` exists — use it in heartPersistence.ts to get current user ID for Supabase writes. Anonymous users: `user_id = null`.

### No existing tests

There is no test runner installed. Adding Vitest is in scope per Task 4. Install with: `npm install -D vitest @vitest/ui`.

