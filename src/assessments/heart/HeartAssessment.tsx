import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssessment } from '../../context/AssessmentContext';
import { useHeartAssessment } from './hooks/useHeartAssessment';
import HeartIntro from './components/HeartIntro';
import HeartProgressBar from './components/HeartProgressBar';
import HeartItemPresenter from './components/HeartItemPresenter';
import HeartConfirmation from './components/HeartConfirmation';
import HeartResult from './components/HeartResult';

export default function HeartAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isolate = searchParams.get('isolate') === '1';

  const { setHeartType, setHeartResult } = useAssessment();
  const {
    state,
    currentItem,
    currentItemIndex,
    confirmationPairData,
    algorithmPrimaryType,
    scoringResult,
    finalResult,
    error,
    beginAssessment,
    submitResponse,
    submitConfirmation,
  } = useHeartAssessment();

  // When we reach the result state, push to AssessmentContext and navigate
  // In isolate mode, skip the navigate so the result screen stays visible
  useEffect(() => {
    if (state !== 'result' || !finalResult) return;
    setHeartType(finalResult.final_type);
    setHeartResult(finalResult);
    if (!isolate) {
      navigate('/assessment/head');
    }
  }, [state, finalResult, setHeartType, setHeartResult, navigate, isolate]);

  if (state === 'intro') {
    return (
      <div style={page}>
        <HeartIntro onBegin={beginAssessment} />
      </div>
    );
  }

  if (state === 'items' && currentItem) {
    return (
      <div style={page}>
        <div style={cardWrap}>
          <HeartProgressBar current={currentItemIndex} total={24} />
          <HeartItemPresenter
            key={currentItem.key}
            item={currentItem}
            onRespond={submitResponse}
          />
        </div>
      </div>
    );
  }

  if (state === 'scoring') {
    return (
      <div style={page}>
        <div style={statusCard}>
          <div style={{ fontSize: 32, marginBottom: '0.75rem', textAlign: 'center' }}>...</div>
          <div style={{ textAlign: 'center', fontSize: 15, color: '#5f5e5a' }}>Scoring your responses...</div>
        </div>
      </div>
    );
  }

  if (state === 'confirmation' && confirmationPairData && algorithmPrimaryType !== null) {
    return (
      <div style={page}>
        <HeartConfirmation
          pairData={confirmationPairData}
          algorithmPrimaryType={algorithmPrimaryType}
          onSubmit={submitConfirmation}
        />
      </div>
    );
  }

  if (state === 'two-candidate' && scoringResult) {
    const typeA = scoringResult.primary_type;
    const typeB = scoringResult.secondary_type;
    return (
      <div style={page}>
        <div style={statusCard}>
          <p style={twoCandidateHeading}>Your responses point to two possible types.</p>
          <p style={twoCandidateBody}>
            Based on your answers, Type {typeA} and Type {typeB} are both consistent reads.
            The assessment isn't able to distinguish them from this data alone.
            Your coach or facilitator can help clarify which fits better.
          </p>
          <div style={twoCandidateBadges}>
            <span style={typeBadge}>{typeA}</span>
            <span style={typeBadge}>{typeB}</span>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={page}>
        <div style={statusCard}>
          <div style={{ fontSize: 32, marginBottom: '0.75rem', textAlign: 'center' }}>!</div>
          <div style={{ textAlign: 'center', fontSize: 15, color: '#c53030' }}>
            {error ?? 'Something went wrong. Please try again.'}
          </div>
        </div>
      </div>
    );
  }

  // Result state — in isolate mode, show result + debug panel; otherwise briefly visible before navigate
  if (state === 'result' && finalResult) {
    return (
      <div style={page}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <HeartResult result={finalResult} />
          {isolate && (
            <div style={debugPanel}>
              <div style={debugHeader}>Debug — finalResult JSON</div>
              <pre style={debugPre}>{JSON.stringify(finalResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

const page: CSSProperties = { minHeight: '100vh', background: '#f5f5f3', padding: '2rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' };
const cardWrap: CSSProperties = { maxWidth: 560, width: '100%', background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem 1rem 2rem' };
const statusCard: CSSProperties = { maxWidth: 560, width: '100%', background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '2.5rem 2rem', marginTop: '2rem' };
const twoCandidateHeading: CSSProperties = { fontSize: 18, fontWeight: 600, color: '#1a1a18', textAlign: 'center', marginBottom: '1rem' };
const twoCandidateBody: CSSProperties = { fontSize: 14, color: '#5f5e5a', lineHeight: 1.7, textAlign: 'center', marginBottom: '1.5rem' };
const twoCandidateBadges: CSSProperties = { display: 'flex', justifyContent: 'center', gap: 16 };
const typeBadge: CSSProperties = { fontSize: 22, fontWeight: 700, color: '#1a1a18', background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: '0.5rem 1.25rem' };
const debugPanel: CSSProperties = { marginTop: '1rem', background: '#1a1a18', borderRadius: 12, padding: '1.25rem', overflow: 'auto' };
const debugHeader: CSSProperties = { fontSize: 12, fontWeight: 600, color: '#888780', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const debugPre: CSSProperties = { fontSize: 12, color: '#e0ddd5', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
