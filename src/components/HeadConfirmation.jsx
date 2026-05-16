import { useState } from 'react'

export default function HeadConfirmation({ pairData, algorithmStack, onSubmit }) {
  const [selected, setSelected] = useState(null)

  function handleSubmit() {
    if (selected === null) return
    if (selected === 'uncertain') {
      onSubmit({ result: 'uncertain' })
      return
    }
    const userStack = selected === 'A' ? pairData.patternA.stack : pairData.patternB.stack
    onSubmit({ result: 'picked', userStack })
  }

  return (
    <div style={wrap} className="head-confirmation">
      <style>{css}</style>
      <div style={card}>
        <h2 style={title}>One more question</h2>
        <p style={subtitle}>
          Two patterns look similar but come from different cognitive roots. Pick the one that more
          consistently describes how you operate.
        </p>

        <div style={pairWrap}>
          <button
            style={selected === 'A' ? { ...patternBtn, ...patternBtnSelected } : patternBtn}
            onClick={() => setSelected('A')}
          >
            <span style={patternLabel}>Pattern A</span>
            <p style={patternText}>{pairData.patternA.description}</p>
          </button>

          <button
            style={selected === 'B' ? { ...patternBtn, ...patternBtnSelected } : patternBtn}
            onClick={() => setSelected('B')}
          >
            <span style={patternLabel}>Pattern B</span>
            <p style={patternText}>{pairData.patternB.description}</p>
          </button>
        </div>

        <button
          style={selected === 'uncertain' ? { ...cantTellBtn, ...cantTellBtnSelected } : cantTellBtn}
          onClick={() => setSelected('uncertain')}
        >
          I can't tell which fits.
        </button>

        <button
          style={selected !== null ? submitBtn : { ...submitBtn, ...submitBtnDisabled }}
          onClick={handleSubmit}
          disabled={selected === null}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

const wrap = { maxWidth: 560, width: '100%', margin: '0 auto' }
const card = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2rem 1.5rem', marginTop: '2rem' }
const title = { fontSize: 20, fontWeight: 600, color: '#1a1a18', marginBottom: '0.5rem', textAlign: 'center' }
const subtitle = { fontSize: 14, color: '#5f5e5a', lineHeight: 1.7, marginBottom: '1.5rem', textAlign: 'center' }
const pairWrap = { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1rem' }
const patternBtn = { background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s, background .15s', fontFamily: 'inherit' }
const patternBtnSelected = { borderColor: '#185fa5', background: '#f5f9ff' }
const patternLabel = { fontSize: 12, fontWeight: 600, color: '#888', background: 'rgba(0,0,0,0.05)', padding: '2px 10px', borderRadius: 4, display: 'inline-block', marginBottom: '0.75rem' }
const patternText = { fontSize: 14, color: '#1a1a18', lineHeight: 1.7, margin: 0 }
const cantTellBtn = { display: 'block', width: '100%', background: 'none', border: 'none', padding: '0.75rem 0', fontSize: 14, color: '#888780', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', marginBottom: '1.5rem' }
const cantTellBtnSelected = { color: '#185fa5', fontWeight: 500 }
const submitBtn = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
const submitBtnDisabled = { opacity: 0.4, cursor: 'not-allowed' }
const css = `.head-confirmation button:hover:not(:disabled) { border-color: rgba(0,0,0,0.3) !important; } .head-confirmation button:active:not(:disabled) { transform: scale(0.98); }`
