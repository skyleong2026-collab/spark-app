import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAssessment } from '../context/AssessmentContext'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useSaveResults } from '../hooks/useSaveResults'
import BetaFeedbackModal from '../components/BetaFeedbackModal'

const HEART_TYPE_NAMES = {
  1: 'Conviction',
  2: 'Devotion',
  3: 'Ambition',
  4: 'Longing',
  5: 'Wonder',
  6: 'Vigilance',
  7: 'Anticipation',
  8: 'Intensity',
  9: 'Serenity',
}

const HEART_DESC = {
  Conviction: 'You lead from principle and a deep need to improve what\'s broken',
  Devotion: 'You lead from your heart and a deep need to be needed',
  Ambition: 'You lead from achievement and a deep need to be seen as successful',
  Longing: 'You lead from feeling and a deep need for meaning and identity',
  Anticipation: 'You lead from possibility and a deep need to experience everything',
  Vigilance: 'You lead from loyalty and a deep need for security and certainty',
  Wonder: 'You lead from curiosity and a deep need to understand',
  Intensity: 'You lead from strength and a deep need for control and truth',
  Serenity: 'You lead from peace and a deep need for harmony and belonging',
}

const HEAD_DESC = {
  Blueprint: 'You think in systems and long-range vision',
  Vision: 'You think in meaning and human potential',
  Hypothesis: 'You think in possibilities and love debating ideas',
  Possibility: 'You think in connections and what could be',
  Framework: 'You think in logic and precise internal models',
  Ideal: 'You think in values and what feels deeply true',
  Strategy: 'You think in outcomes and how to lead people there',
  Narrative: 'You think in people and how to move them forward',
  Protocol: 'You think in systems and proven reliable process',
  Memory: 'You think in care and maintaining what matters',
  Standard: 'You think in structure and getting things done right',
  Consensus: 'You think in harmony and keeping people together',
  Mechanism: 'You think in how things actually work',
  Impression: 'You think in beauty and authentic experience',
  Opportunity: 'You think in action and what\'s possible right now',
  Moment: 'You think in experience and bringing people joy',
}

const HAND_NAMES = {
  WI: 'The Lantern', IW: 'The Lantern',
  ID: 'The Forge', DI: 'The Forge',
  DG: 'The Compass', GD: 'The Compass',
  GE: 'The Drum', EG: 'The Drum',
  ET: 'The Scaffold', TE: 'The Scaffold',
  WD: 'The Lantern', DW: 'The Lantern',
  WG: 'The Lantern', GW: 'The Lantern',
  WE: 'The Lantern', EW: 'The Lantern',
  WT: 'The Lantern', TW: 'The Lantern',
  IG: 'The Forge', GI: 'The Forge',
  IE: 'The Forge', EI: 'The Forge',
  IT: 'The Forge', TI: 'The Forge',
  DE: 'The Compass', ED: 'The Compass',
  DT: 'The Compass', TD: 'The Compass',
  GT: 'The Drum', TG: 'The Drum',
}

const HAND_DESC = {
  'The Lantern': 'You naturally wonder why and ask the questions others haven\'t thought to ask',
  'The Forge': 'You naturally invent and create original solutions from scratch',
  'The Compass': 'You naturally discern what\'s right and what will work before others can see it',
  'The Drum': 'You naturally galvanize people and move them to action',
  'The Scaffold': 'You naturally enable others and provide what people need to succeed',
  'The Anchor': 'You naturally finish and push through until the work is actually done',
}

const GENIUS_ID_TO_NAME = {
  W: 'The Lantern', I: 'The Forge', D: 'The Compass',
  G: 'The Drum', E: 'The Scaffold', T: 'The Anchor',
}

const GENIUS_ID_TO_SHORT = {
  W: 'Wonder', I: 'Invention', D: 'Discernment',
  G: 'Galvanizing', E: 'Enablement', T: 'Tenacity',
}

