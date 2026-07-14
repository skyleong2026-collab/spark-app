-- §17 Corpus Schema — DRAFT
-- Source: SPARK Master Prompt §17.2
-- Status: DRAFT — do NOT apply to production until §17.8 Definition of Done is complete:
--   1. Jon has read and approved §17.1–§17.4
--   2. Attorney has reviewed §17.5 consent copy and §17.4 IP posture
--   3. LLC entity name confirmed (Pono Path LLC or successor per §14)
--   4. §17.5 Tier 3 full legal text drafted
-- This file satisfies §17.8 DoD item: "CC has produced a migration file."
-- Apply via Supabase MCP or CLI after all lock criteria are met.

-- ─── corpus_consent ───────────────────────────────────────────────────────────

CREATE TABLE corpus_consent (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Granular categories, all default FALSE (explicit opt-in required)
  retain_transcripts BOOLEAN NOT NULL DEFAULT false,
  research_use BOOLEAN NOT NULL DEFAULT false,
  product_improvement BOOLEAN NOT NULL DEFAULT false,
  aggregate_publication BOOLEAN NOT NULL DEFAULT false,
  clinician_adjudication BOOLEAN NOT NULL DEFAULT false,  -- beta-only flag
  -- Metadata
  beta_cohort_id TEXT,
  consent_version TEXT NOT NULL,  -- e.g., 'v1.0' — pins user to copy they saw
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ  -- non-null = full revocation; triggers deletion job
);

CREATE TABLE corpus_consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN,
  consent_version TEXT NOT NULL,
  change_reason TEXT  -- 'initial_signup' | 'user_update' | 'admin_correction'
);

-- ─── corpus_transcripts ───────────────────────────────────────────────────────
-- One row per turn (user message OR assistant message).
-- component field distinguishes Opening / Interview / Reading / Companion.
-- register_profile for Opening turns lives in payload JSONB.

CREATE TABLE corpus_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,  -- groups turns within one component-session
  component TEXT NOT NULL CHECK (component IN ('opening', 'interview', 'reading', 'companion')),
  turn_index INTEGER NOT NULL,  -- 0-based within session
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  -- Model metadata (for assistant turns)
  model_id TEXT,
  prompt_version TEXT,  -- e.g., 'opening_v1'
  -- Component-specific structured payload
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Soft delete: marked on revocation, hard-deleted by background job after grace period
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_corpus_transcripts_user_session ON corpus_transcripts(user_id, session_id, turn_index);
CREATE INDEX idx_corpus_transcripts_component ON corpus_transcripts(component, created_at);

-- ─── corpus_recognition ───────────────────────────────────────────────────────
-- Recognition scores and Reading interactions. This is the table the §0
-- success metric (85–90% recognition target) reads from.

CREATE TABLE corpus_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_session_id UUID NOT NULL,
  -- Self-report recognition (the 85–90% target metric from §0)
  overall_recognition INTEGER CHECK (overall_recognition BETWEEN 1 AND 5),
  section_recognition JSONB,  -- per-paragraph: {'core_motivation': 5, 'processing': 4, ...}
  -- Free text
  pushback_text TEXT,
  adjustment_count INTEGER DEFAULT 0,
  -- Linkage
  synthesis_variant TEXT,
  exemplar_versions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── corpus_adjudication ──────────────────────────────────────────────────────
-- Clinician disagreement resolution (beta-only).
-- signal_class = 'interview_correct_battery_wrong' rows are the highest-value
-- learning cases per §8 and drive Battery updates downstream.

CREATE TABLE corpus_adjudication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_session_id UUID NOT NULL,
  battery_result JSONB NOT NULL,
  interview_result JSONB NOT NULL,
  disagreement_axis TEXT[],
  adjudicator_id UUID REFERENCES auth.users(id),
  adjudicator_call JSONB,
  adjudicator_notes TEXT,
  confidence TEXT CHECK (confidence IN ('high', 'moderate', 'low')),
  resolved_at TIMESTAMPTZ,
  signal_class TEXT CHECK (signal_class IN (
    'interview_correct_battery_wrong',
    'battery_correct_interview_wrong',
    'both_plausible',
    'neither_clear'
  ))
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE corpus_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_recognition ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_adjudication ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own rows only
CREATE POLICY user_owns_consent ON corpus_consent
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_owns_transcripts ON corpus_transcripts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_owns_recognition ON corpus_recognition
  FOR ALL USING (auth.uid() = user_id);

-- Adjudication: readable by the user AND their assigned adjudicator
CREATE POLICY user_reads_own_adjudication ON corpus_adjudication
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = adjudicator_id);

CREATE POLICY adjudicator_writes ON corpus_adjudication
  FOR UPDATE USING (auth.uid() = adjudicator_id);

-- Service role (Edge Functions) bypasses RLS for legitimate writes.
-- The corpus_disabled feature flag lives in Edge Function env config, not here.
-- Flip VITE_CORPUS_DISABLED=false only after §17.6 rule 1 is satisfied.
