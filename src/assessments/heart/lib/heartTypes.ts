export type LikertResponse = 1 | 2 | 3 | 4 | 5;

export type StanceItemKey =
  | 'S1' | 'S2' | 'S3' | 'S4'
  | 'S5' | 'S6' | 'S7' | 'S8'
  | 'S9' | 'S10' | 'S11' | 'S12';

export type CenterItemKey =
  | 'C1' | 'C2' | 'C3' | 'C4'
  | 'C5' | 'C6' | 'C7' | 'C8'
  | 'C9' | 'C10' | 'C11' | 'C12';

export type ItemKey = StanceItemKey | CenterItemKey;

export type HeartResponses = Record<ItemKey, LikertResponse>;

export type Stance = 'assertive' | 'dependent' | 'withdrawn';
export type Center = 'body' | 'heart' | 'head';

export type EnneagramType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ConfidenceLevel = 'high' | 'moderate' | 'low';
export type ConfirmationResult = 'agreed' | 'disagreed' | 'uncertain';
export type ResponsePatternFlag = 'normal' | 'flat';
export type StageSplitType = 'clean' | '2-2-0' | '2-1-1';
export type SynthesisVariant = 'synthesis_high' | 'synthesis_moderate' | 'synthesis_low';

// Only the 4 active confirmation pairs (same-stance, thin-center-margin trigger)
export type ConfusablePair = '1|6' | '3|7' | '4|5' | '4|9';

export interface HeartScoringResult {
  assessment_version: string;
  responses: HeartResponses;
  stance_scores: Record<Stance, number>;
  center_scores: Record<Center, number>;
  primary_stance: Stance;
  secondary_stance: Stance;
  primary_center: Center;
  secondary_center: Center;
  stance_separation: number;
  center_separation: number;
  primary_type: EnneagramType;
  secondary_type: EnneagramType;
  stance_confidence: ConfidenceLevel;
  center_confidence: ConfidenceLevel;
  overall_confidence: ConfidenceLevel;
  // Ambiguity scoring (Spec 1)
  stage1_split_type: StageSplitType;
  stage1_split_stances: Stance[] | null; // which stances were in the split (null if clean)
  two_candidate: boolean;
  synthesis_variant: SynthesisVariant | null;
  // Confirmation pair (Spec 2)
  confirmation_triggered: boolean;
  confirmation_pair: string | null;
  confirmation_reason: string | null;
  confirmation_result: ConfirmationResult | null;
  confirmation_user_pick: EnneagramType | null;
  // Final resolved values
  final_type: EnneagramType;
  final_secondary: EnneagramType;
  final_confidence: ConfidenceLevel;
  response_pattern_flag: ResponsePatternFlag;
  randomization_seed: number;
  item_order: ItemKey[];
}

export interface HeartItem {
  key: ItemKey;
  text: string;
  dimension: Stance | Center;
  subCategory: string;
}

// Scenario-based forced-choice confirmation pair (v2 format)
export interface ConfirmationPairEntry {
  stem: string;
  optionA: { text: string; type: EnneagramType };
  optionB: { text: string; type: EnneagramType };
  resultCopy: {
    shared: string;    // "Both Type X and Type Y share [stance] orientation — [what they share]"
    forA: string;      // "What distinguished the read was [discriminating mechanism for A]"
    forB: string;      // "What distinguished the read was [discriminating mechanism for B]"
  };
}

// Forced-choice only — no 'uncertain' for Heart (spec: invisible branching, must pick)
export type ConfirmationOutcome =
  | { result: 'agreed' }
  | { result: 'disagreed'; userPick: EnneagramType }
  | { result: 'uncertain' }; // retained for Head; Heart UI does not offer this
