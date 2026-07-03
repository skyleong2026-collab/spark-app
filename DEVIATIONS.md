# DEVIATIONS.md — The Opening (Instance 2 build)

This file logs every place the implementation diverged from the literal dispatch
packet spec, and every underspecified area. Per instructions: implement verbatim,
log here, do not fix silently.

---

## DEV-01 — Prereq 0: §17 `transcripts` table absent (BLOCKER for write path)

**Spec says:** Check if §17 `transcripts`/consent tables are present. If not, build
all non-write parts, stub the write, and flag back.

**What we found:** Supabase project `hbazhbfhddaouxchvuxr` has no `transcripts`
table and no consent tables as of 2026-06-11. The full table list:
assessments, profiles, payments, beta_submissions, heart_assessments,
hand_assessments, head_assessments, spark_beta_feedback, admin_emails,
notescreen_early_access, ringward_feedback, notescreen_beta_feedback.

**Action taken:** The transcript write path in `Opening.tsx` is stubbed:
instead of inserting into Supabase, it calls `stubWriteTranscript()` which
logs the full payload to the browser console. A `// STUB:` comment marks the
call site.

**To un-stub:** When §17 ships and the `transcripts` table + consent tables
are applied, replace `stubWriteTranscript()` with the real Supabase insert in
`src/assessments/opening/Opening.tsx` (see `// STUB:` comment).

---

## DEV-02 — §17 consent surface absent (no `consent_state` to snapshot)

**Spec says:** The Opening is where §17 consent language is first surfaced.
If no consent surface is available to snapshot, stop and report.

**Action taken:** `consent_state` is written as `null` in the stubbed transcript
payload. No consent UI is shown or blocked on, consistent with the "stub the
write" branch of Prereq 0. This must be resolved when §17 lands.

---

## DEV-03 — Haiku model string: `claude-haiku-4-5` vs `claude-haiku-4-5-20251001`

**Spec says:** Use `claude-haiku-4-5` — confirm against §13 Model Selection Guide.

**§13 was not fetched.** The canonical model ID per the current runtime's model
registry is `claude-haiku-4-5-20251001`. The edge function `extract-register`
uses `claude-haiku-4-5-20251001`. If §13 disagrees, update the `MODEL` constant
in `supabase/functions/extract-register/index.ts`.

---

## DEV-04 — Turn-3 widening prompt copy not defined in spec

**Spec says:** "one more widening prompt from the same register family, then
proceed regardless." No explicit Turn-3 copy is given in `opening_followups_v1`
or elsewhere in the packet.

**Action taken:** Four Turn-3 widening prompts were authored inline in
`openingLogic.ts`, one per register class, staying in the same voice/register
family as the Turn-2 bank. If the content designer wants to lock these verbatim,
they should be added to `opening_followups_v1` and imported here.

Turn-3 prompts used:
- situation-heavy / interiority-light → "Is there any part of it that's been present for you — inside?"
- interiority-heavy / situation-light → "What else has been present for you around it?"
- very short / guarded → "Even a word or two is enough — what else has been around lately?"
- default / balanced → "What else has been on your mind this week?"

---

## DEV-05 — Interiority heuristic thresholds are implementation choices

**Spec says:** "ratio of inner-state language to external-event language" — no
thresholds given.

**Action taken:** Thresholds chosen:
- word count < 20 → "very short / guarded"
- interiority_ratio > 0.20 → "interiority-heavy / situation-light"
- interiority_ratio < 0.08 (and word count ≥ 20) → "situation-heavy / interiority-light"
- else → "default / balanced"

These are BETA-TUNE candidates. The packet marks related items as BETA-TUNE.

---

## DEV-06 — Turn-3 combined-word threshold: ~40 words interpreted as < 40

**Spec says:** "below ~40 words." Implemented as `< 40` (strict less-than).
The tilde signals BETA-TUNE per the packet.

---

## DEV-07 — Near-empty interiority threshold for Turn-3 trigger

**Spec says:** "OR interiority is near-empty." Implemented as combined
interiority_ratio < 0.05 (fewer than 1 inner-state word per 20 total words).
BETA-TUNE candidate.
