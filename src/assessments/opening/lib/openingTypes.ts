export type RegisterBand = 'terse' | 'moderate' | 'expansive';

export type RegisterClass =
  | 'situation-heavy / interiority-light'
  | 'interiority-heavy / situation-light'
  | 'very short / guarded'
  | 'default / balanced';

export interface Verbosity {
  turn1_words: number;
  turn2_words: number;
  turn3_words: number | null;
  total_words: number;
  band: RegisterBand;
}

export interface RegisterProfile {
  verbosity: Verbosity;
  interiority_ratio: number;
  affect: {
    valence: 'positive' | 'neutral' | 'negative';
    intensity: 'flat' | 'moderate' | 'charged';
  };
  abstraction: 'concrete' | 'mixed' | 'abstract';
  agency: 'actor' | 'mixed' | 'acted_upon';
  closure_cue: 'resolved' | 'open' | 'unclear';
}

export interface OpeningTurn {
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}
