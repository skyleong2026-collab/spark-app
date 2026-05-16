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
  confirmation_triggered: boolean;
  confirmation_pair: string | null;
  confirmation_reason: string | null;
  confirmation_result: ConfirmationResult | null;
  confirmation_user_pick: EnneagramType | null;
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

export type ConfusablePair = '1|6' | '2|9' | '3|7' | '4|5' | '4|9' | '5|6' | '1|8' | '2|3' | '2|6' | '3|8' | '5|9' | '7|9';

export type ConfirmationOutcome =
  | { result: 'agreed' }
  | { result: 'disagreed'; userPick: EnneagramType }
  | { result: 'uncertain' };

export interface ConfirmationPairEntry {
  patternA: { type: EnneagramType; description: string };
  patternB: { type: EnneagramType; description: string };
}
