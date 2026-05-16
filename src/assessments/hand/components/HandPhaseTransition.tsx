import type { CSSProperties } from 'react';
import { useEffect, useCallback } from 'react';
import type { Phase } from '../lib/handTypes';
import { PHASE_LABELS } from '../lib/handConstants';

interface HandPhaseTransitionProps {
  drainPhases: Phase[];
  onContinue: () => void;
}

export default function HandPhaseTransition({ drainPhases, onContinue }: HandPhaseTransitionProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    },
    [onContinue],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={wrap} className="hand-transition">
      <style>{css}</style>
      <div style={card}>
        <p style={leadText}>Good. That gives us what drains you.</p>

        {drainPhases.length > 0 && (
          <div style={pillsWrap}>
            {drainPhases.map(p => (
              <span key={p} style={drainPill}>{PHASE_LABELS[p]}</span>
            ))}
          </div>
        )}

        <p style={bodyText}>
          The next part flips the question. You'll see three more pairs — this time
          from the phases that didn't drain you — and for each one, pick the phase
          that produces more energy when you get to do it. Not the one you're better
          at. Not the one that sounds impressive. The one that leaves you more alive
          afterward, not less.
        </p>
        <p style={lightText}>Three pairs. Same format. Different question.</p>
        <button onClick={onContinue} style={continueBtn}>Continue</button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = { maxWidth: 560, width: '100%', margin: '0 auto' };
const card: CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2rem 1.5rem', marginTop: '2rem', textAlign: 'center' };
const leadText: CSSProperties = { fontSize: 17, fontWeight: 600, color: '#1a1a18', marginBottom: '1.25rem' };
const pillsWrap: CSSProperties = { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' };
const drainPill: CSSProperties = { padding: '6px 16px', borderRadius: 99, fontSize: 14, fontWeight: 500, background: '#E8F4F6', color: '#3B7D8C' };
const bodyText: CSSProperties = { fontSize: 15, color: '#3a3a38', lineHeight: 1.8, marginBottom: '1rem', textAlign: 'left' };
const lightText: CSSProperties = { fontSize: 14, color: '#888780', lineHeight: 1.7, marginBottom: '2rem', textAlign: 'left', fontStyle: 'italic' };
const continueBtn: CSSProperties = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const css = `.hand-transition button:hover { background: #333 !important; } .hand-transition button:active { transform: scale(0.98); }`;
