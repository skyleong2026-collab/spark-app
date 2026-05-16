# SPARK Master Reference — Section 4: Head Assessment

**Status:** Reference material for Phase 3 (Head decoupling). Not yet converted to an implementation spec. Do not implement from this document directly — wait for PHASE_3_SPEC.md.

---

## Architecture Overview

The Head assessment identifies cognitive processing style through Jungian cognitive function theory. It measures which functions dominate information-gathering (perceiving) and decision-making (judging), producing a two-function "stack" that describes how the person habitually processes.

### Theoretical grounding

The assessment is based on Carl Jung's *Psychological Types* (1921), which is in the public domain. Jung identified eight cognitive functions organized along two axes:

**Perceiving functions (information-gathering):**

- **Ne** — Extraverted Intuition: generating possibilities outward, seeing branching connections and what could be
- **Ni** — Introverted Intuition: narrowing toward singular insight, seeing underlying patterns and meaning
- **Se** — Extraverted Sensing: engaging with immediate sensory reality, responding to what's present now
- **Si** — Introverted Sensing: referencing stored experience, recognizing what's familiar and proven

**Judging functions (decision-making):**

- **Te** — Extraverted Thinking: organizing external systems for efficiency and outcomes
- **Ti** — Introverted Thinking: refining internal logical consistency and precision
- **Fe** — Extraverted Feeling: tuning to group harmony, social atmosphere, relational impact
- **Fi** — Introverted Feeling: anchoring in personal values and individual authenticity

### Function stacks

Each person has a dominant function (highest, most automatic) and an auxiliary function (second-highest, supporting role). The dominant and auxiliary must be:

- One perceiving and one judging (one from each axis)
- Opposite orientations (if dominant is introverted, auxiliary is extraverted, and vice versa)

This produces 16 possible function stacks. These correspond to what popular typology calls the 16 "MBTI types," but SPARK does not use four-letter codes or Myers-Briggs terminology — these are trademark-protected.

### Function stack notation

SPARK uses the notation `dominant-auxiliary` (e.g., Ni-Te, Ne-Fi, Si-Fe). This directly describes the cognitive pattern without invoking MBTI branding.

**The 16 stacks:**

| Dominant | Auxiliary | Popular equivalent (internal reference only) |
|----------|-----------|----------------------------------------------|
| Ni | Te | INTJ |
| Ni | Fe | INFJ |
| Ne | Ti | ENTP |
| Ne | Fi | ENFP |
| Ti | Ne | INTP |
| Ti | Se | ISTP |
| Te | Ni | ENTJ |
| Te | Si | ESTJ |
| Fi | Ne | INFP |
| Fi | Se | ISFP |
| Fe | Ni | ENFJ |
| Fe | Si | ESFJ |
| Si | Te | ISTJ |
| Si | Fe | ISFJ |
| Se | Ti | ESTP |
| Se | Fi | ESFP |

*Note: the popular-equivalent column is for internal reference and debugging only. It does not appear in any user-facing content, code variable names, or marketing.*

### Assessment independence

The Head assessment is fully decoupled from Heart. There is no adaptive framing based on Heart result. Questions use neutral scenarios that don't depend on the user's Enneagram type. This eliminates the error propagation problem present in the prior architecture.

### Path branching

The Head assessment has two paths, selected by the user at the start based on their current state:

- **Path A (Clear state):** "You feel relatively steady, clear, and like yourself." 11 questions. Identifies dominant and auxiliary through direct function preference.
- **Path B (Stress state):** "You feel overwhelmed, reactive, or not like yourself." 3 questions. Identifies type through inferior-function stress patterns (the least-developed function, which expresses distinctively under stress).

The path branching exists because a stressed person cannot accurately self-report on baseline processing, and a calm person cannot accurately remember stress patterns. Each path measures through the state the person is actually in.

---

## Measurement Format

Binary paired comparison throughout both paths, with one exception: Path B's first question uses an 8-option format because inferior-function stress patterns are behaviorally distinct enough to warrant direct recognition rather than pairwise discrimination.

### Why binary for Head

