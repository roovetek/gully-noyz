/*
  # Add match configuration fields

  1. Changes to `matches` Table
    - Add `total_overs` column (integer) - Total number of overs in the match
    - Add `balls_per_over` column (integer) - Number of balls allowed per over (typically 6)
    - Set default values: 20 overs, 6 balls per over

  2. Important Notes
    - These fields allow customization of match format
    - Default values represent standard T20 format
    - Fields are required (NOT NULL) to ensure consistency
*/

-- Add total_overs column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'total_overs'
  ) THEN
    ALTER TABLE matches ADD COLUMN total_overs integer NOT NULL DEFAULT 20;
  END IF;
END $$;

-- Add balls_per_over column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'balls_per_over'
  ) THEN
    ALTER TABLE matches ADD COLUMN balls_per_over integer NOT NULL DEFAULT 6;
  END IF;
END $$;

-- Add check constraints for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'matches_total_overs_check'
  ) THEN
    ALTER TABLE matches 
    ADD CONSTRAINT matches_total_overs_check 
    CHECK (total_overs >= 1 AND total_overs <= 50);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'matches_balls_per_over_check'
  ) THEN
    ALTER TABLE matches 
    ADD CONSTRAINT matches_balls_per_over_check 
    CHECK (balls_per_over >= 5 AND balls_per_over <= 8);
  END IF;
END $$;