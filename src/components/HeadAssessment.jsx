import { useState } from 'react'
import HeadResult from './HeadResult'
import { TYPE_TO_STACK } from '../lib/typeDescriptions'
import HeadConfirmation from './HeadConfirmation'
import { CONFIRMATION_PAIRS } from '../assessments/head/lib/headConfirmationPairs'

// Returns ordered array of pair keys to fire (0–2) based on dominant/aux and confidence.
// Fire conditions per spec: dominantFunction match + aux covers the confusable split.
// Gated by confidence: high confidence = no confirmation needed.
function buildConfirmationPairs(dominant, aux, confidence) {
  if (confidence === 'high') return []

  const candidates = []

  if (dominant === 'Ni' && (aux === 'Te' || aux === 'Fe')) candidates.push('Ni-Fe|Ni-Te')
  if (dominant === 'Ne' && (aux === 'Ti' || aux === 'Fi')) candidates.push('Ne-Fi|Ne-Ti')
  if (dominant === 'Fi' && (aux === 'Se' || aux === 'Ne')) candidates.push('Fi-Ne|Fi-Se')
  if (dominant === 'Te' && (aux === 'Si' || aux === 'Ni')) candidates.push('Te-Ni|Te-Si')
  // Pair 5: Se auxiliary — dominant split between Ti and Fi
  if (aux === 'Se' && (dominant === 'Ti' || dominant === 'Fi')) candidates.push('Fi-Se|Ti-Se')
  if (dominant === 'Fe' && (aux === 'Si' || aux === 'Ni')) candidates.push('Fe-Ni|Fe-Si')

  return candidates.slice(0, 2)
}

const PREFILTER_QS = [
  { id: 'PF1', a: 'I naturally stay open, take things in, and adjust as I go', b: 'I naturally move toward decisions and closure once I have enough' },
  { id: 'PF2', a: 'I like exploring options and seeing what emerges', b: 'I like deciding on a direction and moving forward' },
  { id: 'PF3', a: 'I spend more time observing, taking in, or exploring', b: 'I spend more time organizing, deciding, or structuring' },
  { id: 'PF4', a: 'I prefer to keep things flexible and evolving', b: 'I prefer to bring things to clarity and resolution' },
]

const PERCEIVING_QS = [
  { id: 'P5', a: 'I focus on what is happening right now and respond in real time', b: 'I reference past experience and what is familiar or proven' },
  { id: 'P6', a: 'I see multiple possibilities and connections branching outward', b: 'I narrow toward a single underlying insight or direction' },
  { id: 'P7', a: 'I trust what I can directly notice and engage with right now', b: 'I trust what I have learned from past patterns and experience' },
  { id: 'P8', a: 'I enjoy exploring many ideas at once', b: 'I prefer focusing on one idea until it becomes clear' },
]

const JUDGING_QS = [
  { id: 'J5', a: 'I focus on what works, gets results, and is effective', b: 'I focus on what makes sense and is internally consistent' },
  { id: 'J6', a: 'I focus on people, tone, and what will maintain connection', b: 'I focus on staying true to what feels right to me personally' },
  { id: 'J7', a: 'I organize things so they function efficiently', b: 'I refine things until they make precise sense' },
  { id: 'J8', a: 'I adjust based on others and the situation', b: 'I stay anchored in my personal values' },
]

const Q9_OBJ = { id: 'Q9', a: 'My attention is naturally pulled outward — I process by engaging with the world around me', b: 'My attention is naturally pulled inward — I process by working things through in my mind' }
const Q9B_OBJ = { id: 'Q9b', a: 'When I have a new idea or problem to solve, I want to talk it through or try it out in the real world', b: 'When I have a new idea or problem to solve, I want to sit with it and think it through before acting' }

const Q10_PERCEIVING = { id: 'Q10', a: 'I support my thinking by exploring multiple possibilities', b: 'I support my thinking by refining a single clear direction' }
const Q10_JUDGING = { id: 'Q10', a: 'I support my decisions by considering people and relational impact', b: 'I support my decisions by checking internal logic and accuracy' }

