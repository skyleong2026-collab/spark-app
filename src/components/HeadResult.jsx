import { HEAD_DESCRIPTIONS } from '../lib/typeDescriptions'

export default function HeadResult({ resultType, stack, confidence, softSecondary, onContinue }) {
  const description = HEAD_DESCRIPTIONS[resultType] ?? ''
  const conf = confidence?.toLowerCase()

  return (
    <div style={wrap} className="head-result">
      <div style={card}>
        <h2 style={stackNotation}>{stack}</h2>
        <p style={typeName}>{resultType}</p>
        <p style={descriptionText}>{description}</p>
        <p style={confidenceLabel}>
          Confidence: {conf ? conf.charAt(0).toUpperCase() + conf.slice(1) : confidence}
        </p>

        {(conf === 'moderate' || conf === 'low') && softSecondary && (
          <p style={secondaryText}>Possible alternative: {softSecondary}</p>
        )}

        {conf === 'low' && (
          <p style={noteText}>
            Note: Low-confidence results reflect mixed response patterns. Your result is a working
            hypothesis. You may find it helpful to revisit after sitting with it.
          </p>
        )}

        <button style={continueBtn} onClick={onContinue}>
          Continue to Hand →
        </button>
      </div>
    </div>
  )
}

const wrap = { maxWidth: 560, width: '100%', margin: '0 auto' }
const card = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2.5rem 2rem', textAlign: 'center', marginTop: '2rem' }
const stackNotation = { fontSize: 36, fontWeight: 700, color: '#185fa5', marginBottom: '0.25rem' }
const typeName = { fontSize: 18, fontWeight: 600, color: '#1a1a18', marginBottom: '1rem', marginTop: 0 }
const descriptionText = { fontSize: 15, color: '#3a3a38', lineHeight: 1.8, marginBottom: '1.25rem' }
const confidenceLabel = { fontSize: 13, color: '#5f5e5a', marginBottom: '0.75rem' }
const secondaryText = { fontSize: 13, color: '#5f5e5a', marginBottom: '0.75rem' }
const noteText = { fontSize: 13, color: '#888780', lineHeight: 1.7, padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: 8, marginBottom: '1.5rem', textAlign: 'left' }
const continueBtn = { marginTop: '1.5rem', width: '100%', padding: '0.875rem 1.5rem', background: '#185fa5', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