Unlike Heart (where dimensional constructs benefit from frequency rating), cognitive functions are relatively discrete constructs. A person either leads with narrowing-toward-insight (Ni) or branching-toward-possibilities (Ne) — forced choice captures this well. Redundant pairs within each function axis control for noise.

### Why 8-option for Path B Q1

Inferior-function stress patterns have distinct behavioral signatures (impulsivity vs. rigidity vs. blunt control, etc.). When a person is in stress, self-recognition of their stress pattern from a list is more reliable than binary discrimination between abstract processing styles. The 8 options correspond to the 8 possible inferior functions.

---

## Path A — Clear State (11 Questions)

### Opening instruction (shown before Path A begins)

> "Answer based on how you naturally process when you're functioning well — not stressed, not overwhelmed, not performing. Think about the you that shows up on a normal day when things are going reasonably well."

### Pre-filter: Perceiving vs. Judging orientation (4 pairs)

The pre-filter determines whether the person leads with a perceiving function (Ne, Ni, Se, or Si) or a judging function (Te, Ti, Fe, or Fi). This sets which branch of questions follows.

**Q1 (PF1):**
- A. I naturally stay open and take things in as they come.
- B. I naturally move toward decisions and conclusions.

**Q2 (PF2):**
- A. I like keeping possibilities open and seeing what emerges.
- B. I like settling on a direction and acting on it.

**Q3 (PF3):**
- A. I spend more time observing, exploring, and noticing.
- B. I spend more time organizing, deciding, and structuring.

**Q4 (PF4):**
- A. I prefer things to stay flexible and adjustable.
- B. I prefer things to reach clarity and resolution.

