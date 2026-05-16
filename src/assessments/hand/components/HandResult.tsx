import type { CSSProperties } from 'react';
import type { Phase, HandScoringResult, ConfidenceLevel } from '../lib/handTypes';
import { PHASE_LABELS, PHASE_DESCRIPTIONS } from '../lib/handConstants';
import { selectPhase2Candidates } from '../lib/handScoring';

interface HandResultProps {
  result: HandScoringResult;
}

// ── Low-confidence copy variants ────────────────────────────────────────────
// Two variants, routed by which confidence dimension is low:
//   Variant A: drain_confidence === 'low' (regardless of energy_confidence)
//   Variant B: drain_confidence !== 'low' && energy_confidence === 'low'

type LowConfidenceVariant = 'A' | 'B';

function getLowConfidenceVariant(result: HandScoringResult): LowConfidenceVariant | null {
  if (result.overall_confidence !== 'low') return null;
  if (result.drain_confidence === 'low') return 'A';
  if (result.energy_confidence === 'low') return 'B';
  return null;
}

const VARIANT_A_PARAGRAPHS = [
  "Your responses didn't produce a clear energy or drain pattern across the five phases. This result has a few possible readings, and only you can tell which one fits.",
  "Some people are genuinely generalist by disposition — their energy is distributed across phases rather than concentrated in one or two. If this fits your experience, the absence of a strong pattern is itself the profile. You're flexible across the work cycle, and your contribution takes a different shape from people with sharper phase preferences. This is a real disposition, not a failure to land anywhere.",
  "Others get this result because they answered from the wrong frame. The distinction between skill and energy is subtle. If you found yourself picking the phases you're worse at, or the ones that would look bad to claim as draining, the pattern you're reading now isn't actually yours.",
  "A third possibility: you took this during a period where your usual pattern is being overridden by circumstances — a crunch at work, a caregiving season, recovery from something hard. The result reflects what you're running in right now, not your baseline.",
  "Sit with it for a moment. Does this feel like a true picture of you, or does it feel like the shape of where you are right now? If it fits, the generalist reading is the one to work with. If it doesn't, you can retake after some time has passed, answering specifically from energy — what gives you life, what depletes you — not from skill.",
];

const VARIANT_B_PARAGRAPHS = [
  "You know what drains you. The phases above are where effort produces depletion regardless of how well you perform there. That's useful information on its own, and worth taking seriously when you design how you spend your time.",
  "What's less clear from your responses is where your energy positively concentrates. Among the phases that don't drain you, no one phase pulled ahead as the source you're drawn toward. This can show up a few different ways.",
  "Some people have a clear drain signature and a diffuse energy signature — they know what costs them, but their contribution across the non-drain phases is relatively even. If that fits, your profile is about what to avoid more than what to chase. Structure your work around the drain information, and the energy will follow the non-drain terrain without needing a sharper pull.",
  "Others answered the energy pairs from a different frame than the drain pairs. It's possible to be clear about what depletes you and less practiced at noticing what actually feeds you, especially if you've spent years optimizing around obligation. The energy question can feel unfamiliar in a way the drain question doesn't. If that resonates, sit with the three non-drain phases above over the coming weeks and notice which ones leave you more alive after you engage with them — not which ones sound most appealing in the abstract.",
  "A third possibility: your current season is flattening the signal. Recovery, caregiving, grief, burnout — any of these can mute the energy response without touching the drain response. If you suspect this, the drain information still holds, but you can retake Hand later when the rest of your life is less loud.",
];

// ── Colors (non-valenced two-ramp) ──────────────────────────────────────────

const COLORS = {
  energy:  { bg: '#FDF3E6', text: '#C97A2E', textDark: '#8B5520' },
  drain:   { bg: '#E8F4F6', text: '#3B7D8C', textDark: '#2A5A65' },
  neutral: { bg: '#F1F0ED', text: '#6B6B67', textDark: '#4A4A47' },
} as const;

// ── Component ───────────────────────────────────────────────────────────────

export default function HandResult({ result }: HandResultProps) {
  const variant = getLowConfidenceVariant(result);

  if (variant === 'A') return <VariantAResult result={result} />;
  if (variant === 'B') return <VariantBResult result={result} />;
  return <StandardResult result={result} />;
}

// ── Standard result (high/moderate confidence) ──────────────────────────────

function StandardResult({ result }: { result: HandScoringResult }) {
  return (
    <div style={wrap} className="hand-result">
      <div style={card}>
        <h2 style={heading}>Your Hand Profile</h2>

        <PhaseSection
          label="Energy Phases"
          phases={result.energy_phases}
          colorSet={COLORS.energy}
          confidence={result.energy_confidence}
        />

        <PhaseSection
          label="Drain Phases"
          phases={result.drain_phases}
          colorSet={COLORS.drain}
          confidence={result.drain_confidence}
        />

        <PhaseSection
          label="Neutral Phases"
          phases={result.neutral_phases}
          colorSet={COLORS.neutral}
          confidence={null}
        />
      </div>
    </div>
  );
}

// ── Variant A: drain_confidence is low ──────────────────────────────────────

