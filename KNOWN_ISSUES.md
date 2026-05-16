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

### src/pages/Results.jsx

| Line | Issue |
|------|-------|
| 7-16 | `HEART_DESC` keyed by v1 names (`Conviction`, `Devotion`, etc.). `HEART_DESC[heartType]` returns `undefined` since `heartType` is now integer 1-9. |
| 290 | `localStorage.setItem('spark_heart', heartType)` — stores integer. Downstream readers expected a string name. |
| 314 | `<ResultCard typeName={heartType} desc={HEART_DESC[heartType]} .../>` — shows `1` instead of `Conviction`, desc is undefined. |
| 345 | `typeName={heartType}` — displays integer instead of name. |
| 346 | `confidence={heartResult?.confidence}` — v2 shape has `final_confidence`, not `confidence`. Returns `undefined`. |
| 347 | `softSecondary={heartResult?.softSecondary}` — v2 has `final_secondary`, not `softSecondary`. Returns `undefined`. |
| 348 | `heartResult?.softSecondary ? HEART_DESC[heartResult.softSecondary] : null` — double miss: wrong field name, wrong key type. |
| 349 | `isShameTriad={['Devotion','Longing','Ambition'].includes(heartType)}` — string array vs integer, always false. Should be `[2,3,4].includes(heartType)`. |
| 390 | Displays `heartType` inline — shows `1` instead of `Conviction`. |
| 436 | Displays `heartType` in profile summary — same issue. |

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

### src/pages/SignIn.jsx

| Line | Issue |
|------|-------|
| 22 | `resultType: heartType` inserted into `assessments.result_type` — now integer, column may expect text. |
| 40 | `profileData.heart_type = heartType` — writes integer to `profiles.heart_type`, may expect text. |
| 41 | `heartResult?.confidence` — v2 shape has `final_confidence`, not `confidence`. Returns `undefined`. |

## Phase 5: Auth handoff

### supabase/migrations/20260418120000_heart_assessments_v2.sql (RLS policies)

| Policy | Issue |
|--------|-------|
| `heart_assessments_select_own` | Over-permissive for anonymous rows: `user_id IS NULL` clause lets any authenticated user read all anonymous rows, not just their own session. Acceptable for now since anon rows contain no PII beyond responses, but should be tightened when auth handoff is implemented. |
| (missing) | No policy for claiming anonymous rows. `heart_assessments_update_own` requires `user_id = auth.uid()`, so `associateSessionWithUser()` will fail on rows where `user_id IS NULL`. Needs a dedicated claim policy gated by session token or row ID ownership. |