**Scoring:**
- Count A responses (Perceiving-leading) and B responses (Judging-leading) across Q1–Q4
- Majority A (3 or 4 A's) → Perceiving branch, proceed to Perceiving Branch Q5–Q8
- Majority B (3 or 4 B's) → Judging branch, proceed to Judging Branch Q5–Q8
- 2-2 tie: score both branches in parallel (Q5–Q8 answered once, scored against both Perceiving function pairs and Judging function pairs); use the branch with higher internal consistency as the final branch

### Perceiving Branch (Q5–Q8)

Shown when Q1–Q4 resolves to Perceiving-leading.

**Q5 — Se vs. Si:**
- A. My attention goes to what's happening right now — the immediate, the actual, what's in front of me.
- B. My attention goes to what's familiar — past experience, learned patterns, what I've seen before.

**Q6 — Ne vs. Ni:**
- A. When I think about a situation, my mind generates multiple possibilities and angles.
- B. When I think about a situation, my mind narrows toward a single underlying meaning or insight.

**Q7 — Se vs. Si redundancy:**
- A. I trust what I can directly perceive in the moment.
- B. I trust what I've learned works from prior experience.

**Q8 — Ne vs. Ni redundancy:**
- A. I enjoy exploring many ideas without needing to commit to one.
- B. I prefer following one idea deeply until its meaning becomes clear.

**Scoring Perceiving Branch:**
- Se score = Q5A + Q7A
- Si score = Q5B + Q7B
- Ne score = Q6A + Q8A
- Ni score = Q6B + Q8B
- Dominant Perceiving function = highest-scoring function among Se, Si, Ne, Ni (range 0–2 per function)
- Ties (e.g., Se=1 and Si=1): use the branch-level pattern from Q1–Q4 as tiebreaker — higher Perceiving margin favors extraverted P function; lower margin favors introverted P function

### Judging Branch (Q5–Q8)

Shown when Q1–Q4 resolves to Judging-leading.

**Q5 — Te vs. Ti:**
- A. I evaluate decisions by what works — what produces results in the world.
- B. I evaluate decisions by what makes sense — what's internally consistent and precise.

**Q6 — Fe vs. Fi:**
- A. I evaluate decisions by what maintains connection and considers people.
- B. I evaluate decisions by what stays true to what I personally value.

**Q7 — Te vs. Ti redundancy:**
- A. I organize things to function efficiently and produce outcomes.
- B. I refine things until they're logically sound.

**Q8 — Fe vs. Fi redundancy:**
- A. I adjust based on what the people and situation need.
- B. I stay anchored in what I personally believe is right.

**Scoring Judging Branch:**
- Te score = Q5A + Q7A
- Ti score = Q5B + Q7B
- Fe score = Q6A + Q8A
- Fi score = Q6B + Q8B
- Dominant Judging function = highest-scoring function among Te, Ti, Fe, Fi (range 0–2 per function)
- Ties: use the branch-level pattern from Q1–Q4 as tiebreaker — higher Judging margin favors extraverted J function; lower margin favors introverted J function

### Q9 — Orientation (Extraversion vs. Introversion)

**Q9a:**
- A. My attention is naturally pulled outward — I process by engaging with the world around me.
- B. My attention is naturally pulled inward — I process by working things through in my mind.

**Q9b (redundancy):**
- A. When I have a new idea or problem, I want to talk it through or try it out in the real world.
- B. When I have a new idea or problem, I want to sit with it and think it through before acting.

**Scoring orientation:**
- Both A → Extraverted orientation (High orientation confidence)
- Both B → Introverted orientation (High orientation confidence)
- Split (one A, one B) → use majority pattern from branch-level scoring as tiebreaker; flag as Moderate orientation confidence

### Q10 — Auxiliary discriminator

The auxiliary question is determined by the branch (Perceiving or Judging), not by orientation. The orientation of the auxiliary is determined by the stacking rules (opposite orientation to dominant).

**If Perceiving branch (dominant is Ne, Ni, Se, or Si):**
The auxiliary is a judging function. The question is: Thinking auxiliary or Feeling auxiliary?

- A. When I need to move from perceiving to deciding, I support my thinking with logical analysis and structured evaluation.
- B. When I need to move from perceiving to deciding, I support my thinking by considering people and personal values.

A → auxiliary is Te or Ti; B → auxiliary is Fe or Fi.
Specific auxiliary resolves through stacking rules (opposite orientation to dominant).

**If Judging branch (dominant is Te, Ti, Fe, or Fi):**
The auxiliary is a perceiving function. The question is: Extraverted-Perceiving auxiliary (Ne or Se) or Introverted-Perceiving auxiliary (Ni or Si)?

- A. When I support my decisions, I draw from staying open to possibilities and new information.
- B. When I support my decisions, I draw from clear insights or established patterns I've already worked out.

A → auxiliary is Ne or Se; B → auxiliary is Ni or Si.
Specific auxiliary resolves through stacking rules (opposite orientation to dominant, and intuitive-vs-sensing matched to the A/B pattern).

### Backend stacking rules

Once dominant function and auxiliary axis are identified, the full stack is determined by applying Jungian stacking constraints:

- Dominant and auxiliary must be one perceiving + one judging
- Dominant and auxiliary must have opposite orientations (E/I)
- Auxiliary function cannot equal dominant function (validate)
- User's measured E/I orientation must match dominant function's orientation (validate; flag inconsistency)

If any stacking constraint is violated, flag for confirmation step.

### Type resolution

Dominant function + auxiliary function → one of 16 stacks. Map to stack notation (e.g., "Ni-Te dominant").

---

## Path B — Stress State (3 Questions)

### Opening instruction

> "Think of recent times when you've felt overwhelmed, reactive, or not like yourself. Answer based on that state, not your baseline."

### Q1 — Inferior function identification (8 options)

**Prompt:** "When you're overwhelmed or not functioning well, which of these fits what happens to you most often?"

- **A.** I act impulsively, chase stimulation, or push my body past what it should do — I try to out-do or out-experience the overwhelm.
  → Se inferior (dominant is Ni; type Ni-Te or Ni-Fe)
- **B.** I feel stuck in routine, trapped by what's familiar, unable to break out even when I know I should.
  → Si inferior (dominant is Ne; type Ne-Ti or Ne-Fi)
- **C.** My mind jumps between possibilities without landing — I lose direction and can't settle on what matters.
  → Ne inferior (dominant is Si; type Si-Te or Si-Fe)
- **D.** I fixate on predicting exactly what will happen, running scenarios until I'm exhausted and still haven't moved.
  → Ni inferior (dominant is Se; type Se-Ti or Se-Fi)
- **E.** I become blunt, controlling, or results-focused in ways that surprise me — I push for outcomes and bulldoze over nuance.
  → Te inferior (dominant is Fi; type Fi-Ne or Fi-Se)
- **F.** I rigidly fixate on one thought or interpretation and can't see past it — my thinking locks up around a single frame.
  → Ti inferior (dominant is Fe; type Fe-Ni or Fe-Si)
- **G.** I become emotionally sharp or cutting in ways that feel off-character — my feelings come out in ways that surprise me and others.
  → Fe inferior (dominant is Ti; type Ti-Ne or Ti-Se)
- **H.** My emotions build up until I have to pour them out — I need to express what I'm feeling and I can't hold it in anymore.
  → Fi inferior (dominant is Te; type Te-Ni or Te-Si)

### Q2 — Confirmation

**Prompt:** "Does the pattern you chose feel like an accurate description of how you get when you're not okay?"

- A. Yes, that's specifically what happens to me.
- B. It's close, but something about it feels off.

A → High Path B confidence, proceed to Q3
B → Moderate Path B confidence, proceed to Q3 but flag for confirmation step

### Q3 — Auxiliary discriminator

Q1's inferior identification narrows the type to one of two possibilities (each inferior function corresponds to two types — the two that share that dominant, differing in auxiliary).

The Q3 wording is determined by which pair needs discriminating. The question form follows the same structure as Path A Q10 — testing whether the auxiliary is Thinking vs. Feeling (for Perceiving-dominant types) or Extraverted-P vs. Introverted-P (for Judging-dominant types).

**Example — if Q1 answer was A (Se inferior → Ni-Te or Ni-Fe):**
- A. I support my insights with logical analysis and results-oriented action.
- B. I support my insights with attention to people and relational impact.

A → Ni-Te; B → Ni-Fe

**Example — if Q1 answer was H (Fi inferior → Te-Ni or Te-Si):**
- A. I make decisions by reading underlying patterns and insights about what will work.
- B. I make decisions by drawing on what I've learned works from past experience.

A → Te-Ni; B → Te-Si

(Eight Q3 variants needed, one per Q1 inferior identification. Architecture instance builds the Q3 question dynamically based on Q1 response.)

---

## Scoring Logic

### Path A scoring

1. Branch determination from Q1–Q4 (pre-filter)
2. Dominant function identification from Q5–Q8 within the active branch
3. Orientation determination from Q9a and Q9b
4. Auxiliary axis determination from Q10
5. Full stack resolution through backend stacking rules
6. Validation: auxiliary ≠ dominant; orientation matches dominant function's orientation

### Path B scoring

1. Inferior function identification from Q1
2. Confirmation from Q2
3. Auxiliary discrimination from Q3
4. Full stack resolution: inferior function + confirmed auxiliary determines dominant (the function opposite the inferior) and full stack

### Cross-path considerations

If a user completes Path A and then later retakes via Path B (or vice versa), the system should store both results and flag inconsistency if they disagree. Disagreement between paths is a strong Low-confidence signal and should trigger the confirmation step.

---

## Confidence Rules

### Path A confidence

Three components: branch confidence, dominant function confidence, orientation confidence.

**Branch confidence (from Q1–Q4):**
- 4-0 split → High
- 3-1 split → Moderate
- 2-2 split → Low (both branches scored in parallel)

**Dominant function confidence (within branch):**
- Function score 2/2 (both items pointed same direction) → High
- Function score 1/2 with clear second-place loser → Moderate
- Ties → Low

**Orientation confidence (from Q9a and Q9b):**
- Both items agree → High
- Items split → Moderate

**Path A overall confidence** = minimum of (branch confidence, dominant function confidence, orientation confidence).

### Path B confidence

- Q2 = A ("specifically what happens to me") → High Path B confidence
- Q2 = B ("close but something feels off") → Moderate Path B confidence

### Type-pair difficulty weighting

Certain function stacks are known to be commonly confused even with clean measurement. When the primary and secondary candidates from scoring fall into a known-confusable pair, reduce overall confidence by one level (High → Moderate, Moderate → Low).

**Known-confusable pairs:**
- Ni-Te / Ni-Fe (both Ni-dominant introverts)
- Ne-Ti / Ne-Fi (both Ne-dominant)
- Ni-Fe / Si-Fe (both Fe-auxiliary, can look similar in interpersonal style)
- Ne-Fi / Si-Fi (both Fi-auxiliary, can look similar in value expression)

### User-facing confidence language (not labels)

Same convention as Heart and Hand:

- **High:** No qualifier, clean result.
- **Moderate:** "Your results suggest [primary stack] with some characteristics of [secondary stack]."
- **Low:** "Your responses reflect a genuine blend between [primary] and [secondary] — more nuanced than a single cognitive profile."

Tier 3 (clinical) users see the actual confidence labels and sub-component margins.

---

## Confirmation Step — Trigger Logic

### Trigger conditions

The Head confirmation step fires when any of these conditions are met:

1. Overall Head confidence is Moderate or Low
2. The secondary function stack is a known look-alike of the primary stack (see confusable pair list)
3. Path A resulted in orientation inconsistency (Q9a and Q9b disagreed)
4. Path B Q2 was answered B (close but something feels off)
5. Backend stacking validation failed (auxiliary = dominant, or orientation mismatch)

The confirmation step does not fire when overall confidence is High AND none of conditions 3–5 are true.

### Post-confirmation scoring

- Confirmation agrees with algorithm → Final Head confidence = High
- Confirmation disagrees with algorithm → Flag as genuine ambiguity, return both stacks with "sit with this" framing
- User can't tell which description fits → Low confidence, surface retake pathway

---

## Confirmation Pair Descriptions

Each pair shows two unlabeled paragraphs. User selects which processing pattern fits their actual experience more consistently.

### Pair Ni-Te / Ni-Fe

**Pattern A (Ni-Te):** You process by narrowing toward a single underlying insight — the one framework that explains what's actually going on. Once that insight is clear, you evaluate it against what works, what produces results, what holds up under pressure. You organize your thinking around outcomes and systems more than around people's reactions. You're willing to be wrong about an insight if the evidence doesn't support it, but you don't revise easily based on social feedback alone. Your frustration runs high when inefficient processes or fuzzy thinking get in the way of what needs to happen.

**Pattern B (Ni-Fe):** You process by narrowing toward a single underlying insight — the one pattern that explains what's actually going on. Once that insight is clear, you evaluate it through its impact on people — how it will land, who it affects, whether it honors what matters to the group. You're tuned to emotional atmosphere and adjust your expression accordingly, though you hold your actual insight privately. You revise your insight when it's out of step with what's humanly true more than when it's out of step with what's externally efficient. Your frustration runs high when people's authentic needs are being missed or dismissed.

### Pair Ne-Ti / Ne-Fi

**Pattern A (Ne-Ti):** You process by generating multiple possibilities, then testing them against internal logic and consistency. Your mind branches outward toward ideas and then comes back to check whether each one actually makes sense. You enjoy finding the flaw in an argument, including your own. Precision matters to you — not because you're pedantic, but because sloppy thinking produces unreliable conclusions. You can explore an idea for its intellectual interest without needing it to serve a purpose. You trust analysis more than you trust feelings — including about yourself.

**Pattern B (Ne-Fi):** You process by generating multiple possibilities, then testing them against internal values and what feels authentic. Your mind branches outward toward ideas and then comes back to check whether each one honors what matters to you personally. You enjoy exploring meaning — why something matters, what it means for people. You can explore an idea deeply as long as it connects to something that feels true. When something violates your values, you feel it sharply and clearly, even if you don't always express it. You trust your sense of what's right more than you trust external logic.

### Pair Ni-Fe / Si-Fe

**Pattern A (Ni-Fe):** Your primary way of making sense of things is by narrowing toward an underlying pattern or insight — what the situation really means beneath the surface. You then express that insight in a way that considers people and atmosphere, but the insight itself comes first and privately. You trust internal pattern recognition over past experience. You can arrive at conclusions others haven't articulated yet and sometimes have trouble explaining how you got there. Novelty and depth appeal to you more than familiarity.

**Pattern B (Si-Fe):** Your primary way of making sense of things is by referencing what you've experienced before — what you've learned works, what's familiar, what's been established over time. You then express that knowledge in ways that consider people and maintain connection. You trust lived experience and precedent over abstract pattern-matching. You can arrive at conclusions carefully, building on what you already know. Reliability, continuity, and care for people appeal to you more than conceptual novelty.

### Pair Ne-Fi / Si-Fi

**Pattern A (Ne-Fi):** You process by exploring possibilities outward — generating options, connections, what-ifs — and evaluating them against your personal values. Your mind is future-oriented and associative; you see how one thing connects to another in unexpected ways. You're drawn to what could be more than to what has been. Your values feel current and alive, generated fresh through what each situation reveals. You can get scattered across too many possibilities and have to pull yourself back to what matters.

**Pattern B (Si-Fi):** You process by referencing what you've experienced before — building on what you've learned, what's been reliable, what's proven itself over time — and evaluating against your personal values. Your mind is past-oriented and concrete; you trust what you've seen work. You're drawn to what's enduring and meaningful more than to what's novel. Your values feel rooted and stable, shaped over time through lived experience. You can get stuck in what's familiar and have to push yourself toward what's new.

---

## Item Presentation Logic

**Path A:**
- Q1–Q4 (pre-filter): Present in fixed order (not randomized). Sequence matters because users are building toward a branch decision; randomization here adds noise without benefit.
- Q5–Q8 (branch questions): Present in randomized order within the branch. A/B randomization within each pair (randomly assign which function appears as A vs. B).
- Q9a–Q9b (orientation): Present in fixed order (Q9a before Q9b).
- Q10 (auxiliary): Fixed position at end.

**Path B:**
- Q1 (inferior identification): Present the 8 options in randomized order (shuffle options A–H once per session). This prevents order bias in a list where order could anchor selection.
- Q2 (confirmation): Fixed order.
- Q3 (auxiliary discriminator): Fixed order. A/B randomization within the pair.

**Progress indicator:**
- Path A: "Question 7 of 11"
- Path B: "Question 2 of 3"

**Path selection screen:**
Present before any questions. Two options:
- "I feel relatively steady, clear, and like myself today." → Path A
- "I feel overwhelmed, reactive, or not like myself today." → Path B

Include a secondary option: "Not sure" → defaults to Path A with a note that Path B is better if stressed. Path A is the default because a mild stress state doesn't invalidate Path A measurement, but a calm state severely weakens Path B measurement.

---

## Data Schema (for Supabase migration)

Proposed structure for the `head_assessments` table:

- `id` — UUID primary key
- `user_id` — foreign key to users
- `session_id` — UUID for anonymous sessions
- `path_taken` — text enum: 'A', 'B'
- `responses` — JSONB, structure varies by path:
  - Path A: `{Q1: 'A', Q2: 'B', ..., Q10: 'A'}` with Q9a and Q9b as distinct keys
  - Path B: `{Q1: 'E', Q2: 'A', Q3: 'B'}`
- `branch` — text enum, nullable: 'perceiving', 'judging' (Path A only; null for Path B)
- `branch_scores` — JSONB, nullable: `{perceiving: 3, judging: 1}` (Path A only)
- `function_scores` — JSONB, structure varies:
  - Path A: `{Ne: 2, Ni: 0, Se: 1, Si: 1}` or `{Te: 2, Ti: 0, Fe: 1, Fi: 1}` depending on branch
  - Path B: inferior function directly identified from Q1
- `orientation` — text enum: 'E', 'I'
- `orientation_confidence` — text enum: 'high', 'moderate' (Path A); not applicable for Path B (derived)
- `dominant_function` — text (e.g., 'Ni', 'Ne', 'Te')
- `auxiliary_function` — text (e.g., 'Te', 'Fi', 'Ni')
- `function_stack` — text (e.g., 'Ni-Te', 'Ne-Fi')
- `secondary_stack` — text, nullable (e.g., 'Ni-Fe' as alternate candidate)
- `branch_confidence` — text enum, nullable: 'high', 'moderate', 'low' (Path A only)
- `function_confidence` — text enum: 'high', 'moderate', 'low'
- `overall_confidence` — text enum: 'high', 'moderate', 'low'
- `confirmation_triggered` — boolean
- `confirmation_pair` — text, nullable (e.g., 'Ni-Te/Ni-Fe'), identifies which pair was shown
- `confirmation_result` — text enum, nullable: 'agreed', 'disagreed', 'uncertain'
- `final_stack` — text, post-confirmation
- `final_confidence` — text enum: 'high', 'moderate', 'low'
- `randomization_seed` — integer, for debugging
- `completed_at` — timestamp

---

## Implementation Notes

### Critical implementation details

1. **Path A vs. Path B selection is user-driven.** Do not algorithmically assign. The path selection screen should make the distinction clear without loading either option with negative framing.
2. **Pre-filter scoring must complete before branch questions are shown.** This is a sequential measurement, not a batched one. Score Q1–Q4, determine branch, then present Q5–Q8 from the appropriate branch.
3. **2-2 tie handling on pre-filter:** Present Q5–Q8 for both branches (8 questions instead of 4). Score each branch separately. Use whichever branch produces higher internal consistency (clearer function score separation) as the final branch. Flag as Moderate branch confidence regardless of final function score.
4. **Q10 wording is branch-dependent.** The architecture instance must generate Q10 text dynamically based on the branch determined in Q1–Q4 (or both branch variants if tied).
5. **Q3 in Path B is Q1-dependent.** Architecture instance must generate Q3 dynamically based on which inferior function was identified in Q1. Eight possible Q3 variants.
6. **Backend stacking rules are validation layer, not scoring layer.** Score functions independently, then apply stacking constraints. If stacking constraints are violated (auxiliary = dominant, orientation mismatch), flag for confirmation rather than auto-correcting.
7. **Items are load-bearing.** Do not reword items without running changes past the content instance. Specific phrasing captures function distinctions that would be lost with paraphrasing.
8. **No adaptive framing based on Heart result.** This is deliberate architectural change from prior version. Head questions use neutral scenarios. Heart's result does not feed Head at the measurement layer — only at the synthesis layer.

### Integration with Heart and Hand results

Head results are independent of Heart and Hand — no adaptive framing, no cascading logic. Integration happens at the synthesis layer.

The synthesis prompt uses Heart + Head + Hand together to identify reinforcing patterns, tension patterns, and drift patterns. The Head result contributes the "how does the person process" layer — the operating system running on top of the Heart-level motivational core.

### Tier 1 output

Free-tier users see only their function stack name (e.g., "Ni-Te") with a one-sentence description from the pre-written Tier 1 sentences. No AI involved at the free tier.

### Tier 2+ output

Paid users see Head results integrated into the four-section synthesis: the "Processing Architecture" section names the function stack, describes how it handles information and decisions, and connects it to the user's Heart-level motivation.

### MBTI terminology exclusion

- Do NOT use MBTI or Myers-Briggs anywhere in code variable names, UI copy, marketing, or user-facing content
- Do NOT use four-letter codes (INTJ, ENFP, etc.) in user-facing content
- DO use function stack notation (Ni-Te, Ne-Fi) throughout
- Internal reference to MBTI equivalents is acceptable in developer comments for debugging/clarity only

---

## What the architecture instance needs to build (Phase 3)

- Path selection screen (Path A vs. Path B)
- Path A React component (11 questions with dynamic branching at Q5 based on Q1–Q4 pre-filter result)
- Path B React component (3 questions with dynamic Q3 based on Q1 inferior identification)
- Scoring engines for both paths, including stacking rule validation
- Orientation confidence calculation from Q9a/Q9b agreement
- Confirmation step component using the 4 confirmation pair descriptions
- Supabase schema migration for the `head_assessments` table
- Integration with the overall assessment flow (Heart → Head → Hand sequence)
