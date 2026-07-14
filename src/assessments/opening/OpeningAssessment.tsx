import type { CSSProperties } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  selectFollowup,
  selectTurn3,
  needsTurn3,
  extractRegisterProfile,
} from './lib/openingRegister';
import type { FollowupKey, OpeningTurn, OpeningSessionData } from './lib/openingTypes';

// Feature flag: set VITE_OPENING_ENABLED=false to bypass the Opening and go
// straight to the Battery without a redeploy.
const OPENING_ENABLED = import.meta.env.VITE_OPENING_ENABLED !== 'false';

// Locked copy — do not reword (per dispatch packet guardrail 6).
const OPENING_LINE = "Before we begin, tell me about something that's been on your mind this week.";
const TRANSITION_LINE = "Thanks — that helps me read your answers in your terms. Let's begin.";

type OpeningPhase = 'prompt' | 'followup' | 'widening' | 'transition';

export default function OpeningAssessment() {
  const navigate = useNavigate();

  // Once-per-session guard and feature-flag check — evaluated once on mount.
  const [shouldSkip] = useState(
    () => !OPENING_ENABLED || localStorage.getItem('spark_opening_complete') === '1'
  );

  useEffect(() => {
    if (shouldSkip) navigate('/assessment/heart', { replace: true });
  }, [shouldSkip, navigate]);

  const [phase, setPhase] = useState<OpeningPhase>('prompt');
  const [turn1, setTurn1] = useState('');
  const [turn2, setTurn2] = useState('');
  const [turn3, setTurn3] = useState('');
  const [followupKey, setFollowupKey] = useState<FollowupKey>('balanced');
  const [followupText, setFollowupText] = useState('');
  const [turn3Text, setTurn3Text] = useState('');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase !== 'transition') inputRef.current?.focus();
  }, [phase]);

  function submitTurn1() {
    const text = inputValue.trim();
    if (!text) return;
    const { key, text: fText } = selectFollowup(text);
    setTurn1(text);
    setFollowupKey(key);
    setFollowupText(fText);
    setInputValue('');
    setPhase('followup');
  }

  function submitTurn2() {
    const text = inputValue.trim();
    if (!text) return;
    setTurn2(text);
    setInputValue('');
    if (needsTurn3(turn1, text)) {
      const t3 = selectTurn3(followupKey);
      setTurn3Text(t3);
      setPhase('widening');
    } else {
      finalize(turn1, text, null, followupText);
    }
  }

  function submitTurn3() {
    const text = inputValue.trim();
    setTurn3(text);
    setInputValue('');
    finalize(turn1, turn2, text || null, followupText);
  }

  function finalize(t1: string, t2: string, t3: string | null, fText: string) {
    const { profile, confidence } = extractRegisterProfile(t1, t2, t3);
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const turns: OpeningTurn[] = [
      { role: 'assistant', text: OPENING_LINE, timestamp: now },
      { role: 'user', text: t1, timestamp: now },
      { role: 'assistant', text: fText, timestamp: now },
      { role: 'user', text: t2, timestamp: now },
      ...(t3 !== null
        ? ([
            { role: 'assistant', text: turn3Text, timestamp: now },
            { role: 'user', text: t3, timestamp: now },
          ] as OpeningTurn[])
        : []),
      { role: 'assistant', text: TRANSITION_LINE, timestamp: now },
    ];

    const sessionData: OpeningSessionData = {
      session_id: sessionId,
      turns,
      register_profile: profile,
      register_confidence: confidence,
      model_version: 'deterministic_v1',
      prompt_version: 'opening_v1',
    };

    // Persist register_profile locally for downstream synthesis (§7) consumption.
    localStorage.setItem('spark_opening', JSON.stringify(sessionData));
    localStorage.setItem('spark_opening_complete', '1');

    // ── STUB: Corpus transcript write ──────────────────────────────────────
    // Gated on §17 corpus_schema migration being applied to Supabase.
    // See supabase/migrations/20260619000000_corpus_schema.sql for the schema.
    // When §17 is applied:
    //   1. Check corpus_consent row for this user: skip write if retain_transcripts=false
    //      (Opening still ran for live calibration; only transcript is discarded).
    //   2. Write one row per turn to corpus_transcripts:
    //        { user_id, session_id, component: 'opening', turn_index, role, content,
    //          prompt_version: 'opening_v1', payload: { register_profile } on last user turn }
    //   3. Attach model_version and prompt_version stamps per §17.6 rule 2.
    // console.log('[Opening] stub — transcript write pending §17 migration', sessionData);
    // ──────────────────────────────────────────────────────────────────────

    setPhase('transition');
    setTimeout(() => navigate('/assessment/heart'), 2500);
  }

  if (shouldSkip) return null;

  const showTurn3Prompt =
    phase === 'widening' ||
    (phase === 'transition' && turn3);

  return (
    <div style={page}>
      <div style={chatWrap}>
        <div style={header}>
          <span style={headerLabel}>Before you begin</span>
        </div>

        <div style={chatArea}>
          <div style={assistantBubble}>{OPENING_LINE}</div>

          {turn1 && <div style={userBubble}>{turn1}</div>}

          {followupText && phase !== 'prompt' && (
            <div style={assistantBubble}>{followupText}</div>
          )}

          {turn2 && <div style={userBubble}>{turn2}</div>}

          {showTurn3Prompt && (
            <div style={assistantBubble}>{turn3Text}</div>
          )}

          {turn3 && <div style={userBubble}>{turn3}</div>}

          {phase === 'transition' && (
            <div style={assistantBubble}>{TRANSITION_LINE}</div>
          )}
        </div>

        {phase !== 'transition' && (
          <div style={inputArea}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (phase === 'prompt') submitTurn1();
                  else if (phase === 'followup') submitTurn2();
                  else if (phase === 'widening') submitTurn3();
                }
              }}
              placeholder="Type your response… (Enter to send, Shift+Enter for new line)"
              style={textarea}
              rows={3}
            />
            <button
              onClick={() => {
                if (phase === 'prompt') submitTurn1();
                else if (phase === 'followup') submitTurn2();
                else if (phase === 'widening') submitTurn3();
              }}
              disabled={!inputValue.trim()}
              style={{
                ...sendBtn,
                opacity: inputValue.trim() ? 1 : 0.4,
                cursor: inputValue.trim() ? 'pointer' : 'default',
              }}
            >
              Send
            </button>
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

