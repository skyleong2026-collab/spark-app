import type { Phase } from './handTypes';

export const PHASES = ['sensing', 'generating', 'evaluating', 'mobilizing', 'completing'] as const satisfies readonly Phase[];

export const PHASE_DESCRIPTIONS = {
  sensing: 'Noticing what needs attention before others do — the problem, the opportunity, the question worth asking, the thing being missed.',
  generating: "Producing new possibilities, proposals, and approaches — ideation when the direction isn't yet clear.",
  evaluating: 'Testing ideas for soundness and viability — examining weaknesses, assessing risk, filtering possibilities.',
  mobilizing: 'Creating momentum toward action — rallying people, building shared commitment, getting movement started.',
  completing: "Carrying work to finished state — executing the final stretch, closing loops, handling what's left.",
} as const satisfies Record<Phase, string>;

export const PHASE_LABELS = {
  sensing: 'Sensing',
  generating: 'Generating',
  evaluating: 'Evaluating',
  mobilizing: 'Mobilizing',
  completing: 'Completing',
} as const satisfies Record<Phase, string>;

export const DRAIN_LOCK_THRESHOLD = 4;
export const DRAIN_CONFIRMED_THRESHOLD = 3;
export const MINIMUM_PAIRS_BEFORE_LOCK = 6;

export const PHASE1_DRAIN_PROMPT = 'Which of these drains more energy when you have to do it?';
export const PHASE2_ENERGY_PROMPT = 'Which of these produces more energy when you get to do it?';

export const ASSESSMENT_VERSION = 'hand_v2_five_phase';
