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
        <p style={sharedOpening}>
          Your results show two possible patterns that look similar on the surface but come from
          different cognitive roots. Read both descriptions. Pick the one that more consistently
          describes how you operate.
        </p>

        {pairData.scenario && (
          <div style={scenarioBox}>
            <p style={scenarioText}>{pairData.scenario}</p>
            {pairData.question && (
              <p style={questionText}>{pairData.question}</p>
            )}
          </div>
        )}

        <div style={pairWrap}>
          <button
            style={selected === 'A' ? { ...patternBtn, ...patternBtnSelected } : patternBtn}
            onClick={() => setSelected('A')}
          >
            <p style={patternText}>{pairData.patternA.description}</p>
          </button>

          <button
            style={selected === 'B' ? { ...patternBtn, ...patternBtnSelected } : patternBtn}
            onClick={() => setSelected('B')}
          >
            <p style={patternText}>{pairData.patternB.description}</p>
          </button>
        </div>

        <button
          style={selected === 'uncertain' ? { ...cantTellBtn, ...cantTellBtnSelected } : cantTellBtn}
          onClick={() => setSelected('uncertain')}
        >
          Neither feels right.
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
const sharedOpening = { fontSize: 13, color: '#5f5e5a', lineHeight: 1.7, marginBottom: '1.25rem', textAlign: 'center' }
const scenarioBox = { background: '#f8f7f4', borderRadius: 8, padding: '0.875rem 1rem', marginBottom: '1.25rem' }
const scenarioText = { fontSize: 14, color: '#1a1a18', lineHeight: 1.65, margin: 0, marginBottom: '0.4rem' }
const questionText = { fontSize: 14, color: '#3a3a38', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }
const pairWrap = { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1rem' }
const patternBtn = { background: '#fff', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 12, padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s, background .15s', fontFamily: 'inherit' }
const patternBtnSelected = { borderColor: '#185fa5', background: '#f5f9ff' }
const patternText = { fontSize: 14, color: '#1a1a18', lineHeight: 1.7, margin: 0 }
const cantTellBtn = { display: 'block', width: '100%', background: 'none', border: 'none', padding: '0.75rem 0', fontSize: 14, color: '#888780', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', marginBottom: '1.5rem' }
const cantTellBtnSelected = { color: '#185fa5', fontWeight: 500 }
const submitBtn = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
const submitBtnDisabled = { opacity: 0.4, cursor: 'not-allowed' }
const css = `.head-confirmation button:hover:not(:disabled) { border-color: rgba(0,0,0,0.3) !important; } .head-confirmation button:active:not(:disabled) { transform: scale(0.98); }`
