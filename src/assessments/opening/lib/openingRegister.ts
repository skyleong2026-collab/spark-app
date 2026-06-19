// Deterministic register extraction from Opening free-text turns.
// Covers verbosity (word counts) and coarse heuristics for qualitative dimensions.
// A Haiku enrichment call for qualitative dims is a future enhancement; if added,
// it must fall back to these deterministic defaults on failure (never block the Battery).

import type {
  RegisterProfile,
  RegisterConfidence,
  FollowupKey,
  VerbosityBand,
  AffectValence,
  AffectIntensity,
  AbstractionLevel,
  AgencyFraming,
  ClosureCue,
} from './openingTypes';

// ─── Token sets ──────────────────────────────────────────────────────────────

const INTERIORITY_TOKENS = new Set([
  'feel', 'feels', 'felt', 'feeling', 'feelings',
  'think', 'thought', 'thinking', 'thoughts',
  'wonder', 'wondering', 'wondered',
  'worry', 'worried', 'worrying',
  'sense', 'sensing', 'sensed',
  'notice', 'noticed', 'noticing',
  'aware', 'awareness',
  'realize', 'realized', 'realizing',
  'hope', 'hopes', 'hoped', 'hoping',
  'fear', 'fears', 'feared', 'fearing',
  'dread', 'dreaded', 'dreading',
  'anxious', 'anxiety',
  'nervous', 'nerves',
  'excited', 'excitement',
  'frustrated', 'frustration',
  'confused', 'confusion',
  'uncertain', 'uncertainty',
  'stuck', 'overwhelmed',
  'grateful', 'gratitude',
  'relieved', 'relief',
  'unsure', 'doubt', 'doubting',
  'trust', 'trusting',
  'peace', 'peaceful',
  'tension', 'tense',
  'mind', 'heart', 'soul', 'gut',
  'process', 'reflect', 'reflecting',
  'sitting', 'holding',
]);

const POSITIVE_TOKENS = new Set([
  'good', 'great', 'happy', 'excited', 'grateful', 'thankful', 'hopeful',
  'peace', 'peaceful', 'joy', 'joyful', 'love', 'loved', 'proud', 'optimistic',
  'relief', 'relieved', 'content', 'positive', 'wonderful', 'amazing', 'awesome',
]);

const NEGATIVE_TOKENS = new Set([
  'hard', 'difficult', 'struggle', 'struggling', 'worried', 'worry', 'anxious',
  'scared', 'fear', 'frustrated', 'frustration', 'tired', 'exhausted', 'overwhelmed',
  'stuck', 'sad', 'lonely', 'lost', 'confused', 'uncertain', 'dread', 'dreaded',
  'nervous', 'tense', 'tension', 'bad', 'terrible', 'awful', 'hate', 'angry', 'upset',
]);

