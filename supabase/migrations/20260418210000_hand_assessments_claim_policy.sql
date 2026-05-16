-- Allow authenticated users to claim anonymous hand_assessments rows
-- by setting user_id on rows where user_id IS NULL.
-- Safe because session_id is a UUID (not enumerable).
-- Coexists with the existing hand_assessments_update_own policy.

create policy "users_claim_orphan_hand_assessments"
  on public.hand_assessments
  for update
  using (user_id is null)
  with check (auth.uid() = user_id);
