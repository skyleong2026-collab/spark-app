import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const QUESTIONS = [
  { key: 'q_recognition',      label: 'How well does this profile describe you?',              lo: 'Not at all', hi: 'Exactly right' },
  { key: 'q_resonance',        label: 'The emotional core feels accurate.',                     lo: 'Not at all', hi: 'Exactly right' },
  { key: 'q_tension_accuracy', label: 'The friction points described feel real.',               lo: 'Not at all', hi: 'Exactly right' },
  { key: 'q_language_fit',     label: 'The language fits how you think about yourself.',        lo: 'Not at all', hi: 'Exactly right' },
]

const THUMB_SECTIONS = [
  { key: 'thumb_core_motivation',    label: 'Core Motivation' },
  { key: 'thumb_processing',         label: 'Processing Architecture' },
  { key: 'thumb_contribution_drain', label: 'Contribution & Drain' },
  { key: 'thumb_intersection',       label: 'Intersection' },
]

// Generate a URL-safe random token
function genToken() {
  const arr = new Uint8Array(18)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export default function BetaFeedbackModal({
  assessmentId,
  heartType,
  headStack,
  handEnergy,
  heartConf,
  headConf,
  tier,
  onClose,
}) {
  const navigate = useNavigate()
  // step: 0–3 = Q1-Q4, 4 = Q5 textarea, 5 = thumbs+submit, 6 = thankyou, 7 = retake
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState({}) // q_recognition etc.
  const [openText, setOpenText] = useState('')
  const [thumbs, setThumbs] = useState({}) // thumb_core_motivation etc.
  const [submitting, setSubmitting] = useState(false)
  const [retakeState, setRetakeState] = useState(null) // 'offer' | 'sit' | null

  function pickScore(questionKey, value) {
    setScores(prev => ({ ...prev, [questionKey]: value }))
    // Auto-advance
    setStep(s => s + 1)
  }

  function toggleThumb(key, value) {
    setThumbs(prev => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const exemplarVersion = import.meta.env.VITE_EXEMPLAR_VERSION || 'v1.0'

      await supabase.from('spark_beta_feedback').insert({
        assessment_id:            assessmentId || null,
        user_id:                  user?.id || null,
        heart_type:               heartType || null,
        head_stack:               headStack || null,
        hand_energy:              handEnergy || null,
        heart_confidence:         heartConf || null,
        head_confidence:          headConf || null,
        tier:                     tier || null,
        q_recognition:            scores.q_recognition            ?? null,
        q_resonance:              scores.q_resonance              ?? null,
        q_tension_accuracy:       scores.q_tension_accuracy       ?? null,
        q_language_fit:           scores.q_language_fit           ?? null,
        q_open_text:              openText.trim() || null,
        thumb_core_motivation:    thumbs.thumb_core_motivation    ?? null,
        thumb_processing:         thumbs.thumb_processing         ?? null,
        thumb_contribution_drain: thumbs.thumb_contribution_drain ?? null,
        thumb_intersection:       thumbs.thumb_intersection       ?? null,
        exemplar_version:         exemplarVersion,
        followup_response_token:  genToken(),
      })
    } catch (err) {
      console.error('[BetaFeedback] insert error:', err)
    }

    try {
      localStorage.setItem(`spark_feedback_shown_${assessmentId}`, 'true')
    } catch { /* localStorage unavailable — non-fatal */ }

    // Determine retake routing
    const scored = QUESTIONS.map(q => scores[q.key]).filter(v => v != null)
    const avgSat = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null
    const confLow = (c) => c === 'Low' || c === 'Moderate' || c === 'low' || c === 'moderate'

    let nextRetakeState = null

    // Check retake count gate
    let retakeCount = 0
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        retakeCount = parseInt(localStorage.getItem(`spark_retake_count_${user.id}`) || '0', 10)
      }
    } catch { /* localStorage unavailable — non-fatal */ }

    if (retakeCount < 3) {
      if (avgSat != null && avgSat <= 2.5 && (confLow(heartConf) || confLow(headConf))) {
        nextRetakeState = 'offer'
      } else {
        const hcHigh = heartConf === 'High' || heartConf === 'high'
        const hdHigh = headConf === 'High'  || headConf === 'high'
        if (hcHigh && hdHigh && (scores.q_recognition ?? 5) <= 2) {
          nextRetakeState = 'sit'
        }
      }
    }

    setRetakeState(nextRetakeState)
    setSubmitting(false)
    setStep(6)

    // Fade to retake state after 2s
    setTimeout(() => {
      if (nextRetakeState) {
        setStep(7)
      } else {
        onClose()
      }
    }, 2000)
  }

  function handleRetake() {
    try {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          const key = `spark_retake_count_${user.id}`
          const prev = parseInt(localStorage.getItem(key) || '0', 10)
          localStorage.setItem(key, String(prev + 1))
        }
      })
    } catch { /* localStorage unavailable — non-fatal */ }
    onClose()
    navigate('/assessment/heart')
  }

  // ── Renders ──────────────────────────────────────────────────────────────

  if (step < 4) {
    const q = QUESTIONS[step]
    return (
      <Backdrop onClose={onClose}>
        <div style={card}>
          <ProgressDots total={6} current={step} />
          <p style={questionLabel}>{q.label}</p>
          <div style={scaleRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                style={scores[q.key] === n ? { ...scaleBtn, ...scaleBtnActive } : scaleBtn}
                onClick={() => pickScore(q.key, n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div style={scaleLabels}>
            <span style={scaleLabel}>{q.lo}</span>
            <span style={scaleLabel}>{q.hi}</span>
          </div>
        </div>
      </Backdrop>
    )
  }

  if (step === 4) {
    return (
      <Backdrop onClose={onClose}>
        <div style={card}>
          <ProgressDots total={6} current={4} />
          <p style={questionLabel}>What would you change or add?</p>
          <textarea
            style={textarea}
            rows={4}
            placeholder="Optional — any section, any reaction."
            value={openText}
            onChange={e => setOpenText(e.target.value)}
          />
          <button style={continueBtn} onClick={() => setStep(5)}>
            Continue →
          </button>
        </div>
      </Backdrop>
    )
  }

  if (step === 5) {
    return (
      <Backdrop onClose={onClose}>
        <div style={card}>
          <ProgressDots total={6} current={5} />
          <p style={questionLabel}>Any sections stand out?</p>
          <p style={questionSub}>Optional — tap 👍 or 👎 for any section.</p>
          <div style={thumbGrid}>
            {THUMB_SECTIONS.map(s => (
              <div key={s.key} style={thumbRow}>
                <span style={thumbSectionLabel}>{s.label}</span>
                <div style={thumbBtns}>
                  <button
                    style={thumbs[s.key] === 'up' ? { ...thumbBtn, ...thumbBtnActive } : thumbBtn}
                    onClick={() => toggleThumb(s.key, 'up')}
                  >👍</button>
                  <button
                    style={thumbs[s.key] === 'down' ? { ...thumbBtn, ...thumbBtnActive } : thumbBtn}
                    onClick={() => toggleThumb(s.key, 'down')}
                  >👎</button>
                </div>
              </div>
            ))}
          </div>
          <button
            style={submitting ? { ...submitBtn, opacity: 0.6 } : submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </div>
      </Backdrop>
    )
  }

  if (step === 6) {
    return (
      <Backdrop onClose={null}>
        <div style={{ ...card, textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>✓</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#1a1a18', margin: 0 }}>
            Thanks — this shapes the next version.
          </p>
        </div>
      </Backdrop>
    )
  }

  if (step === 7) {
    if (retakeState === 'offer') {
      return (
        <Backdrop onClose={onClose}>
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#1a1a18', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Your results may not have landed yet. A retake might get you closer.
            </p>
            <button style={submitBtn} onClick={handleRetake}>
              Retake assessment
            </button>
            <button style={dismissBtn} onClick={onClose}>
              Dismiss
            </button>
          </div>
        </Backdrop>
      )
    }
    if (retakeState === 'sit') {
      return (
        <Backdrop onClose={onClose}>
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#1a1a18', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              High-confidence results sometimes take time to settle.
              Consider sitting with this before retaking.
            </p>
            <button style={dismissBtn} onClick={onClose}>
              Got it
            </button>
          </div>
        </Backdrop>
      )
    }
    // Fallback — shouldn't reach here, but close cleanly
    onClose()
    return null
  }

  return null
}

// ── Sub-components ────────────────────────────────────────────────────────

function Backdrop({ children, onClose }) {
  return (
    <div style={backdropStyle} onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose() } : undefined}>
      {children}
    </div>
  )
}

function ProgressDots({ total, current }) {
  return (
    <div style={dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={i <= current ? { ...dot, ...dotActive } : dot} />
      ))}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const backdropStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
}

const card = {
  background: '#fff',
  borderRadius: 16,
  padding: '2rem 1.75rem',
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
}

const dotsRow = {
  display: 'flex', gap: 6, justifyContent: 'center',
  marginBottom: '1.75rem',
}

const dot = {
  width: 6, height: 6,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.12)',
}

const dotActive = { background: '#185fa5' }

const questionLabel = {
  fontSize: 17,
  fontWeight: 500,
  color: '#1a1a18',
  textAlign: 'center',
  lineHeight: 1.5,
  marginBottom: '1.5rem',
}

const questionSub = {
  fontSize: 13,
  color: '#888780',
  textAlign: 'center',
  marginBottom: '1.25rem',
  marginTop: '-1rem',
}

const scaleRow = {
  display: 'flex',
  gap: 8,
  justifyContent: 'center',
  marginBottom: '0.6rem',
}

const scaleBtn = {
  width: 48, height: 48,
  border: '1.5px solid rgba(0,0,0,0.15)',
  borderRadius: 10,
  background: '#fff',
  fontSize: 17,
  fontWeight: 500,
  color: '#1a1a18',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'border-color .12s, background .12s',
}

const scaleBtnActive = {
  background: '#185fa5',
  borderColor: '#185fa5',
  color: '#fff',
}

const scaleLabels = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '0.25rem',
}

