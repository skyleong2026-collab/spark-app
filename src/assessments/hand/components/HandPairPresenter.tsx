import type { CSSProperties } from 'react';
import { useEffect, useCallback } from 'react';
import type { Phase, HandPair } from '../lib/handTypes';

interface HandPairPresenterProps {
  pair: HandPair;
  promptText: string;
  onSelect: (selectedPhase: Phase) => void;
}

export default function HandPairPresenter({ pair, promptText, onSelect }: HandPairPresenterProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'a' || e.key === 'A' || e.key === '1') {
        onSelect(pair.phaseA);
      } else if (e.key === 'b' || e.key === 'B' || e.key === '2') {
        onSelect(pair.phaseB);
      }
    },
    [onSelect, pair.phaseA, pair.phaseB],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="hand-pair">
      <style>{css}</style>
      <p style={prompt}>{promptText}</p>
      <div style={optionsWrap}>
        <button style={optionBtn} onClick={() => onSelect(pair.phaseA)}>
          <span style={optionKey}>A</span>
          <span style={optionText}>{pair.textA}</span>
        </button>
        <button style={optionBtn} onClick={() => onSelect(pair.phaseB)}>
          <span style={optionKey}>B</span>
          <span style={optionText}>{pair.textB}</span>
        </button>
      </div>
    </div>
  );
}

const prompt: CSSProperties = { fontSize: 15, color: '#1a1a18', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.6, fontWeight: 500 };
const optionsWrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const optionBtn: CSSProperties = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 12, padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'border-color .15s, background .15s, transform .1s', fontFamily: 'inherit' };
const optionKey: CSSProperties = { fontSize: 12, fontWeight: 600, color: '#888', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 4, flexShrink: 0, marginTop: 2 };
const optionText: CSSProperties = { fontSize: 14, color: '#1a1a18', lineHeight: 1.6 };
const css = `.hand-pair button:hover { border-color: rgba(0,0,0,0.3) !important; background: #f1efe8 !important; } .hand-pair button:active { transform: scale(0.98); }`;
