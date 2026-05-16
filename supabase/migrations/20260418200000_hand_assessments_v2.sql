-- Hand Assessment v2: Five-phase energy/drain model
-- Applied manually via Supabase dashboard SQL editor

create table if not exists public.hand_assessments (
  id                    uuid          primary key default gen_random_uuid(),
  user_id               uuid          references auth.users(id) on delete set null,
  session_id            uuid          not null,
  assessment_version    text          not null default 'hand_v2_five_phase',

  -- Raw responses
  phase1_responses      jsonb         not null,
  phase2_responses      jsonb         not null,
  phase1_completed_pairs smallint     not null check (phase1_completed_pairs between 0 and 10),

  -- Scores
  drain_scores          jsonb         not null,
  energy_scores         jsonb         not null,

  -- Phase assignments
  energy_phases         text[]        not null,
  drain_phases          text[]        not null,
  neutral_phases        text[]        not null,

  -- Confidence
  drain_confidence      text          not null check (drain_confidence in ('high', 'moderate', 'low')),
  energy_confidence     text          not null check (energy_confidence in ('high', 'moderate', 'low')),
  overall_confidence    text          not null check (overall_confidence in ('high', 'moderate', 'low')),

  -- Early lock
  early_lock_triggered  boolean       not null default false,
  locked_phases         text[]        not null default '{}',

  -- Randomization
  randomization_seed    bigint        not null,
  pair_order            jsonb         not null,

  -- Timestamps
  started_at            timestamptz   not null default now(),
  completed_at          timestamptz,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

-- Phase enum validation for array columns
alter table public.hand_assessments
  add constraint chk_energy_phases
    check (energy_phases <@ array['sensing','generating','evaluating','mobilizing','completing']::text[]);

alter table public.hand_assessments
  add constraint chk_drain_phases
    check (drain_phases <@ array['sensing','generating','evaluating','mobilizing','completing']::text[]);

alter table public.hand_assessments
  add constraint chk_neutral_phases
    check (neutral_phases <@ array['sensing','generating','evaluating','mobilizing','completing']::text[]);

alter table public.hand_assessments
  add constraint chk_locked_phases
    check (locked_phases <@ array['sensing','generating','evaluating','mobilizing','completing']::text[]);

-- Indexes
create index if not exists idx_hand_assessments_user_id
  on public.hand_assessments(user_id);

create index if not exists idx_hand_assessments_created_at
  on public.hand_assessments(created_at desc);

-- RLS
alter table public.hand_assessments enable row level security;

create policy "hand_assessments_select_own"
  on public.hand_assessments
  for select
  using (user_id = auth.uid() or user_id is null);

create policy "hand_assessments_insert_own"
  on public.hand_assessments
  for insert
  with check (user_id = auth.uid() or user_id is null);

create policy "hand_assessments_update_own"
  on public.hand_assessments
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Reuse the set_updated_at trigger function from Heart migration (CREATE OR REPLACE is idempotent)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger hand_assessments_set_updated_at
  before update on public.hand_assessments
  for each row
  execute function public.set_updated_at();
