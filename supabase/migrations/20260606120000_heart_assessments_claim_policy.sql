-- Heart Assessment v2: allow authenticated users to claim their anonymous rows
--
-- Phase 5 (auth handoff) bug: a signed-out user completes the assessment, so the
-- row is inserted with user_id IS NULL. After they sign in, the client calls
-- associateSessionWithUser() which runs:
--   UPDATE heart_assessments SET user_id = <uid> WHERE id = <assessmentId>
--
-- The only UPDATE policy, heart_assessments_update_own, has USING (user_id = auth.uid()).
-- For an anonymous row user_id IS NULL, so the USING check never matches → the UPDATE
-- silently affects zero rows and the result is never attached to the account.
--
-- This adds a dedicated, additive claim policy. Postgres OR-combines permissive
-- UPDATE policies, so the net effect for an authenticated user becomes:
--   USING      (user_id = auth.uid() OR user_id IS NULL)
--   WITH CHECK (user_id = auth.uid())
-- i.e. they may update a row that is already theirs OR currently anonymous, but the
-- resulting row must belong to them (they cannot re-orphan it or assign it to someone
-- else). Restricted to the authenticated role so the anon role can never claim rows.
--
-- Authorization is capability-based: the claimant must already hold the row's
-- gen_random_uuid() id (returned to the originating client at insert time and unguessable),
-- matching the existing posture of heart_assessments_select_own which already exposes
-- anonymous rows.

create policy "heart_assessments_claim_anonymous"
  on public.heart_assessments
  for update
  to authenticated
  using (user_id is null)
  with check (user_id = auth.uid());
