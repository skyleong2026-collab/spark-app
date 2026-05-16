import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Phase,
  Phase1Response,
  Phase2Response,
  HandPair,
  HandScoringResult,
  PairKey,
} from '../lib/handTypes';
import { PHASE1_PAIRS, generatePhase2Pairs } from '../lib/handPairs';
import {
  computeDrainScores,
  identifyDrainPhases,
  shouldTriggerEarlyLock,
  filterRemainingPairs,
  selectPhase2Candidates,
  scoreHandAssessment,
} from '../lib/handScoring';
import {
  saveProgressToLocalStorage,
  clearLocalSession,
  persistFinalResultToSupabase,
} from '../lib/handPersistence';
import { useAuth } from '../../../hooks/useAuth';

// ── Types ───────────────────────────────────────────────────────────────────

export type HandAssessmentState =
  | 'intro'
  | 'phase1'
  | 'phase_transition'
  | 'phase2'
  | 'scoring'
  | 'result'
  | 'error';

export interface UseHandAssessmentReturn {
  state: HandAssessmentState;
  currentPair: HandPair | null;
  promptText: string;
  pairNumber: number;
  initialTotalPairs: number;
  drainPhases: Phase[];
  finalResult: HandScoringResult | null;
  error: string | null;
  beginAssessment: () => void;
  submitPhase1Response: (selectedPhase: Phase) => void;
  continueToPhase2: () => void;
  submitPhase2Response: (selectedPhase: Phase) => void;
}

// ── Seeded shuffle (Fisher-Yates with mulberry32 PRNG) ──────────────────────

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

