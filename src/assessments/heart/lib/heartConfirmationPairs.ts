import type { ConfusablePair, ConfirmationPairEntry } from './heartTypes';

// HEART CONFIRMATION — TIER A (shipped, v2.0 + v2.1)
// Tier B confirmation pairs: DEFERRED to Heart v2.2
// Do not implement without explicit Jon sign-off and content from Instance 1.
// See SPARK Master Prompt → Heart Assessment v2 Content Package for scope.

export const CONFIRMATION_PAIRS: Record<ConfusablePair, ConfirmationPairEntry> = {
  '1|6': {
    patternA: {
      type: 1,
      description: "You hold yourself to a clear internal standard and feel the weight of it most of the time. When something falls short — your own work, someone else's behavior, a situation — you feel the gap sharply and can't quite let it go. Criticism lands hard because it confirms what you were already worried about. You often suppress irritation because expressing it feels unrefined, but it leaks out in tone or precision. You respect people who do things the right way.",
    },
    patternB: {
      type: 6,
      description: "You track what could go wrong and mentally rehearse responses to it. Your loyalty to people and systems runs deep, but it's paired with ongoing evaluation — can I actually trust this? You notice inconsistencies in authority figures quickly. Under stress, you either prepare more intensely or push back directly against what you're questioning. You respect people who've proven themselves reliable over time.",
    },
  },
  '2|9': {
    patternA: {
      type: 2,
      description: "You're highly attuned to what other people need, often before they've named it themselves. Your sense of worth is bound up in being helpful, warm, and wanted — and you feel it sharply when that role isn't recognized. You have needs of your own, but you often don't notice them clearly until they've built up. Saying no feels like a betrayal of who you are. When you feel unappreciated, you can become resentful or hurt in ways that surprise the people around you.",
    },
    patternB: {
      type: 9,
      description: "You adapt to what's happening around you almost automatically, often merging with other people's agendas before you've checked whether you want to. You have opinions and preferences, but they can be hard to locate in real time — they surface later, or under pressure. You avoid conflict not because you fear it exactly, but because engaging it feels like it would cost more energy than you have. Others often experience you as easygoing, then are surprised by how stubborn you become when pushed.",
    },
  },
  '3|7': {
    patternA: {
      type: 3,
      description: "You move toward goals with focus and efficiency, adjusting your presentation to match what the situation requires. Success isn't optional for you — it's load-bearing. You're skilled at reading what's valued in a given environment and becoming that. Underneath the performance, there's often a harder question you don't want to sit with: who are you when you're not achieving. You feel most uneasy when there's nothing to produce.",
    },
    patternB: {
      type: 7,
      description: "You move toward possibilities with energy and optimism, keeping options open and staying in motion. You're skilled at reframing — finding the interesting angle, the upside, the next thing. Sitting with pain, limitation, or boredom feels unbearable in a way that's hard to explain. You keep generating new plans partly because the generating itself is what keeps you okay. The deeper fear is that if you stopped moving, something would catch up with you.",
    },
  },
  '4|5': {
    patternA: {
      type: 4,
      description: "Your internal emotional world is vivid and often feels more real than the external one. You're aware of being different from others in a way that's both painful and defining — you don't want to lose it, even when it isolates you. You notice what's missing more easily than what's present. Longing is a familiar state. You can be fully engaged one moment and pulled away by an internal shift the next, and you often don't know why.",
    },
    patternB: {
      type: 5,
      description: "You protect your time, energy, and internal space carefully, and you feel it when something is being asked of you that you haven't agreed to. You'd rather observe than participate until you understand what's happening. Your competence is real but private — you don't like being watched while you figure things out. Emotional demands feel especially depleting. You'd rather engage with a complex idea than a complex feeling.",
    },
  },
  '4|9': {
    patternA: {
      type: 4,
      description: "You feel a specific kind of longing — for something lost, or something never quite found. Your emotional intensity is part of your identity, not just a weather pattern. You're drawn to depth, authenticity, and what's hidden. You resist being ordinary even when ordinary would be easier. When you feel unseen, it registers as an identity injury, not just a social frustration.",
    },
    patternB: {
      type: 9,
      description: "You feel a diffuse low-grade discomfort when things are in conflict or when your life feels pulled in too many directions. You're not reaching for something specific — you're trying to maintain an internal peace that gets disturbed by too much demand. You can lose hours or days to low-priority activity that feels restful but isn't actually restorative. When you feel pressured, you go quieter, slower, and more absent rather than more intense.",
    },
  },
  '5|6': {
    patternA: {
      type: 5,
      description: "You think carefully, systematically, and often alone. You want to understand something thoroughly before you commit to a position on it. You conserve your engagement — not because you're unwilling, but because you're aware of how quickly your resources get used up. Expertise and competence matter to you. You'd rather withhold an opinion than hold an imprecise one.",
    },
    patternB: {
      type: 6,
      description: "You think in scenarios and contingencies, running through what-if's as a way of preparing. Your trust in people, systems, and your own judgment is something you keep evaluating — it doesn't just settle into place. You notice inconsistencies, risks, and hidden motives faster than most. Under stress you either prepare more (which feels like control) or push back sharply against what you're suspicious of. Reassurance doesn't quite land.",
    },
  },
  '1|8': {
    patternA: {
      type: 1,
      description: "You feel anger often but express it rarely and carefully. You hold yourself to a standard that doesn't permit reactive outbursts. The anger comes out in precision, in tone, in tightness — and occasionally in a burst you feel ashamed of afterward. You're working with an internal critic that doesn't let you off the hook. Being seen as losing control is worse than almost anything.",
    },
    patternB: {
      type: 8,
      description: "You express anger directly and don't spend much time apologizing for it. You feel your strength and use it to protect yourself and people you consider yours. You don't worry about being too much — you worry about being vulnerable to people who haven't earned your trust. Softness is available to you but not offered easily. You'd rather be respected than liked.",
    },
  },
  '2|3': {
    patternA: {
      type: 2,
      description: "Your worth feels bound up in what you give to others. You track people's emotional states closely and adjust your warmth, attention, and support to match. When your contribution isn't acknowledged, it registers as a wound about being unlovable, not just as a workplace slight. You can have trouble naming what you need, especially to the people you most want to be close to.",
    },
    patternB: {
      type: 3,
      description: "Your worth feels bound up in what you accomplish and how you're seen. You track what's valued in a given environment and shape yourself toward it with real skill. When your performance falters, it registers as a threat to identity, not just to outcomes. You can have trouble knowing what you want separate from what would be successful to want.",
    },
  },
  // v2.1 expanded pairs
  '2|6': {
    patternA: {
      type: 2,
      description: "You move toward people to help them. You notice what they need — emotionally, practically — often before they ask, and positioning yourself as the person who provides it feels natural and right. You can articulate your own needs if pressed, but they tend to surface later, after you've already met someone else's. Relationships feel most stable when you're actively giving into them. When you're depleted, you may feel unappreciated — the giving you've done wasn't fully seen, and the recognition you didn't ask for didn't arrive. The pattern centers on being needed as the way you secure love.",
    },
    patternB: {
      type: 6,
      description: "You move toward people to test whether they can be relied on. You're loyal to the ones who've earned it, and you stay alert to whether the relationship is still trustworthy — even after the trust is established. You read people carefully before committing, and you run through what-ifs about what might go wrong. Your attentiveness to others isn't primarily about providing for them; it's about staying oriented to whether the ground is solid. When you're depleted, you may feel exposed — the checking hasn't stopped, and reassurance helps only briefly. The pattern centers on testing reliability as the way you secure safety.",
    },
  },
  '3|8': {
    patternA: {
      type: 3,
      description: "You drive toward achievement that others can see. You adapt your presentation to what each context rewards — different settings call for different versions of you, and shifting between them happens smoothly, often without conscious decision. Success feels like the ground your identity stands on; falling short feels like exposure of something underneath that you'd rather not examine. You read what a context values and deliver it, and the recognition you receive confirms you're on track. When someone challenges your performance, the sting is sharper than you let on. The pattern centers on visible success as the confirmation of worth.",
    },
    patternB: {
      type: 8,
      description: "You drive toward maintaining control and protecting what's yours. You don't adapt your presentation much — people get what they get, and if they don't like it, that's information about them, not a reason for you to change. Autonomy feels non-negotiable; being pushed around by someone who hasn't earned authority over you triggers immediate resistance. You'd rather be respected than liked, and softness in the wrong context reads to you as exposure. When someone challenges you directly, you often meet the challenge with more force, not less. The pattern centers on strength as the condition of not being exploited.",
    },
  },
  '5|9': {
    patternA: {
      type: 5,
      description: "You withdraw to protect your internal resources — time, mental bandwidth, the space to think without interruption. Demands from other people register as potential depletion before they register as anything else, and you ration your engagement carefully. Even when you're physically present, you may be keeping yourself gated, releasing only the responses you've fully worked out. Unstructured social time is specifically costly — not because you dislike people, but because the output required to sustain it pulls from exactly the reserves you're trying to conserve. When you've been with people too long, you feel drained in a way that requires solitude, not rest. The pattern centers on conservation.",
    },
    patternB: {
      type: 9,
      description: "You withdraw to maintain internal peace — an even inner weather that doesn't get disrupted by too many competing pulls. Demands from other people aren't primarily a resource cost; they're a potential source of conflict or fragmentation that pulls your attention in directions you didn't choose. You adapt to what's happening around you often before checking whether you want to, and your own preferences surface later — sometimes only when you're pushed. When you've been in high-engagement situations too long, you feel scattered rather than drained, and what restores you is something familiar and low-stakes, not necessarily solitude. The pattern centers on non-disruption.",
    },
  },
  '7|9': {
    patternA: {
      type: 7,
      description: "You deflect by generating what's next. When something uncomfortable surfaces, you reframe it into an opportunity, pivot to a new possibility, or keep the momentum going so you don't have to sit with it. You're usually in motion — mentally, conversationally, sometimes physically — and stillness feels like an invitation for something unwanted to catch up. Your enthusiasm is real, and it's also doing work: it keeps certain feelings from arriving. When someone tries to slow you down to a heavier conversation, you'll often find yourself already elsewhere by the time they finish the sentence. The pattern centers on forward motion as the way things stay okay.",
    },
    patternB: {
      type: 9,
      description: "You deflect by smoothing. When something uncomfortable surfaces, you downplay it, adapt to what the room needs, or let it fade rather than engaging with it head-on. You're usually steady — not moving fast, but not disrupting either — and conflict feels like the kind of disruption that fragments your internal peace. Your calm is real, and it's also doing work: it keeps you from the cost of taking a position that might create friction. When someone tries to push you to a clear preference or a harder stance, you'll often find yourself going along or going vague, and only later notice you didn't actually agree. The pattern centers on continuity as the way things stay okay.",
    },
  },
};
