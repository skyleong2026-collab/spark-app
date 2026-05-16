// ARCHIVED 2026-04-18 — replaced by Hand v2 five-phase architecture. Kept for reference only; not imported anywhere.
import { useState, useRef, useCallback, useEffect } from 'react'

const G = [
  { id: 'W', name: 'Wonder', pos: 'Ideation', specPct: 0,
    drainDesc: 'Sitting with open questions and exploring what could be — without any clear direction yet',
    energyDesc: 'Asking big questions and pondering possibilities before anyone has the answers' },
  { id: 'I', name: 'Invention', pos: 'Ideation', specPct: 20,
    drainDesc: 'Creating solutions from scratch — the blank page with no existing model to follow',
    energyDesc: 'Generating original ideas and inventing solutions where none existed before' },
  { id: 'D', name: 'Discernment', pos: 'Ideation', specPct: 40,
    drainDesc: 'Gut-checking whether ideas will actually work — poking holes before moving forward',
    energyDesc: 'Assessing ideas with instinct — knowing what will work and what won\'t' },
  { id: 'G', name: 'Galvanizing', pos: 'Execution', specPct: 60,
    drainDesc: 'Rallying and inspiring others — getting people excited, motivated, and moving',
    energyDesc: 'Communicating a vision and moving people to action around it' },
  { id: 'E', name: 'Enablement', pos: 'Execution', specPct: 80,
    drainDesc: 'Supporting others and responding to their needs — coming alongside someone else\'s agenda',
    energyDesc: 'Helping others succeed — providing what\'s needed and responding naturally' },
  { id: 'T', name: 'Tenacity', pos: 'Execution', specPct: 100,
    drainDesc: 'Pushing through to completion — sustaining effort on details long after the interesting part is done',
    energyDesc: 'Driving things across the finish line — making sure everything actually gets done' },
]

const FRONT = [0, 1, 2]
const BACK = [3, 4, 5]
const MAX_APPEARANCES = 4
const MIN_PAIRS_BEFORE_LOCK = 6
const FRONT_IDS = ['W', 'I', 'D']

function buildCrossSpectrumPairs() {
  const pairs = []
  FRONT.forEach(f => BACK.forEach(b => {
    Math.random() > 0.5 ? pairs.push([f, b]) : pairs.push([b, f])
  }))
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  return pairs
}

function buildRemainingPairs(remaining) {
  const pairs = []
  for (let i = 0; i < remaining.length; i++)
    for (let j = i + 1; j < remaining.length; j++) {
      const p = Math.random() > 0.5 ? [remaining[i], remaining[j]] : [remaining[j], remaining[i]]
      pairs.push(p)
    }
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  return pairs
}

function initScores() {
  const drain = {}, energy = {}, app = {}
  G.forEach(g => { drain[g.id] = 0; energy[g.id] = 0; app[g.id] = 0 })
  return { drain, energy, app }
}

