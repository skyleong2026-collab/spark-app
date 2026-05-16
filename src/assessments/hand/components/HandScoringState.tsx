import type { CSSProperties } from 'react';

export default function HandScoringState() {
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 32, marginBottom: '0.75rem', textAlign: 'center' }}>...</div>
        <div style={{ textAlign: 'center', fontSize: 15, color: '#5f5e5a' }}>
          Scoring your responses...
        </div>
      </div>
    </div>
  );
}

const wrap: CSSProperties = { maxWidth: 560, width: '100%', margin: '0 auto' };
const card: CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2.5rem 2rem', marginTop: '2rem' };
