import type { CSSProperties } from 'react';

interface HandProgressBarProps {
  current: number;  // 1-based pair number
  total: number;    // locked denominator (initialTotalPairs)
  phaseLabel: string;
}

export default function HandProgressBar({ current, total, phaseLabel }: HandProgressBarProps) {
  const pct = Math.min(100, Math.round(((current - 1) / total) * 100));

  return (
    <div style={progHeader} className="hand-progress">
      <div style={progMeta}>
        <span style={progLabel}>{phaseLabel}</span>
        <span style={progCount}>Comparison {current} of {total}</span>
      </div>
      <div style={progTrack}>
        <div style={{ ...progFill, width: `${pct}%` }} />
      </div>
    </div>
  );
}

const progHeader: CSSProperties = { marginBottom: '1.5rem' };
const progMeta: CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: 10 };
const progLabel: CSSProperties = { fontSize: 13, fontWeight: 500, color: '#5f5e5a' };
const progCount: CSSProperties = { fontSize: 12, color: '#888780' };
const progTrack: CSSProperties = { height: 5, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden' };
const progFill: CSSProperties = { height: '100%', borderRadius: 99, background: '#185fa5', transition: 'width .4s cubic-bezier(.4,0,.2,1)' };
