import type { HeartItem } from './heartTypes';

export const HEART_ITEMS: readonly HeartItem[] = [
  // Stance — Assertive
  { key: 'S1', text: 'When I want something, I push for it directly rather than waiting for the right moment.', dimension: 'assertive', subCategory: 'need expression' },
  { key: 'S2', text: 'In conflict, I say what I think even if it creates friction.', dimension: 'assertive', subCategory: 'conflict' },
  { key: 'S3', text: "When I'm hurt or disappointed, I move into action before I've fully felt it.", dimension: 'assertive', subCategory: 'emotional bypass' },
  { key: 'S4', text: "I notice myself driving forward on what I want before checking how others are receiving it.", dimension: 'assertive', subCategory: 'connection' },

  // Stance — Dependent
  { key: 'S5', text: "When I'm figuring out what I want, I think about it in terms of what others need or expect.", dimension: 'dependent', subCategory: 'need expression' },
  { key: 'S6', text: "I can articulate my values clearly, but they tend to form in reference to what I've been taught, told, or shown.", dimension: 'dependent', subCategory: 'self-reflection filter' },
  { key: 'S7', text: "When I'm uncertain about a decision, my first instinct is to check it against someone or something outside myself.", dimension: 'dependent', subCategory: 'conflict' },
  { key: 'S8', text: "I notice what I want most clearly when I'm with someone whose reaction I'm tracking.", dimension: 'dependent', subCategory: 'connection' },

  // Stance — Withdrawn
  { key: 'S9', text: 'When something important needs to happen, I process it internally before — or instead of — acting on it.', dimension: 'withdrawn', subCategory: 'activation' },
  { key: 'S10', text: 'I can see clearly what needs to be done and still not do it.', dimension: 'withdrawn', subCategory: 'activation gap' },
  { key: 'S11', text: 'Under pressure, my instinct is to pull back and wait rather than push forward.', dimension: 'withdrawn', subCategory: 'conflict' },
  { key: 'S12', text: 'I often have rich internal responses to situations that others never see from the outside.', dimension: 'withdrawn', subCategory: 'connection' },

  // Center — Body
  { key: 'C1', text: "When something's off, I feel it in my body before I can name what's wrong.", dimension: 'body', subCategory: 'somatic awareness' },
  { key: 'C2', text: 'I get tense or irritated when things are inefficient, incorrect, or unfair.', dimension: 'body', subCategory: 'reactivity trigger' },
  { key: 'C3', text: 'My first reaction to a problem tends to be physical — tension, restlessness, or forward motion.', dimension: 'body', subCategory: 'reactivity mode' },
  { key: 'C4', text: 'I notice when my will or autonomy is being pushed against, and I react to it quickly.', dimension: 'body', subCategory: 'core threat' },

  // Center — Heart
  { key: 'C5', text: "I'm highly aware of how I'm being perceived in social situations.", dimension: 'heart', subCategory: 'attention focus' },
  { key: 'C6', text: 'I notice quickly when a relationship feels off, distant, or disconnected.', dimension: 'heart', subCategory: 'reactivity trigger' },
  { key: 'C7', text: "I think about who I'm being to different people — and I can tell when those versions aren't lining up.", dimension: 'heart', subCategory: 'identity coherence' },
  { key: 'C8', text: 'My mood is strongly affected by whether I feel seen, valued, or understood by others.', dimension: 'heart', subCategory: 'core threat' },

  // Center — Head
  { key: 'C9', text: 'I think ahead about what could go wrong and try to prepare for it.', dimension: 'head', subCategory: 'anticipatory pattern' },
  { key: 'C10', text: 'I notice uncertainty quickly and feel pulled to resolve it — by planning, researching, or imagining outcomes.', dimension: 'head', subCategory: 'reactivity trigger' },
  { key: 'C11', text: "My reactions to situations are shaped by what I'm anticipating, not just what's happening now.", dimension: 'head', subCategory: 'time orientation' },
  { key: 'C12', text: 'When I feel unsettled, my mind works the problem — running scenarios, checking assumptions, looking for a framework.', dimension: 'head', subCategory: 'reactivity mode' },
] as const;
