import type { CSSProperties } from 'react';

interface HeartProgressBarProps {
  current: number;  // 0-based index
  total: number;
}

export default function HeartProgressBar({ current, total }: HeartProgressBarProps) {
  const pct = Math.round(((current) / total) * 100);

  return (
    <div style={progHeader} className="heart-progress">
      <div style={progMeta}>
        <span style={progLabel}>Heart Assessment</span>
        <span style={progCount}>Question {current + 1} of {total}</span>
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
