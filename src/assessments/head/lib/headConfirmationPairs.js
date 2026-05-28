// HEAD Confirmation Pairs — Behavioral Rewrite (LOCKED 2026-05-19)
// All 6 pairs anchored in concrete behavioral situations.
// Shared opening text fires for all pairs (see HeadConfirmation component).
// Fire conditions: dom confirmed + aux split between the two candidates.
// Max 2 pairs per user (enforced in buildConfirmationPairs).

export const CONFIRMATION_PAIRS = {
  // PAIR 1 — INTJ vs INFJ (Ni-dom; Te vs Fe aux)
  'Ni-Fe|Ni-Te': {
    scenario: 'A project you care about is stalling because two people on it are in conflict with each other.',
    question: "You've been watching it long enough to know what's actually going on. What's your instinct for what needs to happen next?",
    patternA: {
      stack: 'Ni-Te',
      description: "The work needs to be restructured so the conflict stops mattering. Separate the dependencies, clarify who owns what, make it so they don't have to coordinate on the things that keep generating friction. The relationship between them isn't your problem to solve — the project's failure conditions are.",
    },
    patternB: {
      stack: 'Ni-Fe',
      description: "The relationship between them needs to move, even slightly, before the work can. If the tension between them isn't addressed, anything you build structurally just becomes the next battlefield. You find yourself thinking about what each of them actually needs from the other — not to fix it, but to get it functional enough that the work can breathe.",
    },
  },

  // PAIR 2 — ENTP vs ENFP (Ne-dom; Ti vs Fi aux)
  'Ne-Fi|Ne-Ti': {
    scenario: 'Someone you respect presents an argument for something you instinctively disagree with.',
    question: "What happens first, before you've decided how to respond?",
    patternA: {
      stack: 'Ne-Ti',
      description: "You're already finding the crack. Not to be difficult — you're genuinely interested in whether the argument holds. You start tracking where the reasoning depends on an assumption that might not be true, or where the conclusion is doing more work than the logic supports. If there's a flaw you'll find it, and finding it is interesting regardless of whether you end up agreeing.",
    },
    patternB: {
      stack: 'Ne-Fi',
      description: "You're checking it against something in yourself. The argument might be well-constructed but if it leads somewhere that doesn't sit right, the sophistication of the reasoning doesn't change that. You can feel the shape of your disagreement before you can articulate it — there's a place where it conflicts with something you hold, and you're oriented toward that place.",
    },
  },

  // PAIR 3 — ISFP vs INFP (Fi-dom; Se vs Ne aux)
  'Fi-Ne|Fi-Se': {
    scenario: "You're somewhere unfamiliar with no plan for the next few hours.",
    question: 'What naturally starts happening?',
    patternA: {
      stack: 'Fi-Se',
      description: "You start engaging with what's physically there. Wandering, trying things, noticing the atmosphere, getting absorbed in the actual texture of the place. The environment pulls your attention into it and you follow — not toward a destination, just into what's present.",
    },
    patternB: {
      stack: 'Fi-Ne',
      description: "The environment starts becoming associative. What you notice branches into ideas, moods, half-formed stories, possibilities you didn't come in with. You're physically somewhere but part of you is somewhere else — following a thread that opened up from what you saw or felt.",
    },
  },

  // PAIR 4 — ESTJ vs ENTJ (Te-dom; Si vs Ni aux)
  'Te-Ni|Te-Si': {
    scenario: "You're assessing whether to adopt a new approach that's getting a lot of attention in your field.",
    question: "What's your actual first instinct when you evaluate it?",
    patternA: {
      stack: 'Te-Si',
      description: "Whether it holds up against what you already know works. You have a strong read on what's proven — what the fundamentals are, what the track record shows — and your first move is to check this new thing against that baseline. If it can't demonstrate advantage over what's established, the buzz doesn't change your assessment.",
    },
    patternB: {
      stack: 'Te-Ni',
      description: "Whether it fits where things are heading. You're less interested in how it compares to current practice than in whether it positions you well for what's coming. If the field is moving in a direction this approach enables, that matters more than whether it outperforms what works today. Your first question is whether this fits where things are actually going — not whether it outperforms what's working right now.",
    },
  },

  // PAIR 5 — ISTP vs ISFP (Se-aux; Ti vs Fi dom)
  'Fi-Se|Ti-Se': {
    scenario: "You're working alongside someone who keeps making the same mistake.",
    question: "What's happening internally as you watch it happen again?",
    patternA: {
      stack: 'Ti-Se',
      description: "You've already mapped the error. You can see exactly where their process breaks down — which step is wrong, why it keeps producing the same result, what they'd need to change for it not to happen. Whether you say anything depends on context, but internally the analysis is running automatically. It's less about frustration and more about clarity.",
    },
    patternB: {
      stack: 'Fi-Se',
      description: "You start noticing things around the mistake that aren't strictly procedural — how the person carries it, whether they seem checked out, embarrassed, defensive, discouraged, unaware. The technical picture is clear enough, but something else is registering alongside it that the technical picture doesn't fully account for.",
    },
  },

  // PAIR 6 — ESFJ vs ENFJ (Fe-dom; Si vs Ni aux)
  'Fe-Ni|Fe-Si': {
    scenario: "Someone close to you is going through something difficult and you're trying to support them.",
    question: "What does your attention do when you're with them?",
    patternA: {
      stack: 'Fe-Si',
      description: "It goes to what you know about them. What's helped them before, what they've needed in situations like this, how this fits the pattern of who they are and how they tend to move through hard things. The history you have with them is active — you're drawing on it, not just being present.",
    },
    patternB: {
      stack: 'Fe-Ni',
      description: "It goes to where they're headed. Not the immediate pain — how this experience is likely to change them over time, and what kind of person they may be on the other side of it. You find yourself responding to that version of them without always meaning to, because that's where your sense of them lives.",
    },
  },
}
