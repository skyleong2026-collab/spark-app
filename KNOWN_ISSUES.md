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

### supabase/functions/generate-synthesis/index.ts — ✅ ALREADY RESOLVED IN PRODUCTION

⚠️ **Repo ↔ production drift.** The deployed function (version 22, live on
project `hbazhbfhddaouxchvuxr`) is substantially newer than the copy committed
in this repo. The deployed version already:
- maps the integer `profile.heart_type` → name via `HEART_TYPE_NAMES`
  (`5: Wonder, 6: Vigilance, 7: Anticipation`) in normal mode,
- adds confidence variants (`synthesis_high/moderate/low`), verbatim
  low-confidence reframes, and two-candidate handling (reads
  `heart_assessments.synthesis_variant` / `final_secondary`),
- runs on `claude-sonnet-4-6`.

The repo's `index.ts` lacks all of the above. **Do NOT redeploy the repo copy —
it would regress production.** Next step (separate task): pull the deployed
source back into the repo so the backup matches reality, then keep them in sync.

Direct mode (admin `TestSynthesis.jsx`) still passes the heart **name**
(e.g. `Conviction`), which the function handles correctly — so the admin console
needs no change. The names `Conviction`/`Wonder`/etc. are the current v2 SPARK
name layer, not v1 leftovers (the v2 change was that the *type key* became an
integer; the names are unchanged).

### src/pages/Results.jsx — Heart type 5/7 name swap — ✅ RESOLVED (2026-06-05)

`HEART_TYPE_NAMES` had types 5 and 7 swapped (`5: 'Anticipation', 7: 'Wonder'`),
so type-5 (The Investigator) and type-7 (The Enthusiast) users saw the wrong
name **and** description on the final results page. Corrected to
`5: 'Wonder', 7: 'Anticipation'`, matching the canonical source
(`heart/components/HeartResult.tsx`), the deployed synthesis function, and the
v1 reference.

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
| `heart_assessments_select_own` | ⏸ DEFERRED — Over-permissive for anonymous rows: the `user_id IS NULL` clause lets any authenticated user read all anonymous rows, not just their own session. **Cannot be naively tightened:** that clause is load-bearing for the anonymous save path — `persistFinalResultToSupabase()` does `.insert(...).select('id').single()`, and `INSERT … RETURNING` is gated by the SELECT policy, so dropping `user_id IS NULL` would break every signed-out result save (the client could no longer read back its own new row id). Properly scoping anon reads to a single session needs a session-token / signed-id mechanism; tracked as a separate design task. Anon rows carry no PII beyond responses, so the exposure is low in the interim. |
| `heart_assessments_claim_anonymous` | ✅ RESOLVED (2026-06-06) — Added the missing claim policy. Previously a signed-in user could not claim an anonymous row: `heart_assessments_update_own` requires `user_id = auth.uid()`, which never matches a `user_id IS NULL` row, so `associateSessionWithUser()` silently no-op'd (zero rows updated) and results never attached to the account. New additive policy (migration `20260606120000_heart_assessments_claim_policy.sql`): `for update to authenticated using (user_id is null) with check (user_id = auth.uid())`. Postgres OR-combines it with the existing update policy, so an authenticated user may claim a row that is theirs or anonymous, but the result must belong to them. Authorization is capability-based on the unguessable row id, matching the existing select posture. |
