/*
  # Remove Old Ball Constraint to Fix Innings 2 Recording

  1. Problem
    - Two conflicting unique constraints exist on clips table
    - Old constraint: clips_match_over_ball_unique (match_id, over_number, ball_number)
    - New constraint: clips_match_innings_over_ball_unique (match_id, innings_number, over_number, ball_number)
    - Old constraint prevents same ball numbers across different innings

  2. Changes
    - Drop the old clips_match_over_ball_unique constraint
    - Keep clips_match_innings_over_ball_unique which correctly includes innings_number
    - This allows Ball 1, Over 1 to exist in both Innings 1 and Innings 2

  3. Security
    - No RLS changes needed
    - Duplicate prevention still enforced within same innings
*/

-- Drop the old constraint that doesn't include innings_number
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clips_match_over_ball_unique'
  ) THEN
    ALTER TABLE clips DROP CONSTRAINT clips_match_over_ball_unique;
  END IF;
END $$;
