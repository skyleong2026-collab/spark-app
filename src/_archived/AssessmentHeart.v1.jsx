// ARCHIVED 2026-04-18 — replaced by Heart v2 Stance×Center architecture. Kept for reference only; not imported anywhere.
import { useNavigate } from 'react-router-dom'
import { useAssessment } from '../context/AssessmentContext'
import HeartAssessment from '../components/HeartAssessment'

export default function AssessmentHeart() {
  const navigate = useNavigate()
  const { setHeartType, setHeartResult } = useAssessment()

  function handleComplete(result) {
    setHeartType(result.resultType)
    setHeartResult(result)
    navigate('/assessment/head')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', padding: '2rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <HeartAssessment onComplete={handleComplete} />
    </div>
  )
}