const scaleLabel = {
  fontSize: 11,
  color: '#aaa',
}

const textarea = {
  width: '100%',
  border: '1.5px solid rgba(0,0,0,0.12)',
  borderRadius: 10,
  padding: '0.75rem 1rem',
  fontSize: 14,
  color: '#1a1a18',
  fontFamily: 'inherit',
  lineHeight: 1.6,
  resize: 'vertical',
  boxSizing: 'border-box',
  marginBottom: '1.25rem',
  background: '#fafaf8',
  outline: 'none',
}

const continueBtn = {
  display: 'block',
  width: '100%',
  padding: '13px 0',
  background: '#1a1a18',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const thumbGrid = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginBottom: '1.5rem',
}

const thumbRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.6rem 0.9rem',
  background: '#f9f8f5',
  borderRadius: 8,
}

const thumbSectionLabel = {
  fontSize: 14,
  color: '#3a3a38',
}

const thumbBtns = {
  display: 'flex',
  gap: 6,
}

const thumbBtn = {
  width: 38, height: 38,
  border: '1.5px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  background: '#fff',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const thumbBtnActive = {
  background: '#e6f1fb',
  borderColor: '#185fa5',
}

const submitBtn = {
  display: 'block',
  width: '100%',
  padding: '13px 0',
  background: '#1a1a18',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginBottom: '0.5rem',
}

const dismissBtn = {
  display: 'block',
  width: '100%',
  padding: '10px 0',
  background: 'none',
  border: 'none',
  fontSize: 14,
  color: '#888780',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