const FRUST_DESC = {
  W: 'Sitting with open questions drains you — you want clarity, not pondering',
  I: 'Creating from scratch exhausts you — you prefer building on what exists',
  D: 'Gut-checking ideas feels like a burden — you\'d rather just move forward',
  G: 'Rallying others takes everything out of you — motivation feels forced',
  E: 'Supporting someone else\'s agenda drains you — you need your own direction',
  T: 'Pushing through tedious details is exhausting — you lose steam after the interesting part',
}

function getHandLabel(handType) {
  if (!handType) return null
  return HAND_NAMES[handType] || handType
}

function idsToNames(ids) {
  if (!ids) return []
  return ids.map(id => GENIUS_ID_TO_NAME[id] || id)
}

function idsToShortNames(ids) {
  if (!ids) return []
  return ids.map(id => GENIUS_ID_TO_SHORT[id] || id)
}

export default function Results() {
  const { handResult, setHandResult, handType, handGeniusTypes, handFrustrationTypes, heartType, heartResult, headType, headResult, setHandType, setHandGeniusTypes, setHandFrustrationTypes, setHeartType, setHeadType, clearAll } = useAssessment()
  const handComplete = !!(handResult || handType)
  const { user, loading: authLoading } = useAuth()
  const { saveResults } = useSaveResults()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [restored, setRestored] = useState(false)
  const [tier, setTier] = useState(null)
  const [tierLoading, setTierLoading] = useState(false)
  const [synthTitle, setSynthTitle] = useState(null)
  const [synthText, setSynthText] = useState(null)
  const [synthSections, setSynthSections] = useState({ heart: null, head: null, hand: null, intersection: null })
  const [synthGenerating, setSynthGenerating] = useState(false)
  const paymentSuccess = searchParams.get('payment') === 'success'
  const unlocked = tier === 'individual' || tier === 'pro'

  // Restore results + tier from Supabase profile if returning from Stripe
  useEffect(() => {
    if (restored || authLoading) return
    if (!user) { setRestored(true); return }

    async function restoreFromProfile(delay = 0) {
      if (delay > 0) await new Promise(r => setTimeout(r, delay))

      // Query profiles (v1 data + tier + synthesis)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, hand_type, hand_frustration_types, heart_type, head_type, tier, tier2_title, tier2_synthesis, tier2_heart_section, tier2_head_section, tier2_hand_section, tier2_intersection_section')
        .eq('user_id', user.id)
        .single()

      // Query hand_assessments for v2 data (most recent row)
      const { data: handRow } = await supabase
        .from('hand_assessments')
        .select('assessment_version, session_id, phase1_responses, phase2_responses, phase1_completed_pairs, drain_scores, energy_scores, energy_phases, drain_phases, neutral_phases, drain_confidence, energy_confidence, overall_confidence, early_lock_triggered, locked_phases, randomization_seed, pair_order')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Restore Hand v2 result if available
      if (handRow && !handResult) {
        // Construct HandScoringResult-shaped object from DB row.
        // All fields present in the DB row map directly to the interface.
        setHandResult({
          assessment_version: handRow.assessment_version,
          session_id: handRow.session_id,
          phase1_responses: handRow.phase1_responses,
          phase2_responses: handRow.phase2_responses,
          phase1_completed_pairs: handRow.phase1_completed_pairs,
          drain_scores: handRow.drain_scores,
          energy_scores: handRow.energy_scores,
          energy_phases: handRow.energy_phases,
          drain_phases: handRow.drain_phases,
          neutral_phases: handRow.neutral_phases,
          drain_confidence: handRow.drain_confidence,
          energy_confidence: handRow.energy_confidence,
          overall_confidence: handRow.overall_confidence,
          early_lock_triggered: handRow.early_lock_triggered,
          locked_phases: handRow.locked_phases,
          randomization_seed: handRow.randomization_seed,
          pair_order: handRow.pair_order,
        })
      }

      if (data && !error) {
        if (data.id) setAssessmentId(data.id)
        // v1 Hand restore (only if no v2 row was found — v1 fields are legacy-only)
        if (!handRow) {
          if (data.hand_type && !handType) setHandType(data.hand_type)
          if (data.hand_type && !handGeniusTypes) {
            // Derive genius IDs from the two-letter hand_type code
            setHandGeniusTypes(data.hand_type.split(''))
          }
          if (data.hand_frustration_types && !handFrustrationTypes) {
            setHandFrustrationTypes(data.hand_frustration_types)
          }
        }
        if (data.heart_type && !heartType) setHeartType(data.heart_type)
        if (data.head_type && !headType) setHeadType(data.head_type)
        if (data.tier) setTier(data.tier)
        if (data.tier2_title) setSynthTitle(data.tier2_title)
        if (data.tier2_synthesis) setSynthText(data.tier2_synthesis)
        if (data.tier2_heart_section || data.tier2_head_section || data.tier2_hand_section || data.tier2_intersection_section) {
          setSynthSections({
            heart: data.tier2_heart_section || null,
            head: data.tier2_head_section || null,
            hand: data.tier2_hand_section || null,
            intersection: data.tier2_intersection_section || null,
          })
        }
      }
      return data
    }

    async function run() {
      if (paymentSuccess) {
        setTierLoading(true)
        // First check immediately
        const first = await restoreFromProfile(0)
        if (first?.tier === 'individual' || first?.tier === 'pro') {
          setTierLoading(false)
          setRestored(true)
          return
        }
        // Webhook may not have fired yet — retry after 2s
        const second = await restoreFromProfile(2000)
        if (!second?.tier || second.tier === 'free') {
          // One more try after another 3s
          await restoreFromProfile(3000)
        }
        setTierLoading(false)
      } else {
        await restoreFromProfile(0)
      }
      setRestored(true)
    }
    run()
  }, [user, authLoading, paymentSuccess, restored, handResult, handType, heartType, headType, setHandResult, setHandType, setHeartType, setHeadType])

  // Save local assessment results to Supabase once per session for authenticated users.
  // Waits for the DB restore to complete first so we have a full picture before writing.
  // useSaveResults gates on sessionStorage so this only fires once per browser session.
  useEffect(() => {
    if (!user || authLoading) return
    if (!restored) return
    if (!heartType && !headType && !handResult) return
    saveResults()
  }, [user, authLoading, restored])

  // Generate synthesis if unlocked but not yet generated
  useEffect(() => {
    if (!unlocked || !user || !restored) return
    if (synthTitle && (synthSections.heart || synthText)) return // already have it
    if (synthGenerating) return

    async function generate() {
      setSynthGenerating(true)
      try {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-synthesis`
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ userId: user.id }),
        })
        const data = await response.json()
        if (response.ok && data.title) {
          setSynthTitle(data.title)
          setSynthText(data.synthesis || '')
          if (data.heartSection || data.headSection || data.handSection || data.intersectionSection) {
            setSynthSections({
              heart: data.heartSection || null,
              head: data.headSection || null,
              hand: data.handSection || null,
              intersection: data.intersectionSection || null,
            })
          }
        } else {
          console.error('[Synthesis] Error:', data.error || 'Unknown error')
        }
      } catch (err) {
        console.error('[Synthesis] Failed:', err)
      } finally {
        setSynthGenerating(false)
      }
    }
    generate()
  }, [unlocked, user, restored, synthTitle, synthText, synthGenerating])

  const allComplete = handComplete && heartType && headType

  const remaining = [
    !heartType && { label: 'Heart', path: '/assessment/heart' },
    !headType && { label: 'Head', path: '/assessment/head' },
    !handComplete && { label: 'Hand', path: '/assessment/hand' },
  ].filter(Boolean)

  // v1 fallback display helpers
  const handLabel = getHandLabel(handType)
  const handDesc = handLabel ? HAND_DESC[handLabel] : null

  // Heart v2 result shape uses final_confidence / final_secondary (an integer
  // EnneagramType), not confidence / softSecondary. Map the secondary type to
  // its display name so the confidence qualifier renders correctly.
  const heartConfidence = heartResult?.final_confidence
  const heartSecondaryName = heartResult?.final_secondary != null
    ? HEART_TYPE_NAMES[heartResult.final_secondary] ?? null
    : null
  // The image/shame triad is Enneagram types 2, 3, 4 (heartType may be a
  // numeric string from storage or an integer, so coerce before comparing).
  const heartIsShameTriad = [2, 3, 4].includes(Number(heartType))

  const [assessmentId, setAssessmentId] = useState(null)
  const [checkoutError, setCheckoutError] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const feedbackTriggeredRef = useRef(false)

  // Show feedback modal 3s after synthesis content is visible (once per assessment)
  useEffect(() => {
    if (!unlocked) return
    if (!synthTitle) return
    if (!synthSections.heart && !synthText) return
    if (feedbackTriggeredRef.current) return

    if (!assessmentId) return

    try {
      if (localStorage.getItem(`spark_feedback_shown_${assessmentId}`) === 'true') return
    } catch { /* localStorage unavailable — non-fatal */ }

    feedbackTriggeredRef.current = true
    const t = setTimeout(() => setShowFeedback(true), 3000)
    return () => clearTimeout(t)
  }, [unlocked, synthTitle, synthSections.heart, synthText, assessmentId])

  function handleRetake() {
    clearAll()
    navigate('/assessment/hand')
  }

  async function handleUnlock() {
    setCheckoutError(null)

    console.log('[Checkout] Auth user:', user)
    console.log('[Checkout] Auth user id:', user?.id)
    console.log('[Checkout] Auth user email:', user?.email)

    if (authLoading) {
      console.log('[Checkout] Auth still loading — waiting')
      return
    }
    if (!user) {
      console.log('[Checkout] No user — redirecting to /signin')
      navigate('/signin')
      return
    }

    setCheckoutLoading(true)

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`
    console.log('[Checkout] Calling Edge Function:', fnUrl)
    console.log('[Checkout] Payload:', { userId: user.id, email: user.email })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session — please sign in again')

      console.log('[Checkout] JWT present:', !!session.access_token)

      const response = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      console.log('[Checkout] Response status:', response.status)
      const data = await response.json()
      console.log('[Checkout] Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || `Edge Function returned ${response.status}`)
      }

      if (data?.url) {
        // Persist to localStorage before leaving the SPA
        try {
          if (handResult) localStorage.setItem('spark_hand_result', JSON.stringify(handResult))
          if (handType) localStorage.setItem('spark_hand', handType)
          if (heartType) localStorage.setItem('spark_heart', heartType)
          if (headType) localStorage.setItem('spark_head', headType)
        } catch { /* localStorage unavailable — non-fatal */ }
        console.log('[Checkout] Redirecting to:', data.url)
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned from Edge Function')
      }
    } catch (err) {
      console.error('[Checkout] Failed:', err)
      setCheckoutError(err.message || 'Something went wrong creating the checkout session')
      setCheckoutLoading(false)
    }
  }

  if (!allComplete) {
    return (
      <div style={page}>
        <style>{css}</style>
        <div style={container}>
          <h1 style={pageTitle}>Your SPARK Profile</h1>
          <p style={pageSubtitle}>Complete all three assessments to unlock your full profile.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            {heartType && <ResultCard dimension="Heart" icon="❤️" typeName={HEART_TYPE_NAMES[heartType] ?? heartType} desc={HEART_DESC[HEART_TYPE_NAMES[heartType]]} color="#c2185b" />}
            {headType && <ResultCard dimension="Head" icon="🧠" typeName={headType} desc={HEAD_DESC[headType]} color="#1565c0" />}
            {handComplete && <HandResultCard handResult={handResult} handType={handType} handGeniusTypes={handGeniusTypes} handLabel={handLabel} handDesc={handDesc} />}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {remaining.map(r => (
              <Link key={r.label} to={r.path} style={nextBtn}>
                Take the {r.label} assessment →
              </Link>
            ))}
          </div>
          <button onClick={handleRetake} style={retakeBtn}>Start over from scratch</button>
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <style>{css}</style>
      <div style={container}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={sparkBadge}>SPARK PROFILE</div>
          <h1 style={{ ...pageTitle, marginBottom: '0.5rem' }}>Your results are in</h1>
          <p style={pageSubtitle}>Three dimensions of how you're wired — what drives you, how you think, and where you contribute.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <ConfidenceCard
            dimension="Heart — What Drives You" icon="❤️" color="#c2185b"
            typeName={HEART_TYPE_NAMES[heartType] ?? heartType} desc={HEART_DESC[HEART_TYPE_NAMES[heartType]]}
            confidence={heartConfidence}
            softSecondary={heartSecondaryName}
            secondaryDesc={heartSecondaryName ? HEART_DESC[heartSecondaryName] : null}
            isShameTriad={heartIsShameTriad}
          />
          <ConfidenceCard
            dimension="Head — How You Think" icon="🧠" color="#1565c0"
            typeName={headType} desc={HEAD_DESC[headType]}
            confidence={headResult?.confidence}
            softSecondary={headResult?.softSecondary}
            secondaryDesc={headResult?.softSecondary ? HEAD_DESC[headResult.softSecondary] : null}
          />
          <HandDetailCard handResult={handResult} handType={handType} handGeniusTypes={handGeniusTypes} handFrustrationTypes={handFrustrationTypes} handLabel={handLabel} />
        </div>

        {/* Synthesis section */}
        {unlocked ? (
          <div style={synthCardUnlocked}>
            {synthTitle && (synthSections.heart || synthText) ? (
              <>
                <div style={synthUnlockedBadge}>✨ YOUR SPARK SYNTHESIS</div>
                <div style={synthTypeLine}>
                  {HEART_TYPE_NAMES[heartType] ?? heartType ?? '—'} · {headType || '—'} · {handResult ? handResult.energy_phases.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' & ') : (handGeniusTypes ? idsToNames(handGeniusTypes).join(' & ') : (handLabel || '—'))}
                </div>
                <h2 style={synthUnlockedTitle}>{synthTitle}</h2>
                <div style={synthDivider} />

                {synthSections.heart ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <SynthSection label="Heart" color="#b5564e" text={synthSections.heart} />
                    <SynthSection label="Head" color="#3a6b48" text={synthSections.head} />
                    <SynthSection label="Hand" color="#C4963A" text={synthSections.hand} />
                    <SynthSection label="The Intersection" color="#2c2825" text={synthSections.intersection} />
                  </div>
                ) : (
                  <p style={synthUnlockedBody}>{synthText}</p>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={spinnerWrap}>
                  <div style={spinner} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a18', marginBottom: '0.5rem' }}>
                  Crafting your SPARK profile...
                </div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>
                  Weaving together your heart, head, and hand into a single portrait.<br />
                  This takes about 10 seconds.
                </div>
              </div>
            )}
          </div>
        ) : tierLoading ? (
          <div style={synthCard}>
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#888', fontSize: 14 }}>
                <div style={{ width: 20, height: 20, border: '2px solid #ccc', borderTop: '2px solid #185fa5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Confirming your payment...
              </div>
            </div>
          </div>
        ) : (
          <div style={synthCard}>
            <div style={synthOverlay}>
              <div style={lockIcon}>🔒</div>
              <div style={synthLockedTitle}>Your SPARK Synthesis</div>
              <p style={synthBody}>
                Your SPARK Profile combines <strong>{HEART_TYPE_NAMES[heartType] ?? heartType}</strong> + <strong>{headType}</strong> + <strong>{handResult ? handResult.energy_phases.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ') : handLabel}</strong> into
                a single synthesis — showing how your motivation, thinking style, and work contribution interact, where
                they align, and where they create tension.
              </p>
              <button onClick={handleUnlock} disabled={checkoutLoading} style={unlockBtn}>
                {checkoutLoading ? 'Redirecting to checkout...' : 'Unlock your full SPARK profile — $19'}
              </button>
              {checkoutError && (
                <div style={{ marginTop: '1rem', padding: '10px 14px', background: '#fcebeb', color: '#a32d2d', borderRadius: 8, fontSize: 13, lineHeight: 1.5, textAlign: 'left', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                  <strong>Checkout error:</strong> {checkoutError}
                </div>
              )}
            </div>
            <div style={blurredContent}>
              <div style={blurLine(100)} />
              <div style={blurLine(85)} />
              <div style={blurLine(92)} />
              <div style={blurLine(70)} />
              <div style={blurLine(88)} />
              <div style={blurLine(60)} />
            </div>
          </div>
        )}

        <button onClick={handleRetake} style={retakeBtn}>Retake assessments</button>
      </div>

      {showFeedback && (
        <BetaFeedbackModal
          assessmentId={assessmentId}
          heartType={HEART_TYPE_NAMES[heartType] ?? String(heartType ?? '')}
          headStack={headResult?.stack || headType || ''}
          handEnergy={handResult?.energy_phases?.map(p => p.charAt(0).toUpperCase() + p.slice(1)) ?? []}
          heartConf={heartConfidence
            ? heartConfidence.charAt(0).toUpperCase() + heartConfidence.slice(1)
            : null}
          headConf={headResult?.confidence
            ? headResult.confidence.charAt(0).toUpperCase() + headResult.confidence.slice(1)
            : null}
          tier={tier || 'free'}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}

function ResultCard({ dimension, icon, typeName, desc, color }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={dimLabel}>{dimension}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: '0.4rem' }}>
        {typeName}
      </div>
      <div style={{ fontSize: 15, color: '#5f5e5a', lineHeight: 1.6 }}>
        {desc}
      </div>
      <div style={{ ...accentBar, background: color }} />
    </div>
  )
}

function ConfidenceCard({ dimension, icon, color, typeName, desc, confidence, softSecondary, secondaryDesc, isShameTriad }) {
  const showSecondary = confidence !== 'high' && softSecondary

  let qualifierText = null
  if (confidence === 'moderate' && softSecondary) {
    qualifierText = `Your results suggest ${typeName} with some characteristics of ${softSecondary}. This is common — most people have overlap between neighboring patterns.`
  } else if (confidence === 'low' && softSecondary) {
    const prefix = isShameTriad
      ? 'Your responses reflect a genuine blend — which means your profile is more nuanced than a single label can capture. '
      : ''
    qualifierText = `${prefix}Your responses reflect a genuine blend between ${typeName} and ${softSecondary}. Rather than fitting neatly into one pattern, you draw from both. Read both descriptions and notice what resonates.`
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={dimLabel}>{dimension}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: '0.4rem' }}>
        {typeName}
      </div>
      <div style={{ fontSize: 15, color: '#5f5e5a', lineHeight: 1.6 }}>
        {desc}
      </div>
      {qualifierText && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#f5f3ed', borderRadius: 8, fontSize: 13, color: '#6a6560', lineHeight: 1.65 }}>
          {qualifierText}
        </div>
      )}
      {showSecondary && secondaryDesc && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: '0.25rem' }}>Also consider: {softSecondary}</div>
          <div style={{ fontSize: 13, color: '#5f5e5a', lineHeight: 1.55 }}>{secondaryDesc}</div>
        </div>
      )}
      <div style={{ ...accentBar, background: color }} />
    </div>
  )
}

function SynthSection({ label, color, text }) {
  if (!text) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.06)',
      borderTop: `3px solid ${color}`,
      borderRadius: '2px 2px 10px 10px',
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
        color, textTransform: 'uppercase', marginBottom: '0.6rem',
      }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: '#3a3a38', lineHeight: 1.8 }}>
        {text}
      </div>
    </div>
  )
}

