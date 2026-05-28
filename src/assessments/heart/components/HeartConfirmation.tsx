import type { CSSProperties } from 'react';
import { useState } from 'react';
import type { ConfirmationPairEntry, ConfirmationOutcome, EnneagramType } from '../lib/heartTypes';

interface HeartConfirmationProps {
  pairData: ConfirmationPairEntry;
  algorithmPrimaryType: EnneagramType;
  onSubmit: (outcome: ConfirmationOutcome) => void;
}

type Selection = 'A' | 'B' | null;

export default function HeartConfirmation({ pairData, algorithmPrimaryType, onSubmit }: HeartConfirmationProps) {
  const [selected, setSelected] = useState<Selection>(null);

  function handleSubmit() {
    if (selected === null) return;

    const pickedType = selected === 'A' ? pairData.optionA.type : pairData.optionB.type;

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
        <p style={transition}>
          One more question — this one tends to get at something the earlier questions don't directly reach.
        </p>

        <p style={stem}>{pairData.stem}</p>

        <div style={pairWrap}>
          <button
            style={selected === 'A' ? { ...optionBtn, ...optionBtnSelected } : optionBtn}
            onClick={() => setSelected('A')}
          >
            <p style={optionText}>{pairData.optionA.text}</p>
          </button>

          <button
            style={selected === 'B' ? { ...optionBtn, ...optionBtnSelected } : optionBtn}
            onClick={() => setSelected('B')}
          >
            <p style={optionText}>{pairData.optionB.text}</p>
          </button>
        </div>

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
const transition: CSSProperties = { fontSize: 13, color: '#888780', lineHeight: 1.7, marginBottom: '1.25rem', textAlign: 'center' };
const stem: CSSProperties = { fontSize: 15, color: '#1a1a18', lineHeight: 1.7, marginBottom: '1.5rem', fontWeight: 500 };
const pairWrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.5rem' };
const optionBtn: CSSProperties = { background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s, background .15s', fontFamily: 'inherit' };
const optionBtnSelected: CSSProperties = { borderColor: '#185fa5', background: '#f5f9ff' };
const optionText: CSSProperties = { fontSize: 14, color: '#1a1a18', lineHeight: 1.7, margin: 0 };
const submitBtn: CSSProperties = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const submitBtnDisabled: CSSProperties = { opacity: 0.4, cursor: 'not-allowed' };
const css = `.heart-confirmation button:hover:not(:disabled) { border-color: rgba(0,0,0,0.3) !important; } .heart-confirmation button:active:not(:disabled) { transform: scale(0.98); }`;
