import type { CSSProperties } from 'react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  classifyRegister,
  shouldFireTurn3,
  buildDeterministicProfile,
  buildVerbosity,
  mergeQualitative,
  OPENING_FOLLOWUPS_V1,
  getTurn3Widening,
} from './lib/openingLogic';
import type { OpeningTurn, RegisterClass, RegisterProfile } from './lib/openingTypes';

// Feature flag — when false the route immediately hands off to Heart
const OPENING_ENABLED = import.meta.env.VITE_OPENING_ENABLED === 'true';
const SESSION_KEY = 'spark_opening_done';

// Verbatim locked copy from spec
const OPENING_LINE = "Before we begin, tell me about something that's been on your mind this week.";
const TRANSITION_LINE = "Thanks — that helps me read your answers in your terms. Let's begin.";
const MODEL_VERSION = 'claude-haiku-4-5-20251001';
const PROMPT_VERSION = 'opening_v1';

type OpeningState = 'turn1' | 'turn2' | 'turn3' | 'extracting' | 'transition';

// STUB: §17 transcripts table not applied — logs payload to console instead of writing.
// Replace with real Supabase insert when §17 ships. See DEVIATIONS.md DEV-01.
function stubWriteTranscript(payload: unknown): void {
  console.log('[Opening] STUB transcript write (§17 pending):', JSON.stringify(payload, null, 2));
}

export default function Opening() {
  const navigate = useNavigate();

  // If flag off or already done this session → go straight to Heart
  useEffect(() => {
    if (!OPENING_ENABLED) {
      navigate('/assessment/heart', { replace: true });
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        navigate('/assessment/heart', { replace: true });
      }
    } catch {
      // sessionStorage unavailable — proceed with opening
    }
  }, [navigate]);

  const [state, setState] = useState<OpeningState>('turn1');
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<OpeningTurn[]>([
    { role: 'assistant', text: OPENING_LINE, timestamp: new Date().toISOString() },
  ]);
  const [registerClass, setRegisterClass] = useState<RegisterClass>('default / balanced');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep textarea focused when state changes
  useEffect(() => {
    if (state !== 'extracting' && state !== 'transition') {
      inputRef.current?.focus();
    }
  }, [state]);

  // Auto-navigate after transition line is shown
  useEffect(() => {
    if (state !== 'transition') return;
    const t = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch {}
      navigate('/assessment/heart');
    }, 2200);
    return () => clearTimeout(t);
  }, [state, navigate]);

  function appendTurn(role: 'assistant' | 'user', text: string): OpeningTurn[] {
    const turn: OpeningTurn = { role, text, timestamp: new Date().toISOString() };
    const next = [...turns, turn];
    setTurns(next);
    return next;
  }

  async function handleSubmitTurn1() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const rc = classifyRegister(text);
    setRegisterClass(rc);

    const followup = OPENING_FOLLOWUPS_V1[rc];
    const nextTurns = appendTurn('user', text);
    // Append T2 assistant prompt
    const t: OpeningTurn = { role: 'assistant', text: followup, timestamp: new Date().toISOString() };
    setTurns([...nextTurns, t]);
    setState('turn2');
  }

  async function handleSubmitTurn2() {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const turn1Text = turns.find(t => t.role === 'user')?.text ?? '';
    const nextTurns = appendTurn('user', text);

    if (shouldFireTurn3(turn1Text, text)) {
      const widenPrompt = getTurn3Widening(registerClass);
      const t: OpeningTurn = { role: 'assistant', text: widenPrompt, timestamp: new Date().toISOString() };
      setTurns([...nextTurns, t]);
      setState('turn3');
    } else {
      await finalize(nextTurns);
    }
  }

  async function handleSubmitTurn3() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const nextTurns = appendTurn('user', text);
    await finalize(nextTurns);
  }

  async function finalize(allTurns: OpeningTurn[]) {
    setState('extracting');

    const userTurns = allTurns.filter(t => t.role === 'user');
    const [t1, t2, t3] = [
      userTurns[0]?.text ?? '',
      userTurns[1]?.text ?? '',
      userTurns[2]?.text ?? null,
    ];

    // Build deterministic base
    const verbosity = buildVerbosity(t1, t2, t3);
    const deterministicBase = buildDeterministicProfile(t1, t2, t3);

    let profile: RegisterProfile = deterministicBase;
    let confidence: 'ok' | 'low' = 'ok';
    let modelVersion = MODEL_VERSION;

    try {
      const { data, error } = await supabase.functions.invoke('extract-register', {
        body: { turns: allTurns.filter(t => t.role === 'user').map(t => ({ role: t.role, text: t.text })) },
      });

      if (error || !data?.qualitative) throw new Error(error?.message ?? 'no qualitative data');

      profile = mergeQualitative(deterministicBase, data.qualitative);
      modelVersion = data.model_version ?? MODEL_VERSION;
    } catch (err) {
      // Graceful fallback to deterministic-only per spec
      console.warn('[Opening] Haiku call failed — using deterministic-only profile:', err);
      confidence = 'low';
    }

    // Audit: register_profile must not reach Battery scoring — it is only logged here
    // The profile is not written to AssessmentContext or any scoring path.

    const transcriptPayload = {
      session_id: null, // no session ID available without §17 auth context
      node_type: 'opening' as const,
      turns: allTurns,
      register_profile: profile,
      register_confidence: confidence,
      consent_state: null, // DEV-02: §17 consent surface absent
      model_version: modelVersion,
      prompt_version: PROMPT_VERSION,
    };

    // STUB: write path — see DEVIATIONS.md DEV-01
    stubWriteTranscript(transcriptPayload);

    // Show transition line then hand off to Heart
    const t: OpeningTurn = { role: 'assistant', text: TRANSITION_LINE, timestamp: new Date().toISOString() };
    setTurns(prev => [...prev, t]);
    setState('transition');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state === 'turn1') handleSubmitTurn1();
      else if (state === 'turn2') handleSubmitTurn2();
      else if (state === 'turn3') handleSubmitTurn3();
    }
  }

  const isInputActive = state === 'turn1' || state === 'turn2' || state === 'turn3';

  return (
    <div style={page} className="opening-page">
      <style>{css}</style>
      <div style={card}>
        <div style={chatWindow}>
          {turns.map((turn, i) => (
            <div key={i} style={turn.role === 'assistant' ? assistantMsg : userMsg}>
              {turn.text}
            </div>
          ))}
          {state === 'extracting' && (
            <div style={spinnerRow}>
              <span style={spinner}>...</span>
            </div>
          )}
        </div>

        {isInputActive && (
          <div style={inputArea}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={textarea}
              placeholder="Type your response…"
              rows={3}
            />
            <button
              onClick={
                state === 'turn1' ? handleSubmitTurn1
                : state === 'turn2' ? handleSubmitTurn2
                : handleSubmitTurn3
              }
              disabled={!input.trim()}
              style={submitBtn}
            >
              Continue
            </button>
            <div style={hint}>Press Enter to continue · Shift+Enter for new line</div>
          </div>
        )}
      </div>
    </div>
  );
}

