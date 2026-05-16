import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  LikertResponse,
  ItemKey,
  HeartResponses,
  HeartScoringResult,
  ConfirmationOutcome,
  ConfusablePair,
  ConfirmationPairEntry,
  EnneagramType,
} from '../lib/heartTypes';
import { HEART_ITEMS } from '../lib/heartItems';
import { CONFIRMATION_PAIRS } from '../lib/heartConfirmationPairs';
import { scoreHeartAssessment, resolveFinalType } from '../lib/heartScoring';
import {
  saveResponseToLocalStorage,
  saveSessionMetadata,
  clearLocalSession,
  persistFinalResultToSupabase,
} from '../lib/heartPersistence';
import { useAuth } from '../../../hooks/useAuth';

// ── Types ───────────────────────────────────────────────────────────────────

export type HeartAssessmentState =
  | 'intro'
  | 'items'
  | 'scoring'
  | 'confirmation'
  | 'result'
  | 'error';

export interface UseHeartAssessmentReturn {
  state: HeartAssessmentState;
  currentItem: (typeof HEART_ITEMS)[number] | null;
  currentItemIndex: number;
  responseCount: number;
  confirmationPairData: ConfirmationPairEntry | null;
  algorithmPrimaryType: EnneagramType | null;
  finalResult: HeartScoringResult | null;
  error: string | null;
  beginAssessment: () => void;
  submitResponse: (value: LikertResponse) => void;
  submitConfirmation: (outcome: ConfirmationOutcome) => void;
}

// ── Seeded shuffle (Fisher-Yates with mulberry32 PRNG) ─────���────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  const rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useHeartAssessment(): UseHeartAssessmentReturn {
  const { user } = useAuth();

  // Stable session ID and randomization seed, generated once on mount
  const sessionRef = useRef<{
    sessionId: string;
    seed: number;
    shuffledItems: typeof HEART_ITEMS extends readonly (infer U)[] ? U[] : never;
  } | null>(null);

  if (sessionRef.current === null) {
    const sessionId = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 2 ** 32);
    const shuffledItems = shuffleWithSeed(HEART_ITEMS, seed);
    sessionRef.current = { sessionId, seed, shuffledItems };
    saveSessionMetadata(
      sessionId,
      seed,
      shuffledItems.map((item) => item.key),
    );
  }

  const { sessionId, seed, shuffledItems } = sessionRef.current;

  const [state, setState] = useState<HeartAssessmentState>('intro');
  const [responses, setResponses] = useState<Partial<Record<ItemKey, LikertResponse>>>({});
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scoringResult, setScoringResult] = useState<HeartScoringResult | null>(null);
  const [finalResult, setFinalResult] = useState<HeartScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Persist to Supabase when entering result state
  const persistedResultRef = useRef<HeartScoringResult | null>(null);
  useEffect(() => {
    if (state !== 'result' || !finalResult) return;
    if (persistedResultRef.current === finalResult) return;
    persistedResultRef.current = finalResult;

    const userId = user?.id ?? null;
    persistFinalResultToSupabase(finalResult, userId).then((outcome) => {
      if ('error' in outcome) {
        console.error('Failed to persist Heart result:', outcome.error);
      }
      clearLocalSession(sessionId);
    });
  }, [state, finalResult, user, sessionId]);

  const responseCount = Object.keys(responses).length;

  const currentItem = state === 'items' ? (shuffledItems[currentItemIndex] ?? null) : null;

  const confirmationPairData = useMemo<ConfirmationPairEntry | null>(() => {
    if (state !== 'confirmation' || !scoringResult?.confirmation_pair) return null;
    return CONFIRMATION_PAIRS[scoringResult.confirmation_pair as ConfusablePair] ?? null;
  }, [state, scoringResult]);

  const beginAssessment = useCallback(() => {
    if (state !== 'intro') return;
    setState('items');
  }, [state]);

  const submitResponse = useCallback(
    (value: LikertResponse) => {
      if (state !== 'items') return;
      const item = shuffledItems[currentItemIndex];
      if (!item) return;

      const newResponses = { ...responses, [item.key]: value };
      setResponses(newResponses);
      saveResponseToLocalStorage(sessionId, item.key, value);

      const newCount = Object.keys(newResponses).length;

      if (newCount === 24) {
        // All items answered — score
        setState('scoring');

        const result = scoreHeartAssessment(newResponses as HeartResponses);
        result.randomization_seed = seed;
        result.item_order = shuffledItems.map((i) => i.key);
        setScoringResult(result);

        if (result.confirmation_triggered) {
          setState('confirmation');
        } else {
          // No confirmation → final result is the algorithm result
          setFinalResult(result);
          setState('result');
        }
      } else {
        setCurrentItemIndex(currentItemIndex + 1);
      }
    },
    [state, currentItemIndex, responses, shuffledItems, sessionId, seed],
  );

  const submitConfirmation = useCallback(
    (outcome: ConfirmationOutcome) => {
      if (state !== 'confirmation' || !scoringResult) return;

      try {
        const { finalType, finalSecondary, finalConfidence } = resolveFinalType(
          scoringResult.primary_type,
          scoringResult.secondary_type,
          scoringResult.overall_confidence,
          outcome,
        );

        const resolved: HeartScoringResult = {
          ...scoringResult,
          confirmation_result: outcome.result,
          confirmation_user_pick:
            outcome.result === 'disagreed' ? outcome.userPick : null,
          final_type: finalType,
          final_secondary: finalSecondary,
          final_confidence: finalConfidence,
        };

        setFinalResult(resolved);
        setState('result');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Confirmation processing failed');
        setState('error');
      }
    },
    [state, scoringResult],
  );

  return {
    state,
    currentItem,
    currentItemIndex,
    responseCount,
    confirmationPairData,
    algorithmPrimaryType: scoringResult?.primary_type ?? null,
    finalResult,
    error,
    beginAssessment,
    submitResponse,
    submitConfirmation,
  };
}
