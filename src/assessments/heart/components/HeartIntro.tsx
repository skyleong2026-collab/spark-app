import type { CSSProperties } from 'react';

interface HeartIntroProps {
  onBegin: () => void;
}

export default function HeartIntro({ onBegin }: HeartIntroProps) {
  return (
    <div style={wrap} className="heart-intro">
      <style>{css}</style>
      <div style={introCard}>
        <div style={stepPills}>
          <span style={pillActive}>Heart</span>
          <span style={pillDim}>→</span>
          <span style={pillDim}>Head</span>
          <span style={pillDim}>→</span>
          <span style={pillDim}>Hand</span>
        </div>
        <h2 style={introTitle}>Before you begin</h2>
        <p style={introBody}>
          Answer based on how you've consistently operated across your life — not just your
          current role, season, or the person you're trying to become. Think about your pattern
          over the past several years. For each statement, how often does this describe your
          actual behavior?
        </p>
        <p style={introLight}>
          This is the first of three assessments. Together they take about 15–20 minutes.
        </p>
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
const introLight: CSSProperties = { fontSize: 14, color: '#888780', lineHeight: 1.7, marginBottom: '2rem', textAlign: 'left' };
const primaryBtn: CSSProperties = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const css = `.heart-intro button:hover { border-color: rgba(0,0,0,0.3) !important; background: #333 !important; } .heart-intro button:active { transform: scale(0.98); }`;