// ── Hand v2 display components (with v1 fallback) ──────────────────────────

const PHASE_LABELS = {
  sensing: 'Sensing', generating: 'Generating', evaluating: 'Evaluating',
  mobilizing: 'Mobilizing', completing: 'Completing',
}

const HAND_V2_COLORS = {
  energy: { bg: '#FDF3E6', text: '#8B5520' },
  drain:  { bg: '#E8F4F6', text: '#2A5A65' },
  neutral: { bg: '#F1F0ED', text: '#4A4A47' },
}

function HandResultCard({ handResult, handGeniusTypes, handLabel, handDesc }) {
  if (handResult) {
    // v2 display
    const summary = handResult.energy_phases.map(p => PHASE_LABELS[p] || p).join(' + ')
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: 24 }}>🤲</span>
          <span style={dimLabel}>Hand</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#8B5520', marginBottom: '0.25rem' }}>
          Energy: {summary}
        </div>
        <div style={{ ...accentBar, background: '#C97A2E' }} />
      </div>
    )
  }
  // v1 fallback
  return <ResultCard dimension="Hand" icon="🤲" typeName={idsToNames(handGeniusTypes).join(' · ') || handLabel} desc={handDesc} color="#2e7d32" />
}

function HandDetailCard({ handResult, handGeniusTypes, handFrustrationTypes }) {
  if (handResult) {
    // v2 display — energy/drain/neutral tiles
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: 24 }}>🤲</span>
          <span style={dimLabel}>Hand — How You Contribute</span>
        </div>

        {handResult.energy_phases.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#8B5520', marginBottom: 6 }}>ENERGY PHASES</div>
            {handResult.energy_phases.map(p => (
              <div key={p} style={{ background: HAND_V2_COLORS.energy.bg, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: HAND_V2_COLORS.energy.text }}>{PHASE_LABELS[p] || p}</span>
              </div>
            ))}
          </div>
        )}

        {handResult.drain_phases.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#2A5A65', marginBottom: 6 }}>DRAIN PHASES</div>
            {handResult.drain_phases.map(p => (
              <div key={p} style={{ background: HAND_V2_COLORS.drain.bg, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: HAND_V2_COLORS.drain.text }}>{PHASE_LABELS[p] || p}</span>
              </div>
            ))}
          </div>
        )}

        {handResult.neutral_phases.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#4A4A47', marginBottom: 6 }}>NEUTRAL PHASES</div>
            {handResult.neutral_phases.map(p => (
              <div key={p} style={{ background: HAND_V2_COLORS.neutral.bg, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: HAND_V2_COLORS.neutral.text }}>{PHASE_LABELS[p] || p}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...accentBar, background: '#C97A2E' }} />
      </div>
    )
  }

  // v1 fallback
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 24 }}>🤲</span>
        <span style={dimLabel}>Hand — How You Contribute</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#2e7d32', marginBottom: '0.25rem' }}>
        Genius: {idsToNames(handGeniusTypes).join(' · ')}
      </div>
      <div style={{ fontSize: 13, color: '#5f5e5a', lineHeight: 1.6, marginBottom: '0.75rem' }}>
        {idsToNames(handGeniusTypes).map(n => HAND_DESC[n]).filter(Boolean).join('. ')}.
      </div>
      {handFrustrationTypes && handFrustrationTypes.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#a32d2d', marginBottom: '0.25rem' }}>
            Frustration: {idsToShortNames(handFrustrationTypes).join(' · ')}
          </div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
            {handFrustrationTypes.map(id => FRUST_DESC[id]).filter(Boolean).join('. ')}.
          </div>
        </>
      )}
      <div style={{ ...accentBar, background: '#2e7d32' }} />
    </div>
  )
}

