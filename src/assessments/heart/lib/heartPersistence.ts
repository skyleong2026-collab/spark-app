import type {
  ItemKey,
  LikertResponse,
  HeartScoringResult,
} from './heartTypes';
import { supabase } from '../../../lib/supabase';

// ── Local session shape ─────────────────────────────────────────────────────

export interface HeartLocalSession {
  responses: Partial<Record<ItemKey, LikertResponse>>;
  randomizationSeed: number;
  itemOrder: ItemKey[];
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
  return `spark_heart_session_${sessionId}`;
}

// ── localStorage functions ──────────────────────────────────────────────────

export function saveResponseToLocalStorage(
  sessionId: string,
  itemKey: ItemKey,
  value: LikertResponse,
): void {
  try {
    const key = sessionKey(sessionId);
    const raw = localStorage.getItem(key);
    const session: HeartLocalSession = raw
      ? (JSON.parse(raw) as HeartLocalSession)
      : { responses: {}, randomizationSeed: 0, itemOrder: [] };
    session.responses[itemKey] = value;
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // localStorage unavailable — responses live in memory only
  }
}

export function saveSessionMetadata(
  sessionId: string,
  seed: number,
  itemOrder: ItemKey[],
): void {
  try {
    const key = sessionKey(sessionId);
    const raw = localStorage.getItem(key);
    const session: HeartLocalSession = raw
      ? (JSON.parse(raw) as HeartLocalSession)
      : { responses: {}, randomizationSeed: 0, itemOrder: [] };
    session.randomizationSeed = seed;
    session.itemOrder = itemOrder;
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // localStorage unavailable
  }
}

export function loadSessionFromLocalStorage(
  sessionId: string,
): HeartLocalSession | null {
  try {
    if (isFreshStart()) return null;
    const raw = localStorage.getItem(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as HeartLocalSession;
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

export async function persistFinalResultToSupabase(
  result: HeartScoringResult,
  userId: string | null,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('heart_assessments')
    .insert({
      user_id: userId,
      assessment_version: result.assessment_version,
      responses: result.responses,
      stance_scores: result.stance_scores,
      center_scores: result.center_scores,
      primary_stance: result.primary_stance,
      secondary_stance: result.secondary_stance,
      primary_center: result.primary_center,
      secondary_center: result.secondary_center,
      stance_separation: result.stance_separation,
      center_separation: result.center_separation,
      primary_type: result.primary_type,
      secondary_type: result.secondary_type,
      stance_confidence: result.stance_confidence,
      center_confidence: result.center_confidence,
      overall_confidence: result.overall_confidence,
      confirmation_triggered: result.confirmation_triggered,
      confirmation_pair: result.confirmation_pair,
      confirmation_reason: result.confirmation_reason,
      confirmation_result: result.confirmation_result,
      confirmation_user_pick: result.confirmation_user_pick,
      stage1_split_type: result.stage1_split_type,
      stage1_split_stances: result.stage1_split_stances,
      two_candidate: result.two_candidate,
      synthesis_variant: result.synthesis_variant,
      final_type: result.final_type,
      final_secondary: result.final_secondary,
      final_confidence: result.final_confidence,
      response_pattern_flag: result.response_pattern_flag,
      randomization_seed: result.randomization_seed,
      item_order: result.item_order,
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
    .from('heart_assessments')
    .update({ user_id: userId })
    .eq('id', assessmentId);
}