/** Randomly swap A/B within each pair using the seeded PRNG. */
function randomizeABWithSeed(pairs: HandPair[], seed: number): HandPair[] {
  const rng = mulberry32(seed + 1); // offset seed so shuffle and AB randomization differ
  return pairs.map(p => {
    if (rng() > 0.5) {
      return { ...p, phaseA: p.phaseB, phaseB: p.phaseA, textA: p.textB, textB: p.textA };
    }
    return p;
  });
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useHandAssessment(): UseHandAssessmentReturn {
  const { user } = useAuth();

  // Stable session setup, generated once on mount
  const sessionRef = useRef<{
    sessionId: string;
    seed: number;
    initialPhase1Pairs: HandPair[];
    initialTotalPairs: number;
  } | null>(null);

  if (sessionRef.current === null) {
    const sessionId = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 2 ** 32);
    const shuffled = shuffleWithSeed(PHASE1_PAIRS, seed);
    const initialPhase1Pairs = randomizeABWithSeed(shuffled, seed);
    sessionRef.current = {
      sessionId,
      seed,
      initialPhase1Pairs,
      initialTotalPairs: initialPhase1Pairs.length + 3, // always 13
    };

    saveProgressToLocalStorage(sessionId, {
      phase1Responses: [],
      phase2Responses: [],
      lockedPhases: [],
      randomizationSeed: seed,
      pairOrder: initialPhase1Pairs.map(p => p.pairKey),
    });
  }

  const { sessionId, seed, initialPhase1Pairs, initialTotalPairs } = sessionRef.current;

  const [state, setState] = useState<HandAssessmentState>('intro');

  // Phase 1 state
  const [phase1Pairs, setPhase1Pairs] = useState<HandPair[]>(initialPhase1Pairs);
  const [phase1Index, setPhase1Index] = useState(0);
  const [phase1Responses, setPhase1Responses] = useState<Phase1Response[]>([]);
  const [lockedPhases, setLockedPhases] = useState<Phase[]>([]);
  const [earlyLockTriggered, setEarlyLockTriggered] = useState(false);

  // Drain phases identified at end of Phase 1 (for transition screen)
  const [identifiedDrainPhases, setIdentifiedDrainPhases] = useState<Phase[]>([]);

  // Phase 2 state
  const [phase2Pairs, setPhase2Pairs] = useState<HandPair[]>([]);
  const [phase2Index, setPhase2Index] = useState(0);
  const [phase2Responses, setPhase2Responses] = useState<Phase2Response[]>([]);

  const [finalResult, setFinalResult] = useState<HandScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Supabase persistence on result ──────────────────────────────────────

  const persistedResultRef = useRef<HandScoringResult | null>(null);
  useEffect(() => {
    if (state !== 'result' || !finalResult) return;
    if (persistedResultRef.current === finalResult) return;
    persistedResultRef.current = finalResult;

    const userId = user?.id ?? null;
    persistFinalResultToSupabase(finalResult, userId).then((outcome) => {
      if ('error' in outcome) {
        console.error('Failed to persist Hand result:', outcome.error);
      }
      clearLocalSession(sessionId);
    });
  }, [state, finalResult, user, sessionId]);

  // ── Derived state ───────────────────────────────────────────────────────

  const currentPair = (() => {
    if (state === 'phase1') return phase1Pairs[phase1Index] ?? null;
    if (state === 'phase2') return phase2Pairs[phase2Index] ?? null;
    return null;
  })();

  const promptText = (() => {
    if (state === 'phase1') return 'Which of these drains more energy when you have to do it?';
    if (state === 'phase2') return 'Which of these produces more energy when you get to do it?';
    return '';
  })();

  const pairNumber = (() => {
    if (state === 'phase1') return phase1Responses.length + 1;
    if (state === 'phase2') return phase1Responses.length + phase2Responses.length + 1;
    return 0;
  })();

  // ── Handlers ────────────────────────────────────────────────────────────

  const beginAssessment = useCallback(() => {
    if (state !== 'intro') return;
    setState('phase1');
  }, [state]);

  const enterPhaseTransition = useCallback(
    (currentPhase1Responses: Phase1Response[], currentLocked: Phase[]) => {
      // Compute drain phases for the transition screen display
      const drainScores = computeDrainScores(currentPhase1Responses);
      const { drainPhases } = identifyDrainPhases(drainScores, currentPhase1Responses);
      setIdentifiedDrainPhases(drainPhases);

      // Persist on entry to phase_transition
      saveProgressToLocalStorage(sessionId, {
        phase1Responses: currentPhase1Responses,
        phase2Responses: [],
        lockedPhases: currentLocked,
        randomizationSeed: seed,
        pairOrder: phase1Pairs.slice(0, currentPhase1Responses.length).map(p => p.pairKey),
      });

      setState('phase_transition');
    },
    [sessionId, seed, phase1Pairs],
  );

  const continueToPhase2 = useCallback(() => {
    if (state !== 'phase_transition') return;

    const drainScores = computeDrainScores(phase1Responses);
    const candidates = selectPhase2Candidates(drainScores, phase1Responses);
    const p2Pairs = generatePhase2Pairs(candidates);
    const randomized = randomizeABWithSeed(p2Pairs, seed + 2);
    setPhase2Pairs(randomized);
    setPhase2Index(0);

    // Persist updated pairOrder with Phase 2 pairs
    saveProgressToLocalStorage(sessionId, {
      phase1Responses,
      phase2Responses: [],
      lockedPhases,
      randomizationSeed: seed,
      pairOrder: [
        ...phase1Pairs.slice(0, phase1Responses.length).map(p => p.pairKey),
        ...randomized.map(p => p.pairKey),
      ],
    });

    setState('phase2');
  }, [state, phase1Responses, lockedPhases, seed, sessionId, phase1Pairs]);

  const submitPhase1Response = useCallback(
    (selectedPhase: Phase) => {
      if (state !== 'phase1') return;
      const pair = phase1Pairs[phase1Index];
      if (!pair) return;

      const response: Phase1Response = { pairKey: pair.pairKey, selectedPhase };
      const newResponses = [...phase1Responses, response];
      setPhase1Responses(newResponses);

      const pairsAnswered = newResponses.length;
      const drainScores = computeDrainScores(newResponses);

      // Check early lock (only from pair 6+)
      const lockPhase = shouldTriggerEarlyLock(drainScores, pairsAnswered, newResponses);
      let currentLocked = lockedPhases;
      let effectivePairs = phase1Pairs;

      if (lockPhase && !lockedPhases.includes(lockPhase)) {
        currentLocked = [...lockedPhases, lockPhase];
        setLockedPhases(currentLocked);
        setEarlyLockTriggered(true);

        // Filter remaining pairs
        const remaining = filterRemainingPairs(
          phase1Pairs.slice(phase1Index + 1),
          currentLocked,
        );
        effectivePairs = [...phase1Pairs.slice(0, phase1Index + 1), ...remaining];
        setPhase1Pairs(effectivePairs);

        // Check if filtering emptied the queue
        if (phase1Index + 1 >= effectivePairs.length) {
          enterPhaseTransition(newResponses, currentLocked);
          return;
        }

        setPhase1Index(phase1Index + 1);
      } else if (phase1Index + 1 >= phase1Pairs.length) {
        // All Phase 1 pairs exhausted
        enterPhaseTransition(newResponses, currentLocked);
        return;
      } else {
        setPhase1Index(phase1Index + 1);
      }

      // Persist progress (uses effectivePairs which reflects post-filter state)
      saveProgressToLocalStorage(sessionId, {
        phase1Responses: newResponses,
        phase2Responses: [],
        lockedPhases: currentLocked,
        randomizationSeed: seed,
        pairOrder: effectivePairs.map(p => p.pairKey),
      });
    },
    [state, phase1Pairs, phase1Index, phase1Responses, lockedPhases, seed, sessionId, enterPhaseTransition],
  );

  const submitPhase2Response = useCallback(
    (selectedPhase: Phase) => {
      if (state !== 'phase2') return;
      const pair = phase2Pairs[phase2Index];
      if (!pair) return;

      const response: Phase2Response = { pairKey: pair.pairKey, selectedPhase };
      const newResponses = [...phase2Responses, response];
      setPhase2Responses(newResponses);

      if (phase2Index + 1 >= phase2Pairs.length) {
        // All Phase 2 pairs complete — score
        setState('scoring');

        try {
          const allPairKeys: PairKey[] = [
            ...phase1Pairs.slice(0, phase1Responses.length).map(p => p.pairKey),
            ...phase2Pairs.map(p => p.pairKey),
          ];

          const result = scoreHandAssessment({
            sessionId,
            phase1Responses,
            phase2Responses: newResponses,
            phase1CompletedPairs: phase1Responses.length,
            earlyLockTriggered,
            lockedPhases,
            randomizationSeed: seed,
            pairOrder: allPairKeys,
          });

          setFinalResult(result);
          setState('result');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Scoring failed');
          setState('error');
        }
      } else {
        setPhase2Index(phase2Index + 1);

        // Persist progress
        saveProgressToLocalStorage(sessionId, {
          phase1Responses,
          phase2Responses: newResponses,
          lockedPhases,
          randomizationSeed: seed,
          pairOrder: [
            ...phase1Pairs.slice(0, phase1Responses.length).map(p => p.pairKey),
            ...phase2Pairs.map(p => p.pairKey),
          ],
        });
      }
    },
    [state, phase2Pairs, phase2Index, phase2Responses, phase1Pairs, phase1Responses, earlyLockTriggered, lockedPhases, seed, sessionId],
  );

  return {
    state,
    currentPair,
    promptText,
    pairNumber,
    initialTotalPairs,
    drainPhases: identifiedDrainPhases,
    finalResult,
    error,
    beginAssessment,
    submitPhase1Response,
    continueToPhase2,
    submitPhase2Response,
  };
}