// Styles
const page = {
  minHeight: '100vh',
  background: '#f5f5f3',
  padding: '2rem 1rem 4rem',
}

const container = {
  maxWidth: 580,
  margin: '0 auto',
}

const pageTitle = {
  fontSize: 28,
  fontWeight: 600,
  color: '#1a1a18',
  lineHeight: 1.3,
}

const pageSubtitle = {
  fontSize: 15,
  color: '#5f5e5a',
  lineHeight: 1.7,
  marginTop: '0.5rem',
}

const sparkBadge = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  color: '#185fa5',
  background: '#e6f1fb',
  padding: '5px 14px',
  borderRadius: 99,
  marginBottom: '1rem',
}

const card = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: '1.5rem',
  position: 'relative',
  overflow: 'hidden',
}

const dimLabel = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.06em',
  color: '#888780',
  textTransform: 'uppercase',
}

const accentBar = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 3,
  borderRadius: '12px 12px 0 0',
}

const nextBtn = {
  display: 'block',
  textAlign: 'center',
  padding: '12px 20px',
  background: '#e6f1fb',
  color: '#185fa5',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
}

const synthCard = {
  marginTop: '2.5rem',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  overflow: 'hidden',
  position: 'relative',
}

const synthOverlay = {
  position: 'relative',
  zIndex: 2,
  padding: '2rem 1.5rem',
  textAlign: 'center',
}

