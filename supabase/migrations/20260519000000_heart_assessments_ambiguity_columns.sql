-- Add ambiguity scoring and synthesis routing columns to heart_assessments
-- Required by Spec 1 (Stage 1 ambiguity scoring) and Spec 2 (confidence routing)

alter table public.heart_assessments
  add column if not exists stage1_split_type  text,
  add column if not exists two_candidate      boolean not null default false,
  add column if not exists synthesis_variant  text;

comment on column public.heart_assessments.stage1_split_type is 'clean | 2-2-0 | 2-1-1 — from Stage 1 stance scoring';
comment on column public.heart_assessments.two_candidate     is 'True when 2-2-0 split + D3 unresolved + no pair: shows both types, skips synthesis';
comment on column public.heart_assessments.synthesis_variant is 'synthesis_high | synthesis_moderate | synthesis_low | null (two-candidate skips synthesis)';
