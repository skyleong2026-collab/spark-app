import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssessment } from '../../context/AssessmentContext';
import { useHandAssessment } from './hooks/useHandAssessment';
import HandIntro from './components/HandIntro';
import HandProgressBar from './components/HandProgressBar';
import HandPairPresenter from './components/HandPairPresenter';
import HandPhaseTransition from './components/HandPhaseTransition';
import HandScoringState from './components/HandScoringState';
import HandResult from './components/HandResult';

export default function HandAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isolate = searchParams.get('isolate') === '1';

  const { setHandResult } = useAssessment();
  const {
    state,
    currentPair,
    promptText,
    pairNumber,
    initialTotalPairs,
    drainPhases,
    finalResult,
    error,
    beginAssessment,
    submitPhase1Response,
    continueToPhase2,
    submitPhase2Response,
  } = useHandAssessment();

  // When we reach the result state, push to AssessmentContext and navigate
  // In isolate mode, skip the navigate so the result screen stays visible
  useEffect(() => {
    if (state !== 'result' || !finalResult) return;
    setHandResult(finalResult);
    if (!isolate) {
      navigate('/results');
    }
  }, [state, finalResult, setHandResult, navigate, isolate]);

  if (state === 'intro') {
    return (
      <div style={page}>
        <HandIntro onBegin={beginAssessment} />
      </div>
    );
  }

  if (state === 'phase1' && currentPair) {
    return (
      <div style={page}>
        <div style={cardWrap}>
          <HandProgressBar
            current={pairNumber}
            total={initialTotalPairs}
            phaseLabel="Finding your drains"
          />
          <HandPairPresenter
            key={currentPair.pairKey}
            pair={currentPair}
            promptText={promptText}
            onSelect={submitPhase1Response}
          />
        </div>
      </div>
    );
  }

  if (state === 'phase_transition') {
    return (
      <div style={page}>
        <HandPhaseTransition
          drainPhases={drainPhases}
          onContinue={continueToPhase2}
        />
      </div>
    );
  }

  if (state === 'phase2' && currentPair) {
    return (
      <div style={page}>
        <div style={cardWrap}>
          <HandProgressBar
            current={pairNumber}
            total={initialTotalPairs}
            phaseLabel="Finding your energy"
          />
          <HandPairPresenter
            key={currentPair.pairKey}
            pair={currentPair}
            promptText={promptText}
            onSelect={submitPhase2Response}
          />
        </div>
      </div>
    );
  }

  if (state === 'scoring') {
    return (
      <div style={page}>
        <HandScoringState />
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

  // Result state — in isolate mode, show result + debug panel
  if (state === 'result' && finalResult) {
    return (
      <div style={page}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <HandResult result={finalResult} />
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
const debugPanel: CSSProperties = { marginTop: '1rem', background: '#1a1a18', borderRadius: 12, padding: '1.25rem', overflow: 'auto' };
const debugHeader: CSSProperties = { fontSize: 12, fontWeight: 600, color: '#888780', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
const debugPre: CSSProperties = { fontSize: 12, color: '#e0ddd5', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
