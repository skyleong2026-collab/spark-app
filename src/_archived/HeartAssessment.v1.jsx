// ARCHIVED 2026-04-18 — replaced by Heart v2 Stance×Center architecture. Kept for reference only; not imported anywhere.
import { useState } from 'react'

const TRIAD_QS = [
  { id: 'Q1', a: 'I notice quickly when something feels wrong or out of place and feel a need to respond', b: 'I notice quickly how I am being perceived and adjust accordingly' },
  { id: 'Q2', a: 'I tend to anticipate what could go wrong or what might happen next', b: 'I tend to act on what feels immediately right or necessary' },
  { id: 'Q3', a: 'I am highly aware of how I am coming across to others', b: 'I am highly aware of what could go wrong or needs to be prepared for' },
  { id: 'Q4', a: 'I feel tension when things are inefficient, incorrect, or unjust', b: 'I feel tension when relationships feel off or disconnected' },
  { id: 'Q5', a: 'I often think ahead and try to prepare for different possibilities', b: 'I often respond instinctively in the moment without overthinking' },
  { id: 'Q6', a: 'I pay close attention to emotional tone and relational dynamics', b: 'I pay close attention to risks, uncertainty, and what might happen' },
]

const DIR_QS = [
  { id: 'Q7', a: 'My reactions are shaped more by what is happening inside of me', b: 'My reactions are shaped more by what is happening around me' },
  { id: 'Q8', a: 'I rely on my internal sense of things even if others do not see it', b: 'I naturally adjust myself based on what others need or expect' },
  { id: 'Q9', a: 'I regularly shift between attending to my own internal state and reading the room around me — neither feels like home base', b: 'I have a clear default — I either check in with myself first or respond to what is happening around me first' },
  { id: 'Q10', a: 'My experience is mostly shaped by my inner reactions and interpretations', b: 'My experience is mostly shaped by what is happening in the environment around me' },
  { id: 'Q11', a: 'I find myself toggling — sometimes I lead with what I feel, sometimes with what the situation needs, and I cannot predict which', b: 'I have a reliable pattern — I consistently start from either my inner experience or the outer situation' },
  { id: 'Q12', a: 'I trust my internal experience as my primary guide', b: 'I respond directly to what is happening in front of me' },
  { id: 'Q13', a: 'I often feel like I am translating between my inner world and the outer world — holding both at once', b: 'I feel more rooted in one world — either my inner experience or the external situation — and I operate from there' },
]

const TRIAD_SCORING = {
  Q1: { a: 'Body', b: 'Heart' },
  Q2: { a: 'Mind', b: 'Body' },
  Q3: { a: 'Heart', b: 'Mind' },
  Q4: { a: 'Body', b: 'Heart' },
  Q5: { a: 'Mind', b: 'Body' },
  Q6: { a: 'Heart', b: 'Mind' },
}

const DIR_SCORING = {
  Q7:  { a: 'Inward', b: 'Outward' },
  Q8:  { a: 'Inward', b: 'Outward' },
  Q9:  { a: 'Bridge', b: null },
  Q10: { a: 'Inward', b: 'Outward' },
  Q11: { a: 'Bridge', b: null },
  Q12: { a: 'Inward', b: 'Outward' },
  Q13: { a: 'Bridge', b: null },
}

const TYPE_MATRIX = {
  'Body+Outward': 'Intensity', 'Body+Inward': 'Conviction', 'Body+Bridge': 'Serenity',
  'Heart+Outward': 'Devotion', 'Heart+Inward': 'Longing', 'Heart+Bridge': 'Ambition',
  'Mind+Outward': 'Anticipation', 'Mind+Inward': 'Wonder', 'Mind+Bridge': 'Vigilance',
}

const SCENARIO_MAP = {
  Intensity: 'outward', Devotion: 'outward', Anticipation: 'outward',
  Conviction: 'inward', Longing: 'inward', Wonder: 'inward',
  Serenity: 'bridge', Ambition: 'bridge', Vigilance: 'bridge',
}

