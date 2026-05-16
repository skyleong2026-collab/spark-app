import type { CSSProperties } from 'react';
import { useEffect, useCallback } from 'react';
import type { LikertResponse, HeartItem } from '../lib/heartTypes';

interface HeartItemPresenterProps {
  item: HeartItem;
  onRespond: (value: LikertResponse) => void;
}

const LIKERT_OPTIONS: { value: LikertResponse; label: string }[] = [
  { value: 1, label: 'Never' },
  { value: 2, label: 'Rarely' },
  { value: 3, label: 'Sometimes' },
  { value: 4, label: 'Often' },
  { value: 5, label: 'Almost Always' },
];

export default function HeartItemPresenter({ item, onRespond }: HeartItemPresenterProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        onRespond(num as LikertResponse);
      }
    },
    [onRespond],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="heart-item">
      <style>{css}</style>
      <p style={itemText}>{item.text}</p>
      <div style={optionsWrap}>
        {LIKERT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            style={optionBtn}
            onClick={() => onRespond(opt.value)}
          >
            <span style={optionKey}>{opt.value}</span>
            <span style={optionLabel}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const itemText: CSSProperties = { fontSize: 16, color: '#1a1a18', lineHeight: 1.7, textAlign: 'center', marginBottom: '2rem', padding: '0 0.5rem' };
const optionsWrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
const optionBtn: CSSProperties = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 10, padding: '0.9rem 1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', transition: 'border-color .15s, background .15s, transform .1s', fontFamily: 'inherit' };
const optionKey: CSSProperties = { fontSize: 11, fontWeight: 600, color: '#888', background: 'rgba(0,0,0,0.05)', padding: '2px 7px', borderRadius: 4, flexShrink: 0 };
const optionLabel: CSSProperties = { fontSize: 14, color: '#1a1a18' };
const css = `.heart-item button:hover { border-color: rgba(0,0,0,0.3) !important; background: #f1efe8 !important; } .heart-item button:active { transform: scale(0.98); }`;
