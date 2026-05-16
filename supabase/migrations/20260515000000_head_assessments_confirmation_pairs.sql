-- Head Assessment: add confirmation_pairs_fired column (array, up to 2 entries)
-- Applied manually via Supabase dashboard SQL editor
--
-- confirmation_pairs_fired replaces the singular confirmation_pair_fired column
-- and stores the ordered list of pair keys that fired during the confirmation step.
-- Format: internal pair keys, e.g. '{Ni-Fe|Ni-Te}' or '{Fi-Ne|Fi-Se,Fi-Se|Ti-Se}'

alter table public.head_assessments
  add column if not exists confirmation_pairs_fired text[];
