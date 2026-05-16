export type Phase = 'sensing' | 'generating' | 'evaluating' | 'mobilizing' | 'completing';

export type PairKey = string;

export interface HandPair {
  pairKey: PairKey;
  phaseA: Phase;
  phaseB: Phase;
  textA: string;
  textB: string;
}

export interface Phase1Response {
  pairKey: PairKey;
  selectedPhase: Phase; // the phase selected as "drains more"
}

export interface Phase2Response {
  pairKey: PairKey;
  selectedPhase: Phase; // the phase selected as "produces more energy"
}

export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export type PhaseCategory = 'energy' | 'drain' | 'neutral';

export interface HandScoringResult {
  assessment_version: string;
  session_id: string;
  phase1_responses: Phase1Response[];
  phase2_responses: Phase2Response[];
  phase1_completed_pairs: number;
  drain_scores: Record<Phase, number>;
  energy_scores: Record<Phase, number>;
  energy_phases: Phase[];
  drain_phases: Phase[];
  neutral_phases: Phase[];
  drain_confidence: ConfidenceLevel;
  energy_confidence: ConfidenceLevel;
  overall_confidence: ConfidenceLevel;
  early_lock_triggered: boolean;
  locked_phases: Phase[];
  randomization_seed: number;
  pair_order: PairKey[];
}
