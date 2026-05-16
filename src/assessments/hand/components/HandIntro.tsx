import type { CSSProperties } from 'react';
import { useEffect, useCallback } from 'react';

interface HandIntroProps {
  onBegin: () => void;
}

export default function HandIntro({ onBegin }: HandIntroProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onBegin();
      }
    },
    [onBegin],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={wrap} className="hand-intro">
      <style>{css}</style>
      <div style={introCard}>
        <div style={stepPills}>
          <span style={pillDim}>Heart</span>
          <span style={pillDim}>→</span>
          <span style={pillDim}>Head</span>
          <span style={pillDim}>→</span>
          <span style={pillActive}>Hand</span>
        </div>
        <h2 style={introTitle}>Before you begin</h2>
        <p style={introBody}>
          This last assessment is different from the first two. It's not measuring
          what you think or how you feel — it's measuring where your energy actually
          goes.
        </p>
        <p style={introBody}>
          There are five phases of collaborative work, and you've been in all five
          many times. But they don't feel the same from inside. Some energize you.
          Some drain you. Some are neutral. This isn't about skill — you might be
          excellent at something that drains you, or only okay at something that
          gives you life. That's exactly what this is trying to surface.
        </p>
        <p style={introBody}>
          You'll see pairs of descriptions. For each pair, pick the one that drains
          more energy when you have to do it — not the one you're worse at, not the
          one you try to avoid, but the one that leaves you more depleted afterward.
        </p>
        <p style={introLight}>Answer from experience, not from what sounds right.</p>
        <button onClick={onBegin} style={primaryBtn}>I'm ready — begin</button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = { maxWidth: 560, width: '100%', margin: '0 auto' };
const introCard: CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2.5rem 2rem', textAlign: 'center', marginTop: '2rem' };
const stepPills: CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: 13, fontWeight: 500 };
const pillActive: CSSProperties = { padding: '4px 14px', background: '#e6f1fb', color: '#185fa5', borderRadius: 99 };
const pillDim: CSSProperties = { color: '#ccc' };
const introTitle: CSSProperties = { fontSize: 24, fontWeight: 600, color: '#1a1a18', marginBottom: '1.25rem' };
const introBody: CSSProperties = { fontSize: 15, color: '#3a3a38', lineHeight: 1.8, marginBottom: '1rem', textAlign: 'left' };
const introLight: CSSProperties = { fontSize: 14, color: '#888780', lineHeight: 1.7, marginBottom: '2rem', textAlign: 'left', fontStyle: 'italic' };
const primaryBtn: CSSProperties = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const css = `.hand-intro button:hover { background: #333 !important; } .hand-intro button:active { transform: scale(0.98); }`;