const page: CSSProperties = {
  minHeight: '100vh',
  background: '#f5f5f3',
  padding: '2rem 1rem',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
};
const card: CSSProperties = {
  maxWidth: 560,
  width: '100%',
  background: '#fff',
  borderRadius: 12,
  border: '0.5px solid rgba(0,0,0,0.1)',
  padding: '2rem',
  marginTop: '2rem',
};
const chatWindow: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginBottom: '1.5rem',
};
const assistantMsg: CSSProperties = {
  fontSize: 16,
  color: '#1a1a18',
  lineHeight: 1.7,
  padding: '1rem 1.25rem',
  background: '#f5f5f3',
  borderRadius: 8,
  maxWidth: '90%',
  alignSelf: 'flex-start',
};
const userMsg: CSSProperties = {
  fontSize: 15,
  color: '#3a3a38',
  lineHeight: 1.6,
  padding: '0.875rem 1.25rem',
  background: '#e8f0fb',
  borderRadius: 8,
  maxWidth: '90%',
  alignSelf: 'flex-end',
  textAlign: 'right',
};
const spinnerRow: CSSProperties = {
  display: 'flex',
  alignSelf: 'flex-start',
};
const spinner: CSSProperties = {
  fontSize: 24,
  color: '#888780',
  letterSpacing: 4,
};
const inputArea: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};
const textarea: CSSProperties = {
  width: '100%',
  padding: '0.875rem',
  fontSize: 15,
  fontFamily: 'inherit',
  color: '#1a1a18',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 8,
  resize: 'vertical',
  outline: 'none',
  lineHeight: 1.6,
  boxSizing: 'border-box',
};
const submitBtn: CSSProperties = {
  alignSelf: 'flex-end',
  padding: '10px 24px',
  background: '#1a1a18',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const hint: CSSProperties = {
  fontSize: 12,
  color: '#aaa',
  textAlign: 'right',
};
const css = `
  .opening-page textarea:focus { border-color: rgba(0,0,0,0.3) !important; }
  .opening-page button:hover:not(:disabled) { background: #333 !important; }
  .opening-page button:disabled { opacity: 0.4; cursor: default !important; }
`;
