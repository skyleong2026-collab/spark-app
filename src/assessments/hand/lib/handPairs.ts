import type { Phase, HandPair } from './handTypes';
import { PHASE_DESCRIPTIONS } from './handConstants';

// ── Phase 1 pairs (verbatim drain-framed text) ─────────────────────────────

export const PHASE1_PAIRS: HandPair[] = [
  {
    pairKey: 'p1_sensing_generating',
    phaseA: 'sensing',
    phaseB: 'generating',
    textA: "Having to notice what's off or being missed in a situation — catching the problem no one else has named, and knowing it's now yours to raise.",
    textB: "Having to come up with new possibilities or proposals when the direction isn't clear yet — producing ideas from nothing when the problem is still fuzzy.",
  },
  {
    pairKey: 'p1_sensing_evaluating',
    phaseA: 'sensing',
    phaseB: 'evaluating',
    textA: "Having to notice what's off before others do — catching the issue and then deciding whether to raise it.",
    textB: "Having to test whether an idea will hold up — finding weak points, naming the flaws others don't want to hear.",
  },
  {
    pairKey: 'p1_sensing_mobilizing',
    phaseA: 'sensing',
    phaseB: 'mobilizing',
    textA: "Having to stay alert to what's not quite right — tracking what others seem to be missing, knowing it will fall to you to surface it.",
    textB: "Having to push people toward action — rallying the group, creating commitment, turning plans into movement.",
  },
  {
    pairKey: 'p1_sensing_completing',
    phaseA: 'sensing',
    phaseB: 'completing',
    textA: "Having to stay alert to what needs attention — being the one who catches the things that keep getting missed, often repeatedly.",
    textB: "Having to carry work across the finish line — grinding through the last twenty percent, closing loops after the interesting phase is over.",
  },
  {
    pairKey: 'p1_generating_evaluating',
    phaseA: 'generating',
    phaseB: 'evaluating',
    textA: "Having to produce new possibilities when nothing exists yet — coming up with options on demand, before the problem is fully defined.",
    textB: "Having to test ideas for weaknesses — stress-testing what others propose, naming what won't hold up.",
  },
  {
    pairKey: 'p1_generating_mobilizing',
    phaseA: 'generating',
    phaseB: 'mobilizing',
    textA: "Having to create ideas from scratch — being the source of possibilities when the direction hasn't been set.",
    textB: "Having to rally people toward action — building shared commitment, pushing the group past inertia into actual movement.",
  },
  {
    pairKey: 'p1_generating_completing',
    phaseA: 'generating',
    phaseB: 'completing',
    textA: "Having to invent possibilities in the open-ended early phase — producing options before anything is defined or agreed on.",
    textB: "Having to carry something across the finish line — executing the final details after the generative energy has drained out.",
  },
  {
    pairKey: 'p1_evaluating_mobilizing',
    phaseA: 'evaluating',
    phaseB: 'mobilizing',
    textA: "Having to assess whether something will work — testing for risk, finding weaknesses, telling people what won't hold up.",
    textB: "Having to build momentum in a group — rallying people, creating buy-in, getting everyone committed to moving forward.",
  },
  {
    pairKey: 'p1_evaluating_completing',
    phaseA: 'evaluating',
    phaseB: 'completing',
    textA: "Having to scrutinize an idea for flaws — being the one who slows things down to test whether the plan is sound.",
    textB: "Having to finish a project in its final stretch — handling the details, closing loops, grinding through to done.",
  },
  {
    pairKey: 'p1_mobilizing_completing',
    phaseA: 'mobilizing',
    phaseB: 'completing',
    textA: "Having to create momentum among people — rallying the group, pushing through resistance to get everyone moving.",
    textB: "Having to bring something to fully finished state — carrying the last stretch of execution after others have lost interest.",
  },
];

// ── Phase 2 pair generator (energy-framed, uses PHASE_DESCRIPTIONS) ─────────

/**
 * Generates all pairwise combinations from the non-drain phases for Phase 2.
 * Uses PHASE_DESCRIPTIONS for text (energy-neutral framing, not drain-framed).
 * Expects 3 phases typically; handles 2-5 gracefully.
 */
export function generatePhase2Pairs(nonDrainPhases: Phase[]): HandPair[] {
  const pairs: HandPair[] = [];

  for (let i = 0; i < nonDrainPhases.length; i++) {
    for (let j = i + 1; j < nonDrainPhases.length; j++) {
      const a = nonDrainPhases[i]!;
      const b = nonDrainPhases[j]!;
      pairs.push({
        pairKey: `p2_${a}_${b}`,
        phaseA: a,
        phaseB: b,
        textA: PHASE_DESCRIPTIONS[a],
        textB: PHASE_DESCRIPTIONS[b],
      });
    }
  }

  return pairs;
}
