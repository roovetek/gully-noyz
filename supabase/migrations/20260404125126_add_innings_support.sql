/*
  # Add Innings Support to Cricket Match Tracking

  1. Changes to `clips` Table
    - Add `innings_number` column (integer, default 1)
    - Values restricted to 1 or 2 only
    - Update unique constraint to include innings_number
    - Add index for faster innings-based queries

  2. Changes to `matches` Table
    - Add `current_innings` column (integer, default 1)
    - Values restricted to 1 or 2 only
    - Track which innings is currently active

  3. Important Notes
    - Each match has exactly 2 innings
    - Innings transition happens after total_overs are completed
    - Clips are now uniquely identified by: match_id + innings_number + over_number + ball_number
    - Statistics and timeline can be filtered by innings
*/

-- Add innings_number to clips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clips' AND column_name = 'innings_number'
  ) THEN
    ALTER TABLE clips ADD COLUMN innings_number integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add check constraint for innings_number (1 or 2 only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clips_innings_number_check'
  ) THEN
    ALTER TABLE clips 
    ADD CONSTRAINT clips_innings_number_check 
    CHECK (innings_number IN (1, 2));
  END IF;
END $$;

-- Add current_innings to matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'current_innings'
  ) THEN
    ALTER TABLE matches ADD COLUMN current_innings integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add check constraint for current_innings (1 or 2 only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'matches_current_innings_check'
  ) THEN
    ALTER TABLE matches 
    ADD CONSTRAINT matches_current_innings_check 
    CHECK (current_innings IN (1, 2));
  END IF;
END $$;

-- Create index on clips for innings-based queries
CREATE INDEX IF NOT EXISTS idx_clips_match_innings 
ON clips(match_id, innings_number);

-- Create unique constraint on clips including innings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clips_match_innings_over_ball_unique'
  ) THEN
    ALTER TABLE clips 
    ADD CONSTRAINT clips_match_innings_over_ball_unique 
    UNIQUE (match_id, innings_number, over_number, ball_number);
  END IF;
END $$;