export default function HandAssessment({ onComplete }) {
  const [phase, setPhase] = useState(1)
  const [view, setView] = useState('quiz') // quiz | lock | transition | results
  const [pairs, setPairs] = useState(() => buildCrossSpectrumPairs())
  const [cur, setCur] = useState(0)
  const [drainScores, setDrainScores] = useState(() => { const s = {}; G.forEach(g => s[g.id] = 0); return s })
  const [energyScores, setEnergyScores] = useState(() => { const s = {}; G.forEach(g => s[g.id] = 0); return s })
  const [appearances, setAppearances] = useState(() => { const s = {}; G.forEach(g => s[g.id] = 0); return s })
  const [confirmedFrusts, setConfirmedFrusts] = useState([])
  const [frustIds, setFrustIds] = useState([])
  const [flashCard, setFlashCard] = useState(null) // 'a-drain' | 'a-energy' | 'b-drain' | 'b-energy' | null
  const [animating, setAnimating] = useState(false)
  const [lockGenius, setLockGenius] = useState(null)
  const [resultData, setResultData] = useState(null)

  // Use refs for mutable state accessed in callbacks
  const stateRef = useRef({ drainScores, energyScores, appearances, confirmedFrusts, frustIds, pairs, cur, phase })
  useEffect(() => {
    stateRef.current = { drainScores, energyScores, appearances, confirmedFrusts, frustIds, pairs, cur, phase }
  })

  const currentPair = pairs[cur] || [0, 1]
  const a = G[currentPair[0]]
  const b = G[currentPair[1]]
  const total = pairs.length
  const progressPct = total > 0 ? Math.round((cur / total) * 100) : 0

  function skipLockedPairs(pairsArr, startIdx, confirmed) {
    let idx = startIdx
    while (idx < pairsArr.length) {
      const [ai, bi] = pairsArr[idx]
      const aId = G[ai].id
      const bId = G[bi].id
      if (confirmed.includes(aId) || confirmed.includes(bId)) {
        idx++
        continue
      }
      break
    }
    return idx
  }

  function choose(which) {
    if (animating) return
    setAnimating(true)

    const [ai, bi] = pairs[cur]
    const chosenIdx = which === 0 ? ai : bi
    const chosen = G[chosenIdx]
    const side = which === 0 ? 'a' : 'b'
    const flashType = phase === 1 ? 'drain' : 'energy'

    setFlashCard(`${side}-${flashType}`)

    // Compute new scores
    const newDrain = { ...drainScores }
    const newEnergy = { ...energyScores }
    const newApp = { ...appearances }
    let newConfirmed = [...confirmedFrusts]

    if (phase === 1) {
      newDrain[chosen.id] += 1
      newApp[G[ai].id] += 1
      newApp[G[bi].id] += 1
    } else {
      newEnergy[chosen.id] += 1
    }

    setTimeout(() => {
      setFlashCard(null)
      setDrainScores(newDrain)
      setEnergyScores(newEnergy)
      setAppearances(newApp)

      let nextCur = cur + 1

      if (phase === 1 && nextCur >= MIN_PAIRS_BEFORE_LOCK && newDrain[chosen.id] >= MAX_APPEARANCES && !newConfirmed.includes(chosen.id)) {
        newConfirmed.push(chosen.id)
        setConfirmedFrusts(newConfirmed)
        setLockGenius(chosen)
        setView('lock')
        setCur(nextCur)
        setAnimating(false)
        return
      }

      if (phase === 1) {
        nextCur = skipLockedPairs(pairs, nextCur, newConfirmed)
      }

      if (nextCur >= pairs.length) {
        if (phase === 1) {
          // End phase 1
          let finalFrusts = [...newConfirmed]
          if (finalFrusts.length < 2) {
            const sorted = G.filter(g => !finalFrusts.includes(g.id)).sort((x, y) => newDrain[y.id] - newDrain[x.id])
            const needed = 2 - finalFrusts.length
            sorted.slice(0, needed).forEach(g => { if (!finalFrusts.includes(g.id)) finalFrusts.push(g.id) })
          }
          setConfirmedFrusts(finalFrusts)
          setFrustIds(finalFrusts)
          setView('transition')
        } else {
          // Show results
          const fIds = stateRef.current.frustIds.length > 0 ? stateRef.current.frustIds : frustIds
          computeResults(newEnergy, newDrain, fIds, newConfirmed)
        }
      } else {
        setCur(nextCur)
      }
      setAnimating(false)
    }, 200)
  }

  function handleLockContinue() {
    const isSecond = confirmedFrusts.length >= 2
    if (isSecond) {
      const finalFrusts = [...confirmedFrusts]
      setFrustIds(finalFrusts)
      setView('transition')
      return
    }
    setView('quiz')
    let nextCur = skipLockedPairs(pairs, cur, confirmedFrusts)
    if (confirmedFrusts.length >= 2) {
      const finalFrusts = [...confirmedFrusts]
      setFrustIds(finalFrusts)
      setView('transition')
      return
    }
    if (nextCur >= pairs.length) {
      let finalFrusts = [...confirmedFrusts]
      if (finalFrusts.length < 2) {
        const sorted = G.filter(g => !finalFrusts.includes(g.id)).sort((x, y) => drainScores[y.id] - drainScores[x.id])
        const needed = 2 - finalFrusts.length
        sorted.slice(0, needed).forEach(g => { if (!finalFrusts.includes(g.id)) finalFrusts.push(g.id) })
      }
      setConfirmedFrusts(finalFrusts)
      setFrustIds(finalFrusts)
      setView('transition')
      return
    }
    setCur(nextCur)
  }

  function startPhase2() {
    const fIds = frustIds.length > 0 ? frustIds : confirmedFrusts
    setPhase(2)
    setCur(0)
    const remaining = G.filter(g => !fIds.includes(g.id)).map(g => G.indexOf(g))
    const newPairs = buildRemainingPairs(remaining)
    setPairs(newPairs)
    setView('quiz')
  }

  function computeResults(eScores, dScores, fIds, confirmed) {
    const remaining = G.filter(g => !fIds.includes(g.id))
    const sortedRem = remaining.slice().sort((x, y) => eScores[y.id] - eScores[x.id])
    const geniusIds = sortedRem.slice(0, 2).map(g => g.id)
    const compIds = sortedRem.slice(2).map(g => g.id)

    const colors = { g: '#1D9E75', c: '#888780', f: '#E24B4A' }
    const allOrder = [
      ...geniusIds.map(id => ({ id, type: 'g' })),
      ...compIds.map(id => ({ id, type: 'c' })),
      ...fIds.map(id => ({ id, type: 'f' })),
    ]
    const bars = allOrder.map(({ id, type }) => {
      const g = G.find(x => x.id === id)
      const raw = type === 'f' ? dScores[id] : eScores[id]
      const maxS = type === 'f' ? 3 : 6
      const pct = Math.round((raw / maxS) * 100)
      return { id, type, name: g.name, pos: g.pos, pct, color: colors[type], confirmed: confirmed.includes(id) }
    })

    const resultType = geniusIds.sort().join('')
    setResultData({ geniusIds, compIds, frustIds: fIds, confirmedFrusts: confirmed, bars, resultType })
    setView('results')

    if (onComplete) onComplete({
      resultType,
      geniusIds,
      frustrationIds: fIds,
    })
  }

  function restart() {
    setPhase(1)
    setView('quiz')
    setPairs(buildCrossSpectrumPairs())
    setCur(0)
    setDrainScores(() => { const s = {}; G.forEach(g => s[g.id] = 0); return s })
    setEnergyScores(() => { const s = {}; G.forEach(g => s[g.id] = 0); return s })
    setAppearances(() => { const s = {}; G.forEach(g => s[g.id] = 0); return s })
    setConfirmedFrusts([])
    setFrustIds([])
    setFlashCard(null)
    setAnimating(false)
    setLockGenius(null)
    setResultData(null)
  }

  // Transition note
  function getTransitionNote() {
    const fIds = frustIds.length > 0 ? frustIds : confirmedFrusts
    const frontFrust = fIds.filter(id => FRONT_IDS.includes(id))
    const backFrust = fIds.filter(id => !FRONT_IDS.includes(id))
    if (frontFrust.length === 2) return 'Both frustrations are in the ideation zone — you naturally orient toward execution.'
    if (backFrust.length === 2) return 'Both frustrations are in the execution zone — you naturally orient toward ideation.'
    return 'Your frustrations span both ends — your geniuses likely sit in the middle of the workflow.'
  }

  return (
    <div className="wg">
      <style>{styles}</style>

      {/* QUIZ VIEW */}
      {view === 'quiz' && (
        <div className="quiz-wrap">
          <div className="prog-header">
            <div className="prog-meta">
              <span className="prog-phase">
                {phase === 1 ? 'Finding your frustrations' : 'Finding your geniuses'}
              </span>
              <span className="prog-count">{cur + 1} of {total}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="spectrum-bar">
            <span className="spec-label">IDEATION</span>
            <div className="spec-track">
              <div className="spec-pip pip-a" style={{ left: `${a.specPct}%` }} />
              <div className="spec-pip pip-b" style={{ left: `${b.specPct}%` }} />
            </div>
            <span className="spec-label">EXECUTION</span>
          </div>

          <p className="prompt">
            {phase === 1
              ? <>Which feels more like <strong>work</strong> — consistently draining or exhausting?</>
              : <>Which feels more <strong>natural</strong> — energizing and effortless?</>
            }
          </p>

          <div className="cards">
            <button
              className={`card${flashCard === 'a-drain' ? ' flash-drain' : ''}${flashCard === 'a-energy' ? ' flash-energy' : ''}`}
              onClick={() => choose(0)}
            >
              <span className="card-pos">{a.pos.toUpperCase()}</span>
              <span className="card-name">{a.name}</span>
              <span className="card-desc">{phase === 1 ? a.drainDesc : a.energyDesc}</span>
              <span className={`card-tag ${phase === 1 ? 'tag-drain' : 'tag-energy'}`}>
                {phase === 1 ? 'More draining' : 'More energizing'}
              </span>
            </button>
            <button
              className={`card${flashCard === 'b-drain' ? ' flash-drain' : ''}${flashCard === 'b-energy' ? ' flash-energy' : ''}`}
              onClick={() => choose(1)}
            >
              <span className="card-pos">{b.pos.toUpperCase()}</span>
              <span className="card-name">{b.name}</span>
              <span className="card-desc">{phase === 1 ? b.drainDesc : b.energyDesc}</span>
              <span className={`card-tag ${phase === 1 ? 'tag-drain' : 'tag-energy'}`}>
                {phase === 1 ? 'More draining' : 'More energizing'}
              </span>
            </button>
          </div>
          <p className="hint">Tap the one that feels more true</p>
        </div>
      )}

      {/* LOCK MOMENT */}
      {view === 'lock' && lockGenius && (
        <div className="lock-moment on animate-in">
          <div className="lock-icon">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9V7a4 4 0 018 0v2" stroke="var(--color-text-danger)" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="3" y="9" width="14" height="9" rx="2" stroke="var(--color-text-danger)" strokeWidth="1.5" />
              <circle cx="10" cy="13.5" r="1.5" fill="var(--color-text-danger)" />
            </svg>
          </div>
          <div className="lock-title">Frustration confirmed</div>
          <div className="lock-sub">
            {confirmedFrusts.length >= 2
              ? `You chose ${lockGenius.name} as more draining every time it appeared. That's a clear pattern — both frustrations are now confirmed.`
              : `You chose ${lockGenius.name} as more draining every time it appeared. That's a clear signal — locking it in as a confirmed frustration.`
            }
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary, #888780)', marginBottom: '1rem', lineHeight: 1.5 }}>
            This felt consistently draining across multiple comparisons.
          </div>
          <div className="lock-pill">{lockGenius.name} — confirmed frustration</div>
          <button className="lock-continue" onClick={handleLockContinue}>
            {confirmedFrusts.length >= 2 ? 'See my frustrations' : 'Keep going'}
          </button>
        </div>
      )}

      {/* TRANSITION */}
      {view === 'transition' && (
        <div className="transition-badge on animate-in">
          <div className="badge-title">Both frustrations identified</div>
          <div className="badge-sub">These two consistently drain your energy. Now let's find where you truly thrive.</div>
          <div className="badge-pills">
            {(frustIds.length > 0 ? frustIds : confirmedFrusts).map(id => {
              const g = G.find(x => x.id === id)
              return <div key={id} className="pill pill-f">{g.name} ({g.pos})</div>
            })}
          </div>
          <div className="badge-note">{getTransitionNote()}</div>
          <button className="continue-btn" onClick={startPhase2}>Find my geniuses</button>
        </div>
      )}

      {/* RESULTS */}
      {view === 'results' && resultData && (
        <div className="results on animate-in">
          <div className="res-section">
            <div className="res-heading g"><span className="dot dot-g" />YOUR GENIUSES</div>
            <div className="pills">
              {resultData.geniusIds.map(id => (
                <span key={id} className="pill pill-g">{G.find(x => x.id === id).name}</span>
              ))}
            </div>
          </div>
          <div className="res-section">
            <div className="res-heading c"><span className="dot dot-c" />YOUR COMPETENCIES</div>
            <div className="pills">
              {resultData.compIds.map(id => (
                <span key={id} className="pill pill-c">{G.find(x => x.id === id).name}</span>
              ))}
            </div>
          </div>
          <div className="res-section">
            <div className="res-heading f"><span className="dot dot-f" />YOUR FRUSTRATIONS</div>
            <div className="pills">
              {resultData.frustIds.map(id => (
                <span key={id} className="pill pill-f">
                  {G.find(x => x.id === id).name}
                  {resultData.confirmedFrusts.includes(id) && <span className="confirmed-badge">confirmed</span>}
                </span>
              ))}
            </div>
          </div>
          <div className="divider" />
          <div className="bar-section-label">Score breakdown</div>
          {resultData.bars.map(bar => (
            <div key={bar.id} className="bar-row">
              <span className="bar-name">
                {bar.name}
                {bar.confirmed && <span className="confirmed-badge">confirmed</span>}
              </span>
              <span className="bar-pos">{bar.pos}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(6, bar.pct)}%`, background: bar.color }} />
              </div>
            </div>
          ))}
          <button className="restart" onClick={restart}>Start over</button>
        </div>
      )}
    </div>
  )
}

const styles = `
  .wg{max-width:560px;width:100%;background:var(--color-background-primary,#fff);border-radius:12px;border:0.5px solid var(--color-border-tertiary,rgba(0,0,0,0.1));padding:1.5rem 1rem 2rem;margin:0 auto}
  .prog-header{margin-bottom:1.5rem}
  .prog-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .prog-phase{font-size:13px;font-weight:500;color:var(--color-text-secondary,#5f5e5a)}
  .prog-count{font-size:12px;color:var(--color-text-tertiary,#888780)}
  .prog-track{height:5px;background:var(--color-border-tertiary,rgba(0,0,0,0.1));border-radius:99px;overflow:hidden}
  .prog-fill{height:100%;border-radius:99px;background:var(--color-text-info,#185fa5);transition:width .45s cubic-bezier(.4,0,.2,1)}
  .spectrum-bar{display:flex;align-items:center;gap:8px;margin-bottom:1.25rem}
  .spec-label{font-size:11px;font-weight:500;letter-spacing:.06em;color:var(--color-text-tertiary,#888780);white-space:nowrap}
  .spec-track{flex:1;height:3px;background:var(--color-border-tertiary,rgba(0,0,0,0.1));border-radius:99px;position:relative}
  .spec-pip{position:absolute;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;transition:left .4s cubic-bezier(.4,0,.2,1)}
  .pip-a{background:#7F77DD}
  .pip-b{background:#1D9E75}
  .prompt{font-size:15px;color:var(--color-text-primary,#1a1a18);text-align:center;margin-bottom:1.5rem;line-height:1.6;min-height:48px}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:.75rem}
  .card{background:var(--color-background-primary,#fff);border:0.5px solid var(--color-border-secondary,rgba(0,0,0,0.18));border-radius:12px;padding:1.25rem 1rem 1rem;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:8px;transition:border-color .15s,background .15s,transform .1s;min-height:148px;font-family:inherit}
  .card:hover{border-color:var(--color-border-primary,rgba(0,0,0,0.3));background:var(--color-background-secondary,#f1efe8)}
  .card:active{transform:scale(0.97)}
  .card.flash-drain{border-color:var(--color-border-danger,rgba(163,45,45,0.4));background:var(--color-background-danger,#fcebeb);transition:none}
  .card.flash-energy{border-color:var(--color-border-success,rgba(15,110,86,0.4));background:var(--color-background-success,#eaf3de);transition:none}
  .card-pos{font-size:11px;font-weight:500;letter-spacing:.06em;color:var(--color-text-tertiary,#888780);margin-bottom:2px}
  .card-name{font-size:16px;font-weight:500;color:var(--color-text-primary,#1a1a18)}
  .card-desc{font-size:13px;color:var(--color-text-secondary,#5f5e5a);line-height:1.55;flex:1}
  .card-tag{font-size:11px;font-weight:500;letter-spacing:.05em;padding:3px 8px;border-radius:99px;align-self:flex-start;margin-top:4px}
  .tag-drain{background:var(--color-background-danger,#fcebeb);color:var(--color-text-danger,#a32d2d)}
  .tag-energy{background:var(--color-background-success,#eaf3de);color:var(--color-text-success,#0f6e56)}
  .hint{text-align:center;font-size:12px;color:var(--color-text-tertiary,#888780);margin-top:.25rem}
  .lock-moment{padding:1.5rem 1rem;text-align:center}
  .lock-icon{width:44px;height:44px;border-radius:50%;background:var(--color-background-danger,#fcebeb);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
  .lock-icon svg{width:20px;height:20px}
  .lock-title{font-size:16px;font-weight:500;color:var(--color-text-primary,#1a1a18);margin-bottom:.5rem}
  .lock-sub{font-size:13px;color:var(--color-text-secondary,#5f5e5a);line-height:1.6;margin-bottom:1.25rem}
  .lock-pill{display:inline-block;padding:6px 20px;border-radius:99px;font-size:14px;font-weight:500;background:var(--color-background-danger,#fcebeb);color:var(--color-text-danger,#a32d2d);margin-bottom:1.25rem}
  .lock-continue{display:block;width:100%;padding:11px 0;background:var(--color-background-secondary,#f1efe8);color:var(--color-text-primary,#1a1a18);border:0.5px solid var(--color-border-secondary,rgba(0,0,0,0.18));border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit}
  .lock-continue:hover{background:var(--color-background-primary,#fff)}
  .transition-badge{padding:1.5rem 1rem}
  .badge-title{font-size:16px;font-weight:500;color:var(--color-text-primary,#1a1a18);margin-bottom:.5rem;text-align:center}
  .badge-sub{font-size:13px;color:var(--color-text-secondary,#5f5e5a);margin-bottom:1.25rem;line-height:1.6;text-align:center}
  .badge-pills{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:1rem}
  .badge-note{font-size:12px;color:var(--color-text-tertiary,#888780);text-align:center;margin-bottom:1.25rem;line-height:1.5}
  .continue-btn{display:block;width:100%;padding:11px 0;background:var(--color-background-info,#e6f1fb);color:var(--color-text-info,#185fa5);border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit}
  .continue-btn:hover{opacity:.85}
  .results{padding-top:.5rem}
  .res-section{margin-bottom:1.5rem}
  .res-heading{font-size:11px;font-weight:500;letter-spacing:.08em;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .res-heading.g{color:var(--color-text-success,#0f6e56)}
  .res-heading.c{color:var(--color-text-secondary,#5f5e5a)}
  .res-heading.f{color:var(--color-text-danger,#a32d2d)}
  .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .dot-g{background:var(--color-text-success,#0f6e56)}
  .dot-c{background:var(--color-text-secondary,#5f5e5a)}
  .dot-f{background:var(--color-text-danger,#a32d2d)}
  .pills{display:flex;flex-wrap:wrap;gap:8px}
  .pill{padding:6px 16px;border-radius:99px;font-size:14px;font-weight:500}
  .pill-g{background:var(--color-background-success,#eaf3de);color:var(--color-text-success,#0f6e56)}
  .pill-c{background:var(--color-background-secondary,#f1efe8);color:var(--color-text-secondary,#5f5e5a)}
  .pill-f{background:var(--color-background-danger,#fcebeb);color:var(--color-text-danger,#a32d2d)}
  .divider{height:0.5px;background:var(--color-border-tertiary,rgba(0,0,0,0.1));margin:1.25rem 0}
  .bar-section-label{font-size:12px;color:var(--color-text-tertiary,#888780);margin-bottom:12px}
  .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:9px}
  .bar-name{font-size:13px;color:var(--color-text-secondary,#5f5e5a);width:105px;flex-shrink:0}
  .bar-pos{font-size:10px;color:var(--color-text-tertiary,#888780);width:52px;flex-shrink:0;text-align:right}
  .bar-track{flex:1;height:7px;background:var(--color-border-tertiary,rgba(0,0,0,0.1));border-radius:99px;overflow:hidden}
  .bar-fill{height:100%;border-radius:99px}
  .confirmed-badge{font-size:10px;font-weight:500;letter-spacing:.05em;padding:2px 7px;border-radius:99px;background:var(--color-background-danger,#fcebeb);color:var(--color-text-danger,#a32d2d);margin-left:4px;vertical-align:middle}
  .restart{margin-top:1.5rem;width:100%;padding:10px 0;background:transparent;border:0.5px solid var(--color-border-secondary,rgba(0,0,0,0.18));border-radius:8px;cursor:pointer;font-size:13px;color:var(--color-text-secondary,#5f5e5a);font-family:inherit}
  .restart:hover{background:var(--color-background-secondary,#f1efe8)}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .animate-in{animation:fadeUp .25s ease forwards}
`
