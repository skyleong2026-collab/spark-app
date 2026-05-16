-- Add followup_notes column to spark_beta_feedback
-- Apply via Supabase dashboard → SQL Editor before deploying record-followup-response

ALTER TABLE public.spark_beta_feedback
  ADD COLUMN IF NOT EXISTS followup_notes text;