const ABSTRACT_TOKENS = new Set([
  'always', 'never', 'generally', 'typically', 'tend', 'tends', 'pattern', 'patterns',
  'usually', 'often', 'sometimes', 'meaning', 'purpose', 'identity',
  'life', 'existence', 'reality', 'truth', 'understand', 'perspective',
  'worldview', 'philosophy', 'principle', 'value', 'values', 'belief',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function verbosityBand(total: number): VerbosityBand {
  if (total < 30) return 'terse';
  if (total <= 80) return 'moderate';
  return 'expansive';
}

function interiorityRatio(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const count = tokens.filter(t => INTERIORITY_TOKENS.has(t)).length;
  return Math.min(count / tokens.length, 1);
}

function affectValence(tokens: string[]): AffectValence {
  const pos = tokens.filter(t => POSITIVE_TOKENS.has(t)).length;
  const neg = tokens.filter(t => NEGATIVE_TOKENS.has(t)).length;
  if (pos === 0 && neg === 0) return 'neutral';
  if (pos > neg * 1.5) return 'positive';
  if (neg > pos * 1.5) return 'negative';
  return 'neutral';
}

function affectIntensity(tokens: string[], totalWords: number): AffectIntensity {
  const emotional = tokens.filter(t => POSITIVE_TOKENS.has(t) || NEGATIVE_TOKENS.has(t)).length;
  const ratio = totalWords > 0 ? emotional / totalWords : 0;
  if (ratio < 0.03) return 'flat';
  if (ratio < 0.08) return 'moderate';
  return 'charged';
}

function abstractionLevel(tokens: string[]): AbstractionLevel {
  if (tokens.length === 0) return 'concrete';
  const count = tokens.filter(t => ABSTRACT_TOKENS.has(t)).length;
  const ratio = count / tokens.length;
  if (ratio < 0.02) return 'concrete';
  if (ratio < 0.05) return 'mixed';
  return 'abstract';
}

function agencyFraming(text: string): AgencyFraming {
  const actorPattern = /\bi\s+(am|was|went|did|have|had|made|started|tried|found|felt|thought|realized|decided|chose|wanted|needed|planned|worked|took|gave|told|asked|said|saw|heard|got|came|became|kept|moved|changed)\b/gi;
  const actedUponPattern = /\b(happened to me|was done to me|had to|forced|unable|couldn't|can't|found myself|ended up|turned out)\b/gi;
  const actorCount = (text.match(actorPattern) ?? []).length;
  const actedUponCount = (text.match(actedUponPattern) ?? []).length;
  if (actorCount === 0 && actedUponCount === 0) return 'mixed';
  if (actorCount > actedUponCount * 2) return 'actor';
  if (actedUponCount > actorCount) return 'acted_upon';
  return 'mixed';
}

function closureCue(text: string): ClosureCue {
  if (/\b(resolved|figured out|decided|settled|done|finished|moved on|better now|sorted)\b/i.test(text)) return 'resolved';
  if (/(\?|not sure|don't know|wondering|still|unclear|haven't decided|figuring out)\s*$/i.test(text.trim())) return 'open';
  return 'unclear';
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Threshold below which Turn 3 fires (per §21 §4 and dispatch packet).
// BETA-TUNE: exact values tuned on first beta transcripts.
export const THIN_SAMPLE_WORD_THRESHOLD = 40;
const THIN_INTERIORITY_THRESHOLD = 0.02;

export function needsTurn3(turn1Text: string, turn2Text: string): boolean {
  const combined = countWords(turn1Text) + countWords(turn2Text);
  const tokens = tokenize(turn1Text + ' ' + turn2Text);
  return combined < THIN_SAMPLE_WORD_THRESHOLD || interiorityRatio(tokens) < THIN_INTERIORITY_THRESHOLD;
}

// Locked Turn-2 follow-up bank (opening_followups_v1).
// Selection is deterministic on Turn-1 form (length + interiority ratio),
// never on a type hypothesis — guardrail 3 of the dispatch packet.
export function selectFollowup(turn1Text: string): { key: FollowupKey; text: string } {
  const words = countWords(turn1Text);
  const tokens = tokenize(turn1Text);
  const iRatio = interiorityRatio(tokens);

  if (words < 15) {
    return { key: 'guarded', text: "No need to go deep — even a small thing counts. What else has been around?" };
  }
  if (iRatio < 0.04) {
    return { key: 'situation_heavy', text: "What's it been like for you to sit with that?" };
  }
  if (iRatio > 0.12) {
    return { key: 'interiority_heavy', text: "What brought that to the surface this week?" };
  }
  return { key: 'balanced', text: "What about it has stayed with you?" };
}

// BETA-TUNE: Turn-3 prompts are not in the locked copy bank; these widen from
// the same register family as Turn 2 but are not frozen for v1.
const TURN3_PROMPTS: Record<FollowupKey, string> = {
  situation_heavy: "And what's it been like to carry all of that?",
  interiority_heavy: "What's one situation that's been part of that?",
  guarded: "Even just one more thing — big or small.",
  balanced: "One more thing, whatever comes up.",
};

export function selectTurn3(followupKey: FollowupKey): string {
  return TURN3_PROMPTS[followupKey];
}

export function extractRegisterProfile(
  turn1Text: string,
  turn2Text: string,
  turn3Text: string | null
): { profile: RegisterProfile; confidence: RegisterConfidence } {
  const turn1Words = countWords(turn1Text);
  const turn2Words = countWords(turn2Text);
  const turn3Words = turn3Text !== null ? countWords(turn3Text) : null;
  const totalWords = turn1Words + turn2Words + (turn3Words ?? 0);

  const allText = [turn1Text, turn2Text, turn3Text ?? ''].join(' ');
  const tokens = tokenize(allText);

  const iRatio = interiorityRatio(tokens);
  const isLowConfidence =
    totalWords < THIN_SAMPLE_WORD_THRESHOLD ||
    (iRatio < THIN_INTERIORITY_THRESHOLD && turn3Text !== null);

  const profile: RegisterProfile = {
    verbosity: {
      turn1_words: turn1Words,
      turn2_words: turn2Words,
      turn3_words: turn3Words,
      total_words: totalWords,
      band: verbosityBand(totalWords),
    },
    interiority_ratio: Math.round(iRatio * 100) / 100,
    affect: {
      valence: affectValence(tokens),
      intensity: affectIntensity(tokens, totalWords),
    },
    abstraction: abstractionLevel(tokens),
    agency: agencyFraming(allText),
    closure_cue: closureCue(allText),
  };

  return { profile, confidence: isLowConfidence ? 'low' : 'ok' };
}
