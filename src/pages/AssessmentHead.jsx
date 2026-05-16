import { useNavigate } from 'react-router-dom'
import { useAssessment } from '../context/AssessmentContext'
import HeadAssessment from '../components/HeadAssessment'

export default function AssessmentHead() {
  const navigate = useNavigate()
  const { setHeadType, setHeadResult, heartResult } = useAssessment()

  const scenarioContext = heartResult?.scenarioContext || null

  function handleComplete(result) {
    setHeadType(result.resultType)
    setHeadResult(result)
    navigate('/assessment/hand')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', padding: '2rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <HeadAssessment onComplete={handleComplete} scenarioContext={scenarioContext} />
    </div>
  )
}
