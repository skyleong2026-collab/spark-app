# Known Issues — Heart v2 Migration

Downstream breakages from Heart v2 (Stance x Center, integer types 1-9) replacing Heart v1 (proprietary string names). None are fixed in Phase 1. Grouped by the phase where they'll be addressed.

---

## Phase 2: Hand rebuild

No Heart-related breakages. Listed for completeness.

## Phase 3: Head rebuild

### src/pages/AssessmentHead.jsx

| Line | Issue |
|------|-------|
| 9 | `heartResult?.scenarioContext` — v2 HeartScoringResult has no `scenarioContext` field. Was a v1 concept (type mapped to inward/outward/bridge). Returns `undefined`, passed to Head assessment as `null`. |

## Phase 4: Synthesis migration + Results page rebuild

### src/pages/Results.jsx — ✅ RESOLVED (2026-06-05)

A `HEART_TYPE_NAMES` integer→name map was added and is now used at every
display site, and the confidence/secondary reads were switched to the v2
`HeartScoringResult` field names. Specifically:

- `HEART_DESC` is keyed by name and always looked up via `HEART_TYPE_NAMES[heartType]`, so descriptions resolve again.
- `ResultCard` / `ConfidenceCard` / synthesis type-line / locked-card / feedback-modal all render the type **name**, not the raw integer.
- `confidence` now reads `heartResult.final_confidence`; the soft secondary reads `heartResult.final_secondary` and maps it through `HEART_TYPE_NAMES` for both the label and its description.
- `isShameTriad` now compares `[2, 3, 4].includes(Number(heartType))`.

Note: `localStorage` still stores the integer Heart type (former line 290).
That is intentional — every reader maps through `HEART_TYPE_NAMES`, so no name
string is persisted.

### src/pages/admin/TestSynthesis.jsx

| Line | Issue |
|------|-------|
| 3 | `HEART_TYPES` array uses v1 names. Dropdown values are all strings. |
| 15 | `useState('Conviction')` — default state is a v1 name. |
| 40 | `heartType: heart` — sends v1 string to generate-synthesis edge function. |

### supabase/functions/generate-synthesis/index.ts

| Line | Issue |
|------|-------|
| 128-131 | `heartType: string` parameter; `heartDescriptions[heartType]` lookup keyed by v1 names. Returns `undefined` for integer input. |
| 144 | `Heart type: ${heartType}` in prompt — renders `Heart type: 1` instead of `Heart type: Conviction`. |
| 211, 218, 258 | `heartType` sourced from body param or `profile.heart_type` DB column — both now integers. |

### src/hooks/useSaveResults.js (Heart persistence moved here from SignIn.jsx)

| Line | Issue |
|------|-------|
| 33-38 | `result_type: heartType` inserted into `assessments.result_type` (text column) — heartType is a numeric string from storage, coerces fine. Not a defect in practice. |
| 55 | `profileData.heart_type = heartType` → `profiles.heart_type` is `text`; numeric-string value stores fine. Not a defect in practice. |
| 56 | ✅ RESOLVED (2026-06-05) — was `heartResult?.confidence` (always `undefined`); now reads `heartResult.final_confidence`, so `profiles.heart_confidence` (verified text column) is populated. |

## Phase 5: Auth handoff

### supabase/migrations/20260418120000_heart_assessments_v2.sql (RLS policies)

| Policy | Issue |
|--------|-------|
| `heart_assessments_select_own` | Over-permissive for anonymous rows: `user_id IS NULL` clause lets any authenticated user read all anonymous rows, not just their own session. Acceptable for now since anon rows contain no PII beyond responses, but should be tightened when auth handoff is implemented. |
| (missing) | No policy for claiming anonymous rows. `heart_assessments_update_own` requires `user_id = auth.uid()`, so `associateSessionWithUser()` will fail on rows where `user_id IS NULL`. Needs a dedicated claim policy gated by session token or row ID ownership. |
