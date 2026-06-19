export type OpeningState =
  | 'prompt'      // Turn 1: show opening line, await user response
  | 'followup'    // Turn 2: adaptive follow-up from opening_followups_v1 bank
  | 'widening'    // Turn 3: conditional, fires only on thin sample
  | 'transition'  // Fixed transition line before Battery
  | 'done';       // Navigating to Heart

export type FollowupKey =
  | 'situation_heavy'    // "What's it been like for you to sit with that?"
  | 'interiority_heavy'  // "What brought that to the surface this week?"
  | 'guarded'            // "No need to go deep — even a small thing counts. What else has been around?"
  | 'balanced';          // "What about it has stayed with you?"

export type VerbosityBand = 'terse' | 'moderate' | 'expansive';
export type AffectValence = 'positive' | 'neutral' | 'negative';
export type AffectIntensity = 'flat' | 'moderate' | 'charged';
export type AbstractionLevel = 'concrete' | 'mixed' | 'abstract';
export type AgencyFraming = 'actor' | 'mixed' | 'acted_upon';
export type ClosureCue = 'resolved' | 'open' | 'unclear';
export type RegisterConfidence = 'ok' | 'low';

export interface VerbosityProfile {
  turn1_words: number;
  turn2_words: number;
  turn3_words: number | null;
  total_words: number;
  band: VerbosityBand;
}

export interface RegisterProfile {
  verbosity: VerbosityProfile;
  interiority_ratio: number;
  affect: {
    valence: AffectValence;
    intensity: AffectIntensity;
  };
  abstraction: AbstractionLevel;
  agency: AgencyFraming;
  closure_cue: ClosureCue;
}

export interface OpeningTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface OpeningSessionData {
  session_id: string;
  turns: OpeningTurn[];
  register_profile: RegisterProfile;
  register_confidence: RegisterConfidence;
  model_version: string;
  prompt_version: 'opening_v1';
}