const PATH_B_OPTIONS = [
  { id: 'A', text: 'I act impulsively and chase stimulation or distraction' },
  { id: 'B', text: 'I get stuck in routine or feel trapped by what I have to do' },
  { id: 'C', text: 'I jump between too many ideas and lose direction' },
  { id: 'D', text: 'I become fixated on predicting exactly what will happen' },
  { id: 'E', text: 'I become blunt, controlling, or overly focused on results' },
  { id: 'F', text: 'I become rigidly fixated on one thought or explanation and cannot see past it' },
  { id: 'G', text: 'I become emotionally sharp or cutting in ways that surprise even me' },
  { id: 'H', text: 'Feelings I have been holding quietly build up until I need to pour them out' },
]

const PATH_B_Q3 = {
  A: { a: { label: 'I support my thinking by staying organized and productive', type: 'Blueprint' }, b: { label: 'I support my thinking by attuning to people and connection', type: 'Vision' } },
  B: { a: { label: 'I support my thinking by checking internal logic', type: 'Hypothesis' }, b: { label: 'I support my thinking by staying true to personal values', type: 'Possibility' } },
  C: { a: { label: 'I support my decisions by attuning to people and harmony', type: 'Memory' }, b: { label: 'I support my decisions by organizing and getting results', type: 'Protocol' } },
  D: { a: { label: 'I support my thinking by checking internal logic', type: 'Opportunity' }, b: { label: 'I support my thinking by staying true to personal values', type: 'Moment' } },
  E: { a: { label: 'I support my thinking by exploring multiple possibilities', type: 'Ideal' }, b: { label: 'I support my thinking by responding to what is real right now', type: 'Impression' } },
  F: { a: { label: 'I support my decisions by seeing long-range patterns', type: 'Narrative' }, b: { label: 'I support my decisions by referencing past experience', type: 'Consensus' } },
  G: { a: { label: 'I support my thinking by exploring multiple possibilities', type: 'Framework' }, b: { label: 'I support my thinking by responding to what is real right now', type: 'Mechanism' } },
  H: { a: { label: 'I support my decisions by seeing long-range patterns', type: 'Strategy' }, b: { label: 'I support my decisions by referencing past experience', type: 'Standard' } },
}

const TYPE_MAP_A = {
  'Ni+E+Te': 'Strategy', 'Ni+I+Te': 'Blueprint', 'Ni+E+Fe': 'Narrative', 'Ni+I+Fe': 'Vision',
  'Ne+E+Ti': 'Hypothesis', 'Ne+I+Ti': 'Framework', 'Ne+E+Fi': 'Possibility', 'Ne+I+Fi': 'Ideal',
  'Si+E+Te': 'Standard', 'Si+I+Te': 'Protocol', 'Si+E+Fe': 'Consensus', 'Si+I+Fe': 'Memory',
  'Se+E+Ti': 'Opportunity', 'Se+I+Ti': 'Mechanism', 'Se+E+Fi': 'Moment', 'Se+I+Fi': 'Impression',
}


const CONTEXT_PREFIXES = {
  outward: 'In a group or conversation, ',
  inward: 'On your own or internally, ',
  bridge: 'When balancing expectations, ',
}

function lowerConfidence(conf) {
  if (conf === 'high') return 'moderate'
  if (conf === 'moderate') return 'low'
  return 'low'
}