const lockIcon = {
  fontSize: 32,
  marginBottom: '0.75rem',
}

const synthLockedTitle = {
  fontSize: 20,
  fontWeight: 600,
  color: '#1a1a18',
  marginBottom: '0.75rem',
}

const synthBody = {
  fontSize: 14,
  color: '#5f5e5a',
  lineHeight: 1.7,
  marginBottom: '1.5rem',
  maxWidth: 440,
  marginLeft: 'auto',
  marginRight: 'auto',
}

const unlockBtn = {
  display: 'inline-block',
  padding: '14px 32px',
  background: '#C4963A',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'none',
  letterSpacing: '0.02em',
}

const blurredContent = {
  padding: '0 1.5rem 2rem',
  filter: 'blur(6px)',
  opacity: 0.4,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const blurLine = (widthPct) => ({
  height: 14,
  background: '#d4d3ce',
  borderRadius: 99,
  width: `${widthPct}%`,
})

const synthCardUnlocked = {
  marginTop: '2.5rem',
  background: 'linear-gradient(165deg, #fdfaf6 0%, #f5efe6 100%)',
  border: '1px solid rgba(196,150,58,0.2)',
  borderRadius: 16,
  padding: '2.5rem 2rem',
  position: 'relative',
}

const synthUnlockedBadge = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.14em',
  color: '#C4963A',
  marginBottom: '0.75rem',
}

