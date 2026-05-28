// HEART Confirmation Pairs — v2 (LOCKED 2026-05-19)
// 4 active pairs: same-stance, fires on thin center margin.
// Retired pairs (1|8, 2|3, 5|6, 2|9): Stage 1 now handles cross-stance ambiguity.
// Trigger B (opt-in) deferred to Heart v2.1.

import type { ConfusablePair, ConfirmationPairEntry } from './heartTypes';

export const CONFIRMATION_PAIRS: Record<ConfusablePair, ConfirmationPairEntry> = {
  // PAIR 1|6 — Dependent: Body vs Head
  '1|6': {
    stem: "Something you decided didn't work out the way you expected. When you go back over it, what does the revisiting mostly involve?",
    optionA: {
      type: 1,
      text: "There's a difference in your mind between the reasoning being wrong and the outcome being wrong. You're going back to find out which it is — not to manage the fallout, but because that distinction actually matters to you. If what you decided was genuinely correct and it still didn't work, you can put it down. If the reasoning was off, that's what stays — not the consequence of it, but the fact of it.",
    },
    optionB: {
      type: 6,
      text: "You're less focused on whether the conclusion was right than on whether you had enough to go on. The thing that's hard to put down isn't being wrong — it's the possibility that you moved on insufficient ground, without the input or checks that would have caught what you couldn't see alone. If you had solid basis and still missed it, that's something you can accept. What's harder is the question of whether the basis was there at all.",
    },
    resultCopy: {
      shared: "Both Type 1 and Type 6 share a Dependent orientation — the way you look outside yourself to check your position.",
      forA: "What distinguished the read was that you're more concerned with whether the reasoning itself was sound than with whether you had adequate support around you.",
      forB: "What distinguished the read was that you're more concerned with whether you had enough to go on — solid enough ground, adequate input — than with whether the conclusion itself was logically correct.",
    },
  },

  // PAIR 3|7 — Assertive: Heart vs Head
  '3|7': {
    stem: "Something significant in your life just finished — a project, a role, a period you were deeply in. It went well. When you notice how you're sitting with it being over, what's most accurate?",
    optionA: {
      type: 3,
      text: "There's a moment where it lands — where you can feel that you showed up the way you needed to, that the thing holds up. That moment is real and it matters. But it doesn't stay open long, and what follows it is a particular kind of unsteadiness — not grief, not restlessness exactly, but something closer to being unlocated. While you were in it, you knew what you were; the role made that legible. In the gap after, before something else has started, that clarity goes quiet in a way that's hard to just wait through.",
    },
    optionB: {
      type: 7,
      text: "There's something that happens at the end of something good that you've learned to recognize — a particular kind of closing. Not loss of the thing itself, but something more specific: the possibilities that were still alive inside it are now resolved. While you were in it, the future inside that context was still open — multiple directions still possible, the story not yet written. Completion collapses that. What you notice yourself doing almost immediately is tracking what hasn't closed yet, what's still in motion somewhere ahead — not to escape what just ended, but because the forward possibility is where the energy actually runs.",
    },
    resultCopy: {
      shared: "Both Type 3 and Type 7 share an Assertive orientation — moving forward, maintaining momentum.",
      forA: "What distinguished the read was how completion lands: for you, finishing something removes a structure that made you legible to yourself, which creates a particular kind of pull toward what comes next.",
      forB: "What distinguished the read was that completion collapses possibility rather than removing a role — you're tracking what's still open ahead, not because you're avoiding what finished, but because that forward horizon is where energy actually runs.",
    },
  },

  // PAIR 4|5 — Withdrawn: Heart vs Head
  '4|5': {
    stem: "Something significant happened — a conversation, a loss, an encounter that carried real weight. Some time has passed. You've had space to sit with it. What does the process of settling into it actually look like?",
    optionA: {
      type: 4,
      text: "Settling isn't really about understanding what happened. It's about whether it landed at the depth it deserved — whether you were actually there for it, whether you let it mean what it meant without managing it into something more acceptable. What keeps it unresolved isn't confusion about the facts. It's a sense that something important didn't fully get met — either by the situation, or by the other person, or by you. When it does settle, it's because the experience finally feels real in the way significant things should feel real — not managed into something more acceptable, not explained into something more comfortable. Still there, but its own weight.",
    },
    optionB: {
      type: 5,
      text: "Settling is something like when it can finally stay in view without effort. Not because the emotion is gone — but because the experience no longer feels structurally open. Something that was loose and requiring ongoing attention has found a place, and you can sense it holding. While it's still open, there's a particular kind of incompleteness: something about it doesn't yet have a place, or the picture isn't whole, or there's a piece you haven't quite seen yet. When the frame comes — when you can place it, understand what kind of thing it was, see how it fits — something releases. It doesn't have to stop mattering. It just has to make sense enough to be held without the ongoing effort of keeping it in view.",
    },
    resultCopy: {
      shared: "Both Type 4 and Type 5 share a Withdrawn orientation — turning inward, processing internally.",
      forA: "What distinguished the read was that settling requires the experience to land at its actual depth, not just to be placed and understood.",
      forB: "What distinguished the read was that settling is about structural completion — when the experience has a frame, makes sense, can be held without ongoing effort.",
    },
  },

  // PAIR 4|9 — Withdrawn: Heart vs Body
  '4|9': {
    stem: "You've been around people for an extended stretch — a trip, a gathering, a period with more sustained contact than usual. You're finally alone. What's most accurate about what the solitude is doing?",
    optionA: {
      type: 4,
      text: "What you're recovering is something like precision. Not energy — the issue isn't exhaustion. It's that in sustained company, your experience gradually loses its exact shape. Things that register one way for you get absorbed into shared versions — you respond to the room, to what's being felt collectively, to what the moment calls for — and somewhere in that, what was specifically yours becomes harder to locate. The solitude gives it back. Not by doing anything, but by removing the pressure that was flattening it. What returns is something more precise than energy — the way things actually land for you, in their particular weight, before time with other people had blurred the edges of it.",
    },
    optionB: {
      type: 9,
      text: "What registers first is the absence of pull. Extended time with people — even easy, good time — accumulates a low-level demand: something is always requiring a response, an orientation, a small continual expenditure of attention. You're not usually aware of it while it's happening. But alone, it starts to lift, and you can feel it going. What you're moving toward isn't a particular state. It's the place where nothing requires your attention in that particular way. When you get there — and you can tell when you do — it's not because something arrived. It's because the effort of continual small orientation finally stopped.",
    },
    resultCopy: {
      shared: "Both Type 4 and Type 9 share a Withdrawn orientation.",
      forA: "What distinguished the read was that solitude recovers experiential precision — returning to the specific way things actually land for you before social absorption blurred the edges.",
      forB: "What distinguished the read was that solitude releases orientational demand — the low-level pull that comes from sustained contact, finally lifting.",
    },
  },
};
