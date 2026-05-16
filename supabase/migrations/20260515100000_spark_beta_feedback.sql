-- spark_beta_feedback: post-results modal feedback for SPARK beta
-- Applied manually via Supabase dashboard SQL editor

create table if not exists public.spark_beta_feedback (
  id                       uuid          primary key default gen_random_uuid(),

  -- Session context
  assessment_id            uuid,
  user_id                  uuid          references auth.users(id) on delete set null,

  -- Profile snapshot at time of feedback
  heart_type               text,
  head_stack               text,
  hand_energy              text[],
  heart_confidence         text,
  head_confidence          text,
  tier                     text,

  -- Quantitative ratings (1–5, null if skipped)
  q_recognition            smallint      check (q_recognition between 1 and 5),
  q_resonance              smallint      check (q_resonance between 1 and 5),
  q_tension_accuracy       smallint      check (q_tension_accuracy between 1 and 5),
  q_language_fit           smallint      check (q_language_fit between 1 and 5),

  -- Open text (optional)
  q_open_text              text,

  -- Section thumbs ('up' | 'down' | null)
  thumb_core_motivation    text          check (thumb_core_motivation in ('up','down')),
  thumb_processing         text          check (thumb_processing in ('up','down')),
  thumb_contribution_drain text          check (thumb_contribution_drain in ('up','down')),
  thumb_intersection       text          check (thumb_intersection in ('up','down')),

  -- Exemplar version tag
  exemplar_version         text          not null default 'v1.0',

  -- Follow-up email state
  followup_email_sent      boolean       not null default false,
  followup_sent_at         timestamptz,
  followup_response_token  text          unique,

  -- Audit
  created_at               timestamptz   not null default now()
);

create index if not exists idx_spark_beta_feedback_user_id
  on public.spark_beta_feedback(user_id);

create index if not exists idx_spark_beta_feedback_followup
  on public.spark_beta_feedback(followup_email_sent, created_at)
  where followup_email_sent = false;

alter table public.spark_beta_feedback enable row level security;

-- Users can insert their own rows or anonymous rows
create policy "beta_feedback_insert"
  on public.spark_beta_feedback
  for insert
  with check (user_id = auth.uid() or user_id is null);

-- Users can read their own rows
create policy "beta_feedback_select_own"
  on public.spark_beta_feedback
  for select
  using (user_id = auth.uid());
