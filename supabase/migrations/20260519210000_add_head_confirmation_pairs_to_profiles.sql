-- Head assessment: add confirmation_pairs_fired to profiles
-- Head results (head_type, head_confidence, head_path, head_orientation) are stored on
-- profiles, not a separate table. This column stores the ordered list of confirmation
-- pair keys that fired during the Head assessment (max 2 per user).
-- Format: e.g. '{Ni-Fe|Ni-Te}' or '{Fi-Ne|Fi-Se,Fi-Se|Ti-Se}'

alter table public.profiles
  add column if not exists confirmation_pairs_fired text[];
