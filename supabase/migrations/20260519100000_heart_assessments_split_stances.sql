-- Add stage1_split_stances telemetry column to heart_assessments
-- Stores which stances were in the Stage 1 split (null for clean reads).
-- Supports beta analysis of split rates per stance pair.

ALTER TABLE heart_assessments
  ADD COLUMN IF NOT EXISTS stage1_split_stances TEXT[] DEFAULT NULL;

COMMENT ON COLUMN heart_assessments.stage1_split_stances IS
  'Which stances were in the Stage 1 split (e.g. {assertive,withdrawn} for 2-2-0). NULL for clean reads. Used for beta telemetry.';