function VariantAResult({ result }: { result: HandScoringResult }) {
  return (
    <div style={wrap} className="hand-result">
      <div style={card}>
        <h2 style={heading}>Your Hand Profile</h2>

        <div style={lowConfidenceBanner}>
          {VARIANT_A_PARAGRAPHS.map((p, i) => (
            <p key={i} style={i === 0 ? lowConfidenceLead : lowConfidenceBody}>{p}</p>
          ))}
        </div>

        <PhaseSection
          label="Energy Phases"
          phases={result.energy_phases}
          colorSet={COLORS.energy}
          confidence={null}
        />

        <PhaseSection
          label="Drain Phases"
          phases={result.drain_phases}
          colorSet={COLORS.drain}
          confidence={null}
        />

        <PhaseSection
          label="Neutral Phases"
          phases={result.neutral_phases}
          colorSet={COLORS.neutral}
          confidence={null}
        />
      </div>
    </div>
  );
}

// ── Variant B: drain clear, energy unclear ──────────────────────────────────

function VariantBResult({ result }: { result: HandScoringResult }) {
  // Display exactly the 3 Phase 2 candidates (the phases actually evaluated in Phase 2),
  // not all non-drain phases (which could be 3–5 depending on drain count).
  const phase2Candidates = selectPhase2Candidates(result.drain_scores, result.phase1_responses);

  return (
    <div style={wrap} className="hand-result">
      <div style={card}>
        <h2 style={heading}>Your Hand Profile</h2>

        {/* Drain phases render at top with full confidence — not downgraded */}
        <PhaseSection
          label="Drain Phases"
          phases={result.drain_phases}
          colorSet={COLORS.drain}
          confidence={result.drain_confidence}
        />

        {/* Variant B copy replaces energy/neutral sections */}
        <div style={lowConfidenceBanner}>
          {VARIANT_B_PARAGRAPHS.map((p, i) => (
            <p key={i} style={i === 0 ? lowConfidenceLead : lowConfidenceBody}>{p}</p>
          ))}
        </div>

        {/* Non-drain phases listed without energy/neutral labels */}
        <div style={section}>
          <div style={{ ...sectionLabel, color: COLORS.neutral.textDark }}>
            <span style={{ ...dot, background: COLORS.neutral.text }} />
            NON-DRAIN PHASES
          </div>
          <div style={tilesWrap}>
            {phase2Candidates.map(phase => (
              <div key={phase} style={{ ...tile, background: COLORS.neutral.bg }}>
                <div style={{ ...tileName, color: COLORS.neutral.textDark }}>{PHASE_LABELS[phase]}</div>
                <div style={tileDesc}>{PHASE_DESCRIPTIONS[phase]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: phase section ────────────────────────────────────────────

interface PhaseSectionProps {
  label: string;
  phases: Phase[];
  colorSet: { bg: string; text: string; textDark: string };
  confidence: ConfidenceLevel | null;
}

function PhaseSection({ label, phases, colorSet, confidence }: PhaseSectionProps) {
  if (phases.length === 0) return null;

  return (
    <div style={section}>
      <div style={{ ...sectionLabel, color: colorSet.textDark }}>
        <span style={{ ...dot, background: colorSet.text }} />
        {label.toUpperCase()}
        {confidence && confidence !== 'high' && (
          <span style={confidenceBadge}>
            {confidence === 'moderate' ? 'moderate signal' : 'weak signal'}
          </span>
        )}
      </div>
      <div style={tilesWrap}>
        {phases.map(phase => (
          <div key={phase} style={{ ...tile, background: colorSet.bg }}>
            <div style={{ ...tileName, color: colorSet.textDark }}>{PHASE_LABELS[phase]}</div>
            <div style={tileDesc}>{PHASE_DESCRIPTIONS[phase]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const wrap: CSSProperties = { maxWidth: 560, width: '100%', margin: '0 auto' };
const card: CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2rem 1.5rem', marginTop: '2rem' };
const heading: CSSProperties = { fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: '1.5rem', textAlign: 'center' };

const lowConfidenceBanner: CSSProperties = { background: '#F9F8F5', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' };
const lowConfidenceLead: CSSProperties = { fontSize: 15, color: '#3a3a38', lineHeight: 1.8, marginTop: 0, marginBottom: '1rem', fontWeight: 500 };
const lowConfidenceBody: CSSProperties = { fontSize: 14, color: '#5f5e5a', lineHeight: 1.8, marginTop: 0, marginBottom: '1rem' };

const section: CSSProperties = { marginBottom: '1.5rem' };
const sectionLabel: CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
const dot: CSSProperties = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 };
const confidenceBadge: CSSProperties = { fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,0,0,0.05)', color: '#888780', marginLeft: 'auto' };

const tilesWrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
const tile: CSSProperties = { borderRadius: 10, padding: '1rem 1.25rem' };
const tileName: CSSProperties = { fontSize: 15, fontWeight: 600, marginBottom: '0.35rem' };
const tileDesc: CSSProperties = { fontSize: 13, color: '#5f5e5a', lineHeight: 1.6 };
