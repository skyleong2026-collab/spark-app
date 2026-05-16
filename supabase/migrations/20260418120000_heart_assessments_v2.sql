-- Heart Assessment v2: Stance × Center orthogonal model
-- Applied manually via Supabase dashboard SQL editor

create table if not exists public.heart_assessments (
  id                    uuid          primary key default gen_random_uuid(),
  user_id               uuid          references auth.users(id) on delete set null,
  assessment_version    text          not null default 'heart_v2_stance_center',

  -- Raw responses
  responses             jsonb         not null,

  -- Sub-scale scores (0.20–1.00)
  stance_scores         jsonb         not null,
  center_scores         jsonb         not null,

  -- Ranked dimensions
  primary_stance        text          not null,
  secondary_stance      text          not null,
  primary_center        text          not null,
  secondary_center      text          not null,
  stance_separation     numeric(4,3)  not null,
  center_separation     numeric(4,3)  not null,

  -- Algorithm result
  primary_type          smallint      not null,
  secondary_type        smallint      not null,

  -- Confidence
  stance_confidence     text          not null,
  center_confidence     text          not null,
  overall_confidence    text          not null,

  -- Confirmation step
  confirmation_triggered boolean      not null default false,
  confirmation_pair     text,
  confirmation_reason   text,
  confirmation_result   text,
  confirmation_user_pick smallint,

  -- Final resolved result
  final_type            smallint      not null,
  final_secondary       smallint      not null,
  final_confidence      text          not null,

  -- Diagnostics
  response_pattern_flag text          not null default 'normal',
  randomization_seed    bigint        not null,
  item_order            jsonb         not null,

  -- Audit
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

-- Indexes
create index if not exists idx_heart_assessments_user_id
  on public.heart_assessments(user_id);

create index if not exists idx_heart_assessments_created_at
  on public.heart_assessments(created_at desc);

-- RLS
alter table public.heart_assessments enable row level security;

-- Users can read their own rows; anonymous rows (user_id is null) are readable by anyone
create policy "heart_assessments_select_own"
  on public.heart_assessments
  for select
  using (user_id = auth.uid() or user_id is null);

-- Users can insert rows for themselves or anonymously
create policy "heart_assessments_insert_own"
  on public.heart_assessments
  for insert
  with check (user_id = auth.uid() or user_id is null);

-- Users can update their own rows (e.g., post-auth handoff, confirmation result)
create policy "heart_assessments_update_own"
  on public.heart_assessments
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trigger to auto-update updated_at on row modification
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger heart_assessments_set_updated_at
  before update on public.heart_assessments
  for each row
  execute function public.set_updated_at();
