// ARCHIVED 2026-04-18 — replaced by Hand v2 five-phase architecture. Kept for reference only; not imported anywhere.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssessment } from '../context/AssessmentContext'
import HandAssessment from '../components/HandAssessment'

export default function AssessmentHand() {
  const navigate = useNavigate()
  const { handType, setHandType, setHandGeniusTypes, setHandFrustrationTypes, clearAll } = useAssessment()
  const [ready, setReady] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  // On mount: decide whether to show resume prompt or go straight to assessment
  useEffect(() => {
    if (handType) {
      setShowPrompt(true)
    }
    setReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleComplete({ resultType, geniusIds, frustrationIds }) {
    setHandType(resultType)
    setHandGeniusTypes(geniusIds)
    setHandFrustrationTypes(frustrationIds)
    navigate('/results')
  }

  function handleContinue() {
    navigate('/results')
  }

  function handleStartFresh() {
    clearAll()
    // Log to confirm everything is cleared
    console.log('[SPARK] Start fresh — context values will be null on next render')
    console.log('[SPARK] localStorage after clear:', {
      spark_hand: localStorage.getItem('spark_hand'),
      spark_heart: localStorage.getItem('spark_heart'),
      spark_head: localStorage.getItem('spark_head'),
    })
    console.log('[SPARK] sessionStorage fresh flag:', sessionStorage.getItem('spark_fresh_start'))
    setShowPrompt(false)
  }

  if (!ready) return null

  if (showPrompt) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f3', padding: '2rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: '1rem' }}>👋</div>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a18', marginBottom: '0.75rem' }}>
            You have a previous result saved
          </h2>
          <p style={{ fontSize: 14, color: '#5f5e5a', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Continue where you left off or start all three assessments fresh.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={handleContinue} style={{
              padding: '12px 0', background: '#1a1a18', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Continue to results
            </button>
            <button onClick={handleStartFresh} style={{
              padding: '12px 0', background: 'transparent', color: '#5f5e5a',
              border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Start fresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', padding: '2rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <HandAssessment onComplete={handleComplete} />
    </div>
  )
}