export default function HeadAssessment({ onComplete, scenarioContext }) {
  const [phase, setPhase] = useState('pathSelect')
  const [answers, setAnswers] = useState({})
  const [pathAStep, setPathAStep] = useState(0)
  const [branch, setBranch] = useState(null)
  const [bothBranches, setBothBranches] = useState(false) // for 2-2 tie
  const [pathBChoice, setPathBChoice] = useState(null)
  const [pathBConfirmed, setPathBConfirmed] = useState(false)
  const [resultData, setResultData] = useState(null)
  // head_confirmation state — supports up to 2 sequential pairs
  const [pendingConfirmationPairs, setPendingConfirmationPairs] = useState([])
  const [currentPairIndex, setCurrentPairIndex] = useState(0)
  const [resolvedPairs, setResolvedPairs] = useState([]) // { key, chosenStack }[]
  const [confirmationAlgorithmStack, setConfirmationAlgorithmStack] = useState(null)
  const [confirmationPairsFired, setConfirmationPairsFired] = useState([])
  const [confirmationOutcomeResult, setConfirmationOutcomeResult] = useState(null)
  const [confirmationUserStack, setConfirmationUserStack] = useState(null)

  const prefix = CONTEXT_PREFIXES[scenarioContext] || ''

function getPathAQuestion(step) {
    if (step < 4) return PREFILTER_QS[step]
    if (step >= 4 && step < 8) {
      if (branch === 'perceiving') return PERCEIVING_QS[step - 4]
      if (branch === 'judging') return JUDGING_QS[step - 4]
      return null
    }
    if (step === 8) return Q9_OBJ
    if (step === 9) return Q9B_OBJ
    if (step === 10) return branch === 'perceiving' ? Q10_PERCEIVING : Q10_JUDGING
    return null
  }

  function pickPathA(choice) {
    const q = getPathAQuestion(pathAStep)
    const newAnswers = { ...answers, [q.id]: choice }
    setAnswers(newAnswers)

    // After prefilter (step 3), determine branch
    if (pathAStep === 3) {
      let aCount = 0, bCount = 0
      PREFILTER_QS.forEach(pq => { if (newAnswers[pq.id] === 'a') aCount++; else bCount++ })
      if (aCount === bCount) {
        // 2-2 tie: score both branches, decide after Q8
        setBranch('perceiving')
        setBothBranches(true)
      } else {
        setBranch(aCount > bCount ? 'perceiving' : 'judging')
      }
      setPathAStep(4)
      return
    }

    // If we hit end of branch questions in tie mode, switch to judging branch
    if (pathAStep === 7 && bothBranches && branch === 'perceiving') {
      setBranch('judging')
      setPathAStep(4)
      return
    }

    // After judging branch in tie mode, resolve which branch wins
    if (pathAStep === 7 && bothBranches && branch === 'judging') {
      const resolvedBranch = resolveTieBranch(newAnswers)
      setBranch(resolvedBranch)
      setBothBranches(false)
      setPathAStep(8)
      return
    }

    if (pathAStep === 10) {
      resolvePathA(newAnswers)
      return
    }

    setPathAStep(pathAStep + 1)
  }

  function resolveTieBranch(ans) {
    // Score perceiving branch spread
    const Se = (ans.P5 === 'a' ? 1 : 0) + (ans.P7 === 'a' ? 1 : 0)
    const Si = (ans.P5 === 'b' ? 1 : 0) + (ans.P7 === 'b' ? 1 : 0)
    const Ne = (ans.P6 === 'a' ? 1 : 0) + (ans.P8 === 'a' ? 1 : 0)
    const Ni = (ans.P6 === 'b' ? 1 : 0) + (ans.P8 === 'b' ? 1 : 0)
    const pScores = [Se, Si, Ne, Ni]
    const pSpread = Math.max(...pScores) - Math.min(...pScores)

    // Score judging branch spread
    const Te = (ans.J5 === 'a' ? 1 : 0) + (ans.J7 === 'a' ? 1 : 0)
    const Ti = (ans.J5 === 'b' ? 1 : 0) + (ans.J7 === 'b' ? 1 : 0)
    const Fe = (ans.J6 === 'a' ? 1 : 0) + (ans.J8 === 'a' ? 1 : 0)
    const Fi = (ans.J6 === 'b' ? 1 : 0) + (ans.J8 === 'b' ? 1 : 0)
    const jScores = [Te, Ti, Fe, Fi]
    const jSpread = Math.max(...jScores) - Math.min(...jScores)

    // Higher internal consistency = higher spread = clearer signal
    return pSpread >= jSpread ? 'perceiving' : 'judging'
  }

  function resolvePathA(ans) {
    // E/I from Q9 + Q9b: both A = E, both B = I, split = use Q9
    let finalEI
    const eiConsistent = ans.Q9 === ans.Q9b
    if (ans.Q9 === 'a' && ans.Q9b === 'a') finalEI = 'E'
    else if (ans.Q9 === 'b' && ans.Q9b === 'b') finalEI = 'I'
    else finalEI = ans.Q9 === 'a' ? 'E' : 'I' // tie goes to Q9
    const eiConfidence = eiConsistent ? 'high' : 'low'

    let dominant, auxFromQ10
    if (branch === 'perceiving') {
      const Se = (ans.P5 === 'a' ? 1 : 0) + (ans.P7 === 'a' ? 1 : 0)
      const Si = (ans.P5 === 'b' ? 1 : 0) + (ans.P7 === 'b' ? 1 : 0)
      const Ne = (ans.P6 === 'a' ? 1 : 0) + (ans.P8 === 'a' ? 1 : 0)
      const Ni = (ans.P6 === 'b' ? 1 : 0) + (ans.P8 === 'b' ? 1 : 0)
      const sMax = Se >= Si ? 'Se' : 'Si'
      const nMax = Ne >= Ni ? 'Ne' : 'Ni'
      dominant = (Se + Si) >= (Ne + Ni) ? sMax : nMax
      // Q10 perceiving: a = Ne aux, b = Ni aux → maps to judging aux
      auxFromQ10 = ans.Q10 === 'a' ? 'Ti' : 'Fi'
      // For Se/Ne dominants → aux is Ti or Fi
      // For Si/Ni dominants → aux is Te or Fe
      if (dominant === 'Si' || dominant === 'Ni') {
        auxFromQ10 = ans.Q10 === 'a' ? 'Te' : 'Fe'
      }
    } else {
      const Te = (ans.J5 === 'a' ? 1 : 0) + (ans.J7 === 'a' ? 1 : 0)
      const Ti = (ans.J5 === 'b' ? 1 : 0) + (ans.J7 === 'b' ? 1 : 0)
      const Fe = (ans.J6 === 'a' ? 1 : 0) + (ans.J8 === 'a' ? 1 : 0)
      const Fi = (ans.J6 === 'b' ? 1 : 0) + (ans.J8 === 'b' ? 1 : 0)
      const tMax = Te >= Ti ? 'Te' : 'Ti'
      const fMax = Fe >= Fi ? 'Fe' : 'Fi'
      dominant = (Te + Ti) >= (Fe + Fi) ? tMax : fMax
      // Q10 judging: a = Fe aux, b = Ti aux → maps to perceiving aux
      auxFromQ10 = ans.Q10 === 'a' ? 'Ni' : 'Si'
      // For Te/Fe dominants → aux is Ni or Si
      // For Ti/Fi dominants → aux is Ne or Se
      if (dominant === 'Ti' || dominant === 'Fi') {
        auxFromQ10 = ans.Q10 === 'a' ? 'Ne' : 'Se'
      }
    }

    // Build type key: perception + E/I + judgment
    let typeKey
    if (branch === 'perceiving') {
      typeKey = `${dominant}+${finalEI}+${auxFromQ10}`
    } else {
      typeKey = `${auxFromQ10}+${finalEI}+${dominant}`
    }

    let resultType = TYPE_MAP_A[typeKey]

    // Validate: aux cannot equal dominant
    let stackValid = true
    if (branch === 'perceiving' && [dominant].includes(auxFromQ10)) stackValid = false
    if (branch === 'judging' && [dominant].includes(auxFromQ10)) stackValid = false

    // PJ confidence
    let pfA = 0, pfB = 0
    PREFILTER_QS.forEach(q => { if (ans[q.id] === 'a') pfA++; else pfB++ })
    const pjMargin = Math.abs(pfA - pfB)
    let confidence = pjMargin >= 3 ? 'high' : pjMargin >= 2 ? 'high' : pjMargin === 1 ? 'moderate' : 'low'

    // Lower if E/I inconsistent
    if (!eiConsistent) confidence = lowerConfidence(confidence)

    // Lower if stack invalid
    if (!stackValid) confidence = lowerConfidence(confidence)

    // Fallback if no match
    if (!resultType) {
      resultType = typeKey
      confidence = 'low'
    }

    // Difficulty pair check — determine secondary
    let softSecondary = null
    if (resultType && confidence !== 'high') {
      // Find the closest alternate by flipping E/I
      const altEI = finalEI === 'E' ? 'I' : 'E'
      let altKey
      if (branch === 'perceiving') altKey = `${dominant}+${altEI}+${auxFromQ10}`
      else altKey = `${auxFromQ10}+${altEI}+${dominant}`
      softSecondary = TYPE_MAP_A[altKey] || null
    }

    const stack = TYPE_TO_STACK[resultType] || `${dominant}-${auxFromQ10}`
    const result = { resultType, stack, confidence, path: 'A', eiConfidence, softSecondary }
    setResultData(result)

    const pairs = buildConfirmationPairs(dominant, auxFromQ10, confidence)
    if (pairs.length > 0) {
      setPendingConfirmationPairs(pairs)
      setCurrentPairIndex(0)
      setResolvedPairs([])
      setConfirmationAlgorithmStack(result.stack)
      setPhase('head_confirmation')
    } else {
      setPhase('result')
    }
  }

  // Path B handlers
  function pickPathBStress(option) {
    setPathBChoice(option)
    setPhase('pathB_q2')
  }

  function confirmPathB(choice) {
    setPathBConfirmed(choice === 'a')
    setPhase('pathB_q3')
  }

  function pickPathBFinal(choice) {
    const mapping = PATH_B_Q3[pathBChoice]
    const result = mapping[choice]
    const confidence = pathBConfirmed ? 'moderate' : 'low'
    const stack = TYPE_TO_STACK[result.type] || result.type
    setPhase('result')
    setResultData({ resultType: result.type, stack, confidence, path: 'B', eiConfidence: null, softSecondary: null })
  }

  function handleConfirmationSubmit(outcome) {
    const currentKey = pendingConfirmationPairs[currentPairIndex]
    const firedSoFar = [...pendingConfirmationPairs.slice(0, currentPairIndex + 1)]

    if (outcome.result === 'uncertain') {
      setResultData(prev => ({ ...prev, confidence: 'low' }))
      setConfirmationPairsFired(firedSoFar)
      setConfirmationOutcomeResult('uncertain')
      setConfirmationUserStack(null)
      setPhase('head_confirmation_retake')
      return
    }

    const newResolved = [...resolvedPairs, { key: currentKey, chosenStack: outcome.userStack }]
    setResolvedPairs(newResolved)

    // More pairs remain — advance to next
    if (currentPairIndex < pendingConfirmationPairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1)
      return
    }

    // All pairs resolved — record fired pairs and check consistency
    setConfirmationPairsFired(firedSoFar)
    const allStacks = newResolved.map(r => r.chosenStack)
    const consistent = allStacks.every(s => s === allStacks[0])

    if (!consistent) {
      setResultData(prev => ({ ...prev, confidence: 'low' }))
      setConfirmationOutcomeResult('inconsistent')
      setPhase('head_confirmation_retake')
      return
    }

    const finalStack = allStacks[0]
    const agreed = finalStack === confirmationAlgorithmStack

    if (agreed) {
      setResultData(prev => ({ ...prev, confidence: 'high' }))
      setConfirmationOutcomeResult('agreed')
      setConfirmationUserStack(null)
    } else {
      setResultData(prev => ({
        ...prev,
        stack: finalStack,
        resultType: Object.entries(TYPE_TO_STACK).find(([, v]) => v === finalStack)?.[0] ?? prev.resultType,
        softSecondary: prev.stack,
        confidence: 'low',
      }))
      setConfirmationOutcomeResult('disagreed')
      setConfirmationUserStack(finalStack)
    }
    setPhase('result')
  }

  function handleContinue() {
    setPhase('done')
    onComplete({
      resultType: resultData.resultType,
      stack: resultData.stack,
      confidence: resultData.confidence,
      path: resultData.path,
      eiConfidence: resultData.eiConfidence,
      softSecondary: resultData.softSecondary,
      confirmationPairsFired: confirmationPairsFired.length > 0 ? confirmationPairsFired : null,
      confirmationResult: confirmationOutcomeResult,
      confirmationUserStack: confirmationUserStack,
    })
  }

  // RENDERS

  if (phase === 'pathSelect') {
    return (
      <div style={wrap}><style>{css}</style>
        <div style={cardWrap}>
          <div style={progHeader}><div style={progMeta}><span style={progPhase}>Head Assessment</span></div></div>
          <p style={{ ...prompt, marginBottom: '0.75rem' }}>How are you feeling right now?</p>
          <p style={subPrompt}>This determines which version of the assessment you'll take.</p>
          <div style={opts}>
            <button style={optionBtn} onClick={() => setPhase('pathA')}>
              <span style={optionText}>I feel relatively steady, clear, and like myself</span>
              <span style={tagMuted}>Path A — 11 questions</span>
            </button>
            <button style={optionBtn} onClick={() => setPhase('pathB_q1')}>
              <span style={optionText}>I feel overwhelmed, reactive, or not like myself</span>
              <span style={tagMuted}>Path B — 3 questions</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'pathA') {
    const q = getPathAQuestion(pathAStep)
    if (!q) return null
    const totalA = 11
    const pct = Math.round((pathAStep / totalA) * 100)
    const showPrefix = prefix && pathAStep >= 4 && pathAStep < 8

    let stepLabel = 'Pre-filter'
    if (pathAStep >= 4 && pathAStep < 8) stepLabel = bothBranches ? `${branch === 'perceiving' ? 'Perceiving' : 'Judging'} branch (tiebreak)` : `${branch === 'perceiving' ? 'Perceiving' : 'Judging'} branch`
    else if (pathAStep === 8) stepLabel = 'Orientation'
    else if (pathAStep === 9) stepLabel = 'Orientation (confirm)'
    else if (pathAStep === 10) stepLabel = 'Auxiliary'

    return (
      <div style={wrap}><style>{css}</style>
        <div style={cardWrap}>
          <div style={progHeader}>
            <div style={progMeta}>
              <span style={progPhase}>{stepLabel}</span>
              <span style={progCount}>Q{pathAStep + 1} of {totalA}</span>
            </div>
            <div style={progTrack}><div style={{ ...progFill, width: `${pct}%` }} /></div>
          </div>
          <p style={prompt}>{showPrefix ? prefix : ''}Which feels more consistently true?</p>
          <div style={opts}>
            <button style={optionBtn} onClick={() => pickPathA('a')}>
              <span style={optionLabel}>A</span><span style={optionText}>{q.a}</span>
            </button>
            <button style={optionBtn} onClick={() => pickPathA('b')}>
              <span style={optionLabel}>B</span><span style={optionText}>{q.b}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'pathB_q1') {
    return (
      <div style={wrap}><style>{css}</style>
        <div style={cardWrap}>
          <div style={progHeader}><div style={progMeta}><span style={progPhase}>Stress pattern</span><span style={progCount}>Q1 of 3</span></div><div style={progTrack}><div style={{ ...progFill, width: '0%' }} /></div></div>
          <p style={prompt}>Which sounds most like you when things get really hard?</p>
          <p style={subPrompt}>Answer based on how you tend to react when overwhelmed, under pressure, or not like yourself.</p>
          <div style={opts}>
            {PATH_B_OPTIONS.map(opt => (
              <button key={opt.id} style={optionBtn} onClick={() => pickPathBStress(opt.id)}>
                <span style={optionLabel}>{opt.id}</span><span style={optionText}>{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'pathB_q2') {
    return (
      <div style={wrap}><style>{css}</style>
        <div style={cardWrap}>
          <div style={progHeader}><div style={progMeta}><span style={progPhase}>Confirm</span><span style={progCount}>Q2 of 3</span></div><div style={progTrack}><div style={{ ...progFill, width: '33%' }} /></div></div>
          <p style={prompt}>Does this feel accurate?</p>
          <p style={subPrompt}>"{PATH_B_OPTIONS.find(o => o.id === pathBChoice)?.text}"</p>
          <div style={opts}>
            <button style={optionBtn} onClick={() => confirmPathB('a')}><span style={optionText}>Yes, this feels accurate and familiar under stress</span></button>
            <button style={optionBtn} onClick={() => confirmPathB('b')}><span style={optionText}>This feels somewhat off or inconsistent</span></button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'pathB_q3') {
    const mapping = PATH_B_Q3[pathBChoice]
    return (
      <div style={wrap}><style>{css}</style>
        <div style={cardWrap}>
          <div style={progHeader}><div style={progMeta}><span style={progPhase}>Final question</span><span style={progCount}>Q3 of 3</span></div><div style={progTrack}><div style={{ ...progFill, width: '66%' }} /></div></div>
          <p style={prompt}>Which feels more true?</p>
          <div style={opts}>
            <button style={optionBtn} onClick={() => pickPathBFinal('a')}><span style={optionLabel}>A</span><span style={optionText}>{mapping.a.label}</span></button>
            <button style={optionBtn} onClick={() => pickPathBFinal('b')}><span style={optionLabel}>B</span><span style={optionText}>{mapping.b.label}</span></button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'head_confirmation') {
    const currentKey = pendingConfirmationPairs[currentPairIndex]
    if (!currentKey || !CONFIRMATION_PAIRS[currentKey]) return null
    const total = pendingConfirmationPairs.length
    const step = currentPairIndex + 1
    return (
      <div style={wrap}><style>{css}</style>
        {total > 1 && (
          <div style={{ ...progHeader, paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
            <div style={progMeta}>
              <span style={progPhase}>Confirmation</span>
              <span style={progCount}>{step} of {total}</span>
            </div>
            <div style={progTrack}><div style={{ ...progFill, width: `${Math.round((step / total) * 100)}%` }} /></div>
          </div>
        )}
        <HeadConfirmation
          pairData={CONFIRMATION_PAIRS[currentKey]}
          algorithmStack={confirmationAlgorithmStack}
          onSubmit={handleConfirmationSubmit}
        />
      </div>
    )
  }

  if (phase === 'head_confirmation_retake') {
    return (
      <div style={wrap}><style>{css}</style>
        <div style={cardWrap}>
          <div style={progHeader}><div style={progMeta}><span style={progPhase}>Unclear result</span></div></div>
          <p style={prompt}>Your responses suggest genuine uncertainty about which pattern fits.</p>
          <p style={subPrompt}>You can continue with your current result at low confidence, or take the shorter Path B version of the assessment instead.</p>
          <div style={opts}>
            <button style={optionBtn} onClick={() => setPhase('result')}>
              <span style={optionText}>Continue with current result</span>
              <span style={tagMuted}>Low confidence — you can revisit this later</span>
            </button>
            <button style={optionBtn} onClick={() => {
              setPhase('pathB_q1')
              setResultData(null)
              setPendingConfirmationPairs([])
              setCurrentPairIndex(0)
              setResolvedPairs([])
            }}>
              <span style={optionText}>Take the Path B assessment instead</span>
              <span style={tagMuted}>3 questions — stress pattern approach</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'result' && resultData) {
    return (
      <HeadResult
        resultType={resultData.resultType}
        stack={resultData.stack}
        confidence={resultData.confidence}
        softSecondary={resultData.softSecondary}
        path={resultData.path}
        onContinue={handleContinue}
      />
    )
  }

  return (
    <div style={wrap}><style>{css}</style>
      <div style={cardWrap}><div style={{ textAlign: 'center', padding: '2rem 0' }}><div style={{ fontSize: 32, marginBottom: '0.75rem' }}>✓</div><div style={{ fontSize: 15, color: '#5f5e5a' }}>Processing your Head result...</div></div></div>
    </div>
  )
}

const wrap = { maxWidth: 560, width: '100%', margin: '0 auto' }
const cardWrap = { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem 1rem 2rem' }
const progHeader = { marginBottom: '1.5rem' }
const progMeta = { display: 'flex', justifyContent: 'space-between', marginBottom: 10 }
const progPhase = { fontSize: 13, fontWeight: 500, color: '#5f5e5a' }
const progCount = { fontSize: 12, color: '#888780' }
const progTrack = { height: 5, background: 'rgba(0,0,0,0.1)', borderRadius: 99, overflow: 'hidden' }
const progFill = { height: '100%', borderRadius: 99, background: '#185fa5', transition: 'width .4s cubic-bezier(.4,0,.2,1)' }
const prompt = { fontSize: 15, color: '#1a1a18', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.6 }
const subPrompt = { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: '1.25rem', lineHeight: 1.5, fontStyle: 'italic' }
const opts = { display: 'flex', flexDirection: 'column', gap: 12 }
const optionBtn = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 12, padding: '1.25rem 1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, transition: 'border-color .15s, background .15s, transform .1s', fontFamily: 'inherit' }
const optionLabel = { fontSize: 12, fontWeight: 600, color: '#888', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 4, alignSelf: 'flex-start' }
const optionText = { fontSize: 14, color: '#1a1a18', lineHeight: 1.55 }
const tagMuted = { fontSize: 11, color: '#aaa', marginTop: 4 }
const css = `button:hover { border-color: rgba(0,0,0,0.3) !important; background: #f1efe8 !important; } button:active { transform: scale(0.98); }`
