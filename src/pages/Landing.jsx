import { Link, useNavigate } from 'react-router-dom'
import { useAssessment } from '../context/AssessmentContext'

export default function Landing() {
  const navigate = useNavigate()
  const { handResult, handType, heartType, headType, clearAll } = useAssessment()
  const hasResults = handResult || handType || heartType || headType

  function handleRetake() {
    clearAll()
    navigate('/assessment/opening')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', padding: '4rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: '#1a1a18', marginBottom: '1rem' }}>SPARK</h1>
        <p style={{ fontSize: 16, color: '#5f5e5a', lineHeight: 1.7, marginBottom: '2rem' }}>
          Discover how your heart, head, and hands work together — in 10 minutes.
        </p>
        <Link to="/assessment/opening" style={{
          display: 'inline-block', padding: '14px 32px', background: '#1a1a18', color: '#fff',
          borderRadius: 8, fontSize: 15, fontWeight: 500, textDecoration: 'none',
        }}>
          Take the free assessment
        </Link>
        {hasResults && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
            <Link to="/results" style={{ fontSize: 14, color: '#185fa5', textDecoration: 'underline' }}>
              View my results
            </Link>
            <button onClick={handleRetake} style={{
              background: 'none', border: 'none', fontSize: 13, color: '#888',
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
            }}>
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
