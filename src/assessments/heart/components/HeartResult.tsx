import type { CSSProperties } from 'react';
import type { HeartScoringResult, EnneagramType } from '../lib/heartTypes';

interface HeartResultProps {
  result: HeartScoringResult;
}

const TYPE_NAMES: Record<EnneagramType, string> = {
  1: 'The Reformer',
  2: 'The Helper',
  3: 'The Achiever',
  4: 'The Individualist',
  5: 'The Investigator',
  6: 'The Loyalist',
  7: 'The Enthusiast',
  8: 'The Challenger',
  9: 'The Peacemaker',
};

export default function HeartResult({ result }: HeartResultProps) {
  const primaryName = TYPE_NAMES[result.final_type];
  const secondaryName = TYPE_NAMES[result.final_secondary];

  return (
    <div style={wrap} className="heart-result">
      <div style={card}>
        <div style={typeNumber}>{result.final_type}</div>
        <h2 style={typeName}>{primaryName}</h2>

        {result.final_confidence === 'high' && (
          <p style={confidenceText}>
            Your Heart assessment result is Type {result.final_type}.
          </p>
        )}

        {result.final_confidence === 'moderate' && (
          <p style={confidenceText}>
            Your results suggest {primaryName} with some characteristics of {secondaryName}.
          </p>
        )}

        {result.final_confidence === 'low' && (
          <p style={confidenceText}>
            Your responses reflect a genuine blend between {primaryName} and {secondaryName} — more
            nuanced than a single label.
          </p>
        )}

        {result.response_pattern_flag === 'flat' && (
          <p style={flatWarning}>
            Your responses were very uniform across all items. This can make it harder to
            identify a clear pattern. Consider retaking the assessment with more differentiation.
          </p>
        )}
      </div>
    </div>
  );
}

const wrap: CSSProperties = { maxWidth: 560, width: '100%', margin: '0 auto' };
const card: CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2.5rem 2rem', textAlign: 'center', marginTop: '2rem' };
const typeNumber: CSSProperties = { fontSize: 48, fontWeight: 700, color: '#185fa5', marginBottom: '0.25rem' };
const typeName: CSSProperties = { fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: '1.5rem' };
const confidenceText: CSSProperties = { fontSize: 15, color: '#3a3a38', lineHeight: 1.8 };
const flatWarning: CSSProperties = { fontSize: 13, color: '#888780', lineHeight: 1.7, marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: 8 };