// Pairs that are hard to distinguish — lower confidence by one level if these are top two
const DIFFICULT_PAIRS = [
  ['Conviction', 'Longing'],    // 1/4
  ['Wonder', 'Vigilance'],       // 5/6
  ['Ambition', 'Anticipation'],  // 3/7
]

function lowerConfidence(conf) {
  if (conf === 'high') return 'moderate'
  if (conf === 'moderate') return 'low'
  return 'low'
}

export default function HeartAssessment({ onComplete }) {
  const [phase, setPhase] = useState('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})

  const allQs = phase === 'triad' ? TRIAD_QS : DIR_QS
  const current = allQs[qIndex]
  const totalQs = TRIAD_QS.length + DIR_QS.length
  const globalIndex = phase === 'triad' ? qIndex : TRIAD_QS.length + qIndex
  const progressPct = Math.round((globalIndex / totalQs) * 100)

  function pick(choice) {
    const newAnswers = { ...answers, [current.id]: choice }
    setAnswers(newAnswers)

    if (qIndex + 1 < allQs.length) {
      setQIndex(qIndex + 1)
    } else if (phase === 'triad') {
      setPhase('direction')
      setQIndex(0)
    } else {
      resolve(newAnswers)
    }
  }

  function resolve(ans) {
    // Score triads
    const triadScores = { Body: 0, Heart: 0, Mind: 0 }
    TRIAD_QS.forEach(q => {
      const choice = ans[q.id]
      if (choice && TRIAD_SCORING[q.id][choice]) {
        triadScores[TRIAD_SCORING[q.id][choice]] += 1
      }
    })

    const triadSorted = Object.entries(triadScores).sort((a, b) => b[1] - a[1])
    const primaryTriad = triadSorted[0][0]
    const secondaryTriad = triadSorted[1][0]
    const triadMargin = triadSorted[0][1] - triadSorted[1][1]

    let triadConfidence
    if (triadMargin >= 3) triadConfidence = 'high'
    else if (triadMargin === 2) triadConfidence = 'moderate'
    else triadConfidence = 'low'

    // Score direction
    const dirScores = { Inward: 0, Outward: 0, Bridge: 0 }
    DIR_QS.forEach(q => {
      const choice = ans[q.id]
      if (choice && DIR_SCORING[q.id][choice]) {
        dirScores[DIR_SCORING[q.id][choice]] += 1
      }
    })

    let direction
    const leadingDir = dirScores.Inward >= dirScores.Outward ? 'Inward' : 'Outward'
    const leadingVal = Math.max(dirScores.Inward, dirScores.Outward)
    if (dirScores.Bridge >= 2 && Math.abs(leadingVal - dirScores.Bridge) <= 1) {
      direction = 'Bridge'
    } else {
      direction = leadingDir
    }

    const dirMargin = direction === 'Bridge'
      ? dirScores.Bridge - Math.max(dirScores.Inward, dirScores.Outward)
      : Math.abs(dirScores.Inward - dirScores.Outward)

    let dirConfidence
    if (dirMargin >= 2) dirConfidence = 'high'
    else if (dirMargin === 1) dirConfidence = 'moderate'
    else dirConfidence = 'low'

    // Overall confidence = min of triad and direction
    const confOrder = { high: 2, moderate: 1, low: 0 }
    let confidence = confOrder[triadConfidence] <= confOrder[dirConfidence] ? triadConfidence : dirConfidence

    const resultType = TYPE_MATRIX[`${primaryTriad}+${direction}`]
    const scenarioContext = SCENARIO_MAP[resultType]

    // Determine soft secondary (second-most-likely type)
    const secondaryType = TYPE_MATRIX[`${secondaryTriad}+${direction}`]
    let softSecondary = (triadMargin <= 1 || dirConfidence === 'low') ? secondaryType : null

    // Difficulty weighting — check if primary and secondary are a hard-to-distinguish pair
    if (softSecondary) {
      const pair = [resultType, softSecondary].sort()
      const isHardPair = DIFFICULT_PAIRS.some(dp => dp.sort().join() === pair.join())
      if (isHardPair) {
        confidence = lowerConfidence(confidence)
      }
    }

    setPhase('done')
    onComplete({ resultType, confidence, softSecondary, scenarioContext, triadConfidence, dirConfidence })
  }

  if (phase === 'intro') {
    return (
      <div style={wrap}>
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
            Answer based on how you have historically operated across your life, not just
            your current role or season. Choose what feels more consistently true, even if
            neither is perfect.
          </p>
          <p style={introLight}>
            This is the first of three assessments. Together they take about 15–20 minutes.
          </p>
          <button onClick={() => setPhase('triad')} style={primaryBtn}>I'm ready — begin</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div style={wrap}>
        <style>{css}</style>
        <div style={introCard}>
          <div style={{ fontSize: 32, marginBottom: '0.75rem', textAlign: 'center' }}>✓</div>
          <div style={{ textAlign: 'center', fontSize: 15, color: '#5f5e5a' }}>Processing your Heart result...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <style>{css}</style>
      <div style={cardWrap}>
        <div style={progHeader}>
          <div style={progMeta}>
            <span style={progPhase}>
              {phase === 'triad' ? 'Filter 1 — Core pattern' : 'Filter 2 — Direction'}
            </span>
            <span style={progCount}>Q{globalIndex + 1} of {totalQs}</span>
          </div>
          <div style={progTrack}>
            <div style={{ ...progFill, width: `${progressPct}%` }} />
          </div>
        </div>

        <p style={prompt}>Which feels more consistently true?</p>

        <div style={options}>
          <button style={optionBtn} onClick={() => pick('a')}>
            <span style={optionLabel}>A</span>
            <span style={optionText}>{current.a}</span>
          </button>
          <button style={optionBtn} onClick={() => pick('b')}>
            <span style={optionLabel}>B</span>
            <span style={optionText}>{current.b}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const wrap = { maxWidth: 560, width: '100%', margin: '0 auto' }
const introCard = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2.5rem 2rem', textAlign: 'center', marginTop: '2rem' }
const stepPills = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontSize: 13, fontWeight: 500 }
const pillActive = { padding: '4px 14px', background: '#e6f1fb', color: '#185fa5', borderRadius: 99 }
const pillDim = { color: '#ccc' }
const introTitle = { fontSize: 24, fontWeight: 600, color: '#1a1a18', marginBottom: '1.25rem' }
const introBody = { fontSize: 15, color: '#3a3a38', lineHeight: 1.8, marginBottom: '1rem', textAlign: 'left' }
const introLight = { fontSize: 14, color: '#888780', lineHeight: 1.7, marginBottom: '2rem', textAlign: 'left' }
const primaryBtn = { display: 'block', width: '100%', padding: '14px 0', background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
const cardWrap = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem 1rem 2rem' }
const progHeader = { marginBottom: '1.5rem' }
const progMeta = { display: 'flex', justifyContent: 'space-between', marginBottom: 10 }
const progPhase = { fontSize: 13, fontWeight: 500, color: '#5f5e5a' }
const progCount = { fontSize: 12, color: '#888780' }
const progTrack = { height: 5, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden' }
const progFill = { height: '100%', borderRadius: 99, background: '#185fa5', transition: 'width .4s cubic-bezier(.4,0,.2,1)' }
const prompt = { fontSize: 15, color: '#1a1a18', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.6 }
const options = { display: 'flex', flexDirection: 'column', gap: 12 }
const optionBtn = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 12, padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'border-color .15s, background .15s, transform .1s', fontFamily: 'inherit' }
const optionLabel = { fontSize: 12, fontWeight: 600, color: '#888', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 4, flexShrink: 0, marginTop: 2 }
const optionText = { fontSize: 14, color: '#1a1a18', lineHeight: 1.55 }
const css = `button:hover { border-color: rgba(0,0,0,0.3) !important; background: #f1efe8 !important; } button:active { transform: scale(0.98); }`