const chatWrap: CSSProperties = {
  maxWidth: 560,
  width: '100%',
  background: '#fff',
  borderRadius: 12,
  border: '0.5px solid rgba(0,0,0,0.1)',
  overflow: 'hidden',
  marginTop: '2rem',
  display: 'flex',
  flexDirection: 'column',
};

const header: CSSProperties = {
  padding: '1rem 1.5rem',
  borderBottom: '0.5px solid rgba(0,0,0,0.08)',
  background: '#fafaf8',
};

const headerLabel: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#888780',
  letterSpacing: '0.02em',
};

const chatArea: CSSProperties = {
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  minHeight: 200,
};

const assistantBubble: CSSProperties = {
  alignSelf: 'flex-start',
  background: '#f0efe9',
  borderRadius: '0 12px 12px 12px',
  padding: '0.875rem 1rem',
  fontSize: 15,
  color: '#1a1a18',
  lineHeight: 1.65,
  maxWidth: '88%',
};

const userBubble: CSSProperties = {
  alignSelf: 'flex-end',
  background: '#1a1a18',
  color: '#fff',
  borderRadius: '12px 12px 0 12px',
  padding: '0.875rem 1rem',
  fontSize: 15,
  lineHeight: 1.65,
  maxWidth: '88%',
};

const inputArea: CSSProperties = {
  padding: '1rem 1.5rem 1.5rem',
  borderTop: '0.5px solid rgba(0,0,0,0.08)',
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'flex-end',
};

const textarea: CSSProperties = {
  flex: 1,
  padding: '0.75rem 1rem',
  fontSize: 15,
  color: '#1a1a18',
  background: '#fafaf8',
  border: '0.5px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  resize: 'none',
  fontFamily: 'inherit',
  lineHeight: 1.5,
  outline: 'none',
};

const sendBtn: CSSProperties = {
  padding: '0.75rem 1.25rem',
  background: '#1a1a18',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  flexShrink: 0,
  transition: 'opacity 0.15s',
};
