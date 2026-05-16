import { useState } from 'react'

const HEART_TYPES = ['Conviction','Devotion','Ambition','Longing','Wonder','Vigilance','Anticipation','Intensity','Serenity']
const HEAD_TYPES = ['Blueprint','Vision','Hypothesis','Possibility','Framework','Ideal','Strategy','Narrative','Protocol','Memory','Standard','Consensus','Mechanism','Impression','Opportunity','Moment']
const HAND_OPTIONS = [
  { id: 'W', label: 'W — Wonder (The Lantern)' },
  { id: 'I', label: 'I — Invention (The Forge)' },
  { id: 'D', label: 'D — Discernment (The Compass)' },
  { id: 'G', label: 'G — Galvanizing (The Drum)' },
  { id: 'E', label: 'E — Enablement (The Scaffold)' },
  { id: 'T', label: 'T — Tenacity (The Anchor)' },
]

export default function TestSynthesis() {
  const [heart, setHeart] = useState('Conviction')
  const [head, setHead] = useState('Blueprint')
  const [genius1, setGenius1] = useState('D')
  const [genius2, setGenius2] = useState('T')
  const [frust1, setFrust1] = useState('W')
  const [frust2, setFrust2] = useState('I')
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(null)
  const [synthesis, setSynthesis] = useState(null)
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(null)

  async function generate() {
    setLoading(true)
    setTitle(null)
    setSynthesis(null)
    setError(null)
    const start = Date.now()

    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-synthesis`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heartType: heart,
          headType: head,
          handGeniusTypes: [genius1, genius2],
          handFrustrationTypes: [frust1, frust2],
        }),
      })
      const data = await res.json()
      setElapsed(((Date.now() - start) / 1000).toFixed(1))

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setTitle(data.title)
      setSynthesis(data)  // store full response with sections
    } catch (err) {
      setError(err.message)
      setElapsed(((Date.now() - start) / 1000).toFixed(1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem', fontFamily: '-apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: '0.25rem' }}>Synthesis Test Console</h1>
      <p style={{ fontSize: 12, color: '#888', marginBottom: '2rem' }}>Admin only — not linked from main app</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <label style={labelStyle}>
          Heart type
          <select value={heart} onChange={e => setHeart(e.target.value)} style={selectStyle}>
            {HEART_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Head type
          <select value={head} onChange={e => setHead(e.target.value)} style={selectStyle}>
            {HEAD_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Hand genius 1
          <select value={genius1} onChange={e => setGenius1(e.target.value)} style={selectStyle}>
            {HAND_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Hand genius 2
          <select value={genius2} onChange={e => setGenius2(e.target.value)} style={selectStyle}>
            {HAND_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Hand frustration 1
          <select value={frust1} onChange={e => setFrust1(e.target.value)} style={selectStyle}>
            {HAND_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Hand frustration 2
          <select value={frust2} onChange={e => setFrust2(e.target.value)} style={selectStyle}>
            {HAND_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </div>

      <div style={{ fontSize: 12, color: '#666', marginBottom: '1rem', fontFamily: 'monospace' }}>
        {heart} + {head} + [{genius1},{genius2}] frusts:[{frust1},{frust2}]
      </div>

      <button onClick={generate} disabled={loading} style={{
        padding: '12px 28px', background: loading ? '#ccc' : '#1a1a18', color: '#fff',
        border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'inherit', marginBottom: '2rem',
      }}>
        {loading ? 'Generating...' : 'Generate synthesis'}
      </button>

      {elapsed && <div style={{ fontSize: 12, color: '#888', marginBottom: '1rem' }}>Generated in {elapsed}s</div>}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fcebeb', color: '#a32d2d', borderRadius: 8, fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {title && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '2rem' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#C4963A', marginBottom: '0.75rem' }}>
            SYNTHESIS OUTPUT
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: '#1a1a18', marginBottom: '1.25rem', lineHeight: 1.3 }}>
            {title}
          </h2>
          {[
            { label: 'Heart', color: '#b5564e', text: synthesis.heartSection },
            { label: 'Head', color: '#3a6b48', text: synthesis.headSection },
            { label: 'Hand', color: '#C4963A', text: synthesis.handSection },
            { label: 'Intersection', color: '#2c2825', text: synthesis.intersectionSection },
          ].map(s => s.text && (
            <div key={s.label} style={{ borderTop: `3px solid ${s.color}`, borderRadius: '2px 2px 8px 8px', background: '#faf9f6', padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: s.color, textTransform: 'uppercase', marginBottom: '0.4rem' }}>{s.label}</div>
              <p style={{ fontSize: 15, color: '#3a3a38', lineHeight: 1.85 }}>{s.text}</p>
            </div>
          ))}
          {/* Fallback for old-format responses */}
          {!synthesis.heartSection && synthesis.synthesis && (
            synthesis.synthesis.split('\n').filter(p => p.trim()).map((p, i) => (
              <p key={i} style={{ fontSize: 15, color: '#3a3a38', lineHeight: 1.85, marginBottom: '1rem' }}>{p}</p>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: '4px',
  fontSize: 12, fontWeight: 500, color: '#666',
}

const selectStyle = {
  padding: '8px 10px', border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff',
}
