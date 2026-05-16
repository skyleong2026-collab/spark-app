import type {
  Phase1Response,
  Phase2Response,
  Phase,
  HandScoringResult,
  PairKey,
} from './handTypes';
import { supabase } from '../../../lib/supabase';

// ── Local session shape ─────────────────────────────────────────────────────

export interface HandLocalSession {
  phase1Responses: Phase1Response[];
  phase2Responses: Phase2Response[];
  lockedPhases: Phase[];
  randomizationSeed: number;
  pairOrder: PairKey[];
}

// ── Fresh-start check ───────────────────────────────────────────────────────

function isFreshStart(): boolean {
  try {
    return sessionStorage.getItem('spark_fresh_start') === 'true';
  } catch {
    return false;
  }
}

function sessionKey(sessionId: string): string {
  return `spark_hand_session_${sessionId}`;
}

// ── localStorage functions ──────────────────────────────────────────────────

export function saveProgressToLocalStorage(
  sessionId: string,
  state: HandLocalSession,
): void {
  try {
    localStorage.setItem(sessionKey(sessionId), JSON.stringify(state));
  } catch {
    // localStorage unavailable — state lives in memory only
  }
}

export function loadSessionFromLocalStorage(
  sessionId: string,
): HandLocalSession | null {
  try {
    if (isFreshStart()) return null;
    const raw = localStorage.getItem(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as HandLocalSession;
  } catch {
    return null;
  }
}

export function clearLocalSession(sessionId: string): void {
  try {
    localStorage.removeItem(sessionKey(sessionId));
  } catch {
    // localStorage unavailable
  }
}

// ── Supabase persistence ────────────────────────────────────────────────────

/**
 * Inserts the final Hand result to Supabase.
 * DB-side timestamps: started_at defaults to now() on insert,
 * completed_at is set explicitly here. These are NOT on HandScoringResult.
 */
export async function persistFinalResultToSupabase(
  result: HandScoringResult,
  userId: string | null,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('hand_assessments')
    .insert({
      user_id: userId,
      session_id: result.session_id,
      assessment_version: result.assessment_version,
      phase1_responses: result.phase1_responses,
      phase2_responses: result.phase2_responses,
      phase1_completed_pairs: result.phase1_completed_pairs,
      drain_scores: result.drain_scores,
      energy_scores: result.energy_scores,
      energy_phases: result.energy_phases,
      drain_phases: result.drain_phases,
      neutral_phases: result.neutral_phases,
      drain_confidence: result.drain_confidence,
      energy_confidence: result.energy_confidence,
      overall_confidence: result.overall_confidence,
      early_lock_triggered: result.early_lock_triggered,
      locked_phases: result.locked_phases,
      randomization_seed: result.randomization_seed,
      pair_order: result.pair_order,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

export async function associateSessionWithUser(
  assessmentId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('hand_assessments')
    .update({ user_id: userId })
    .eq('id', assessmentId);
}