const synthTypeLine = {
  fontSize: 13,
  color: '#888780',
  marginBottom: '1rem',
  letterSpacing: '0.02em',
}

const synthUnlockedTitle = {
  fontFamily: "'Cormorant Garamond', 'Georgia', serif",
  fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
  fontWeight: 400,
  fontStyle: 'italic',
  color: '#1a1a18',
  lineHeight: 1.25,
  marginBottom: '0',
}

const synthDivider = {
  width: 48,
  height: 2,
  background: 'linear-gradient(to right, #C4963A, rgba(196,150,58,0.2))',
  borderRadius: 2,
  margin: '1.5rem 0',
}

const synthUnlockedBody = {
  fontSize: 16,
  color: '#3a3a38',
  lineHeight: 1.85,
  maxWidth: 520,
}

const spinnerWrap = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '1.25rem',
}

const spinner = {
  width: 32,
  height: 32,
  border: '3px solid rgba(196,150,58,0.2)',
  borderTop: '3px solid #C4963A',
  borderRadius: '50%',
  animation: 'spin 0.9s linear infinite',
}

const retakeBtn = {
  marginTop: '2rem',
  width: '100%',
  padding: '10px 0',
  background: 'transparent',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  color: '#888780',
  fontFamily: 'inherit',
}

const css = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .results-page > * { animation: fadeIn 0.3s ease forwards; }
`
