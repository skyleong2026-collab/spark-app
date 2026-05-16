import type { CSSProperties } from 'react';
import { useState } from 'react';
import type { ConfirmationPairEntry, ConfirmationOutcome, EnneagramType } from '../lib/heartTypes';

interface HeartConfirmationProps {
  pairData: ConfirmationPairEntry;
  algorithmPrimaryType: EnneagramType;
  onSubmit: (outcome: ConfirmationOutcome) => void;
}

type Selection = 'A' | 'B' | 'uncertain' | null;

export default function HeartConfirmation({ pairData, algorithmPrimaryType, onSubmit }: HeartConfirmationProps) {
  const [selected, setSelected] = useState<Selection>(null);

  function handleSubmit() {
    if (selected === null) return;
    if (selected === 'uncertain') {
      onSubmit({ result: 'uncertain' });
      return;
    }

    const pickedType = selected === 'A' ? pairData.patternA.type : pairData.patternB.type;

    if (pickedType === algorithmPrimaryType) {
      onSubmit({ result: 'agreed' });
    } else {
      onSubmit({ result: 'disagreed', userPick: pickedType });
    }
  }

  return (
    <div style={wrap} className="heart-confirmation">
      <style>{css}</style>
      <div style={card}>
        <h2 style={title}>One more question</h2>
        <p style={subtitle}>
          Read both descriptions below. Which one fits your actual, long-term pattern more consistently?
        </p>

        <div style={pairWrap}>
          <button
            style={selected === 'A' ? { ...patternBtn, ...patternBtnSelected } : patternBtn}
            onClick={() => setSelected('A')}
          >
            <span style={patternLabel}>Pattern A</span>
            <p style={patternText}>{pairData.patternA.description}</p>
          </button>

          <button
            style={selected === 'B' ? { ...patternBtn, ...patternBtnSelected } : patternBtn}
            onClick={() => setSelected('B')}
          >
            <span style={patternLabel}>Pattern B</span>
            <p style={patternText}>{pairData.patternB.description}</p>
          </button>
        </div>

        <button
          style={selected === 'uncertain' ? { ...cantTellBtn, ...cantTellBtnSelected } : cantTellBtn}
          onClick={() => setSelected('uncertain')}
        >
          I can't tell which fits.
        </button>

        <button
          style={selected !== null ? submitBtn : { ...submitBtn, ...submitBtnDisabled }}
          onClick={handleSubmit}
          disabled={selected === null}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = { maxWidth: 560, width: '100%', margin: '0 auto' };
const card: CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2rem 1.5rem', marginTop: '2rem' };
const title: CSSProperties = { fontSize: 20, fontWeight: 600, color: '#1a1a18', marginBottom: '0.5rem', textAlign: 'center' };
const subtitle: CSSProperties = { fontSize: 14, color: '#5f5e5a', lineHeight: 1.7, marginBottom: '1.5rem', textAlign: 'center' };
const pairWrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1rem' };
const patternBtn: CSSProperties = { background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s, background .15s', fontFamily: 'inherit' };
const patternBtnSelected: CSSProperties = { borderColor: '#185fa5', background: '#f5f9ff' };
const patternLabel: CSSProperties = { fontSize: 12, fontWeight: 600, color: '#888', background: 'rgba(0,0,0,0.05)', padding: '2px 10px', borderRadius: 4, display: 'inline-block', marginBottom: '0.75rem' };
const patternText: CSSProperties = { fontSize: 14, color: '#1a1a18', lineHeight: 1.7, margin: 0 };
const cantTellBtn: CSSProperties = { display: 'block', width: '100%', background: 'none', border: 'none', padding: '0.75rem 0', fontSize: 14, color: '#888780', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', marginBottom: '1.5rem' };
const cantTellBtnSelected: CSSProperties = { color: '#185fa5', fontWeight: 500 };
const submitBtn: CSSProperties = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const submitBtnDisabled: CSSProperties = { opacity: 0.4, cursor: 'not-allowed' };
const css = `.heart-confirmation button:hover:not(:disabled) { border-color: rgba(0,0,0,0.3) !important; } .heart-confirmation button:active:not(:disabled) { transform: scale(0.98); }`;
