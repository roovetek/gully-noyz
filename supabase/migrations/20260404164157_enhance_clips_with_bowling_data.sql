/*
  # Enhance Clips Table with Bowling Data
  
  1. Changes to `clips` table
    - Add `bowler_name` (text) - name of bowler
    - Add `extra_runs` (int) - runs from extras (wides, no-balls, byes, leg-byes)
    - Add `is_valid_ball` (boolean) - whether ball counts toward over
    - Add `over_number` (int) - which over this ball belongs to
    - Add `ball_in_over` (int) - ball number within the over (1-6 typically)
    - Update outcome enum to include extras
    
  2. Notes
    - `is_valid_ball` is calculated based on outcome and rules
    - `extra_runs` is separate from regular runs
    - `over_number` and `ball_in_over` help with display and validation
*/

DO $$
BEGIN
  -- Add bowler_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clips' AND column_name = 'bowler_name') THEN
    ALTER TABLE clips ADD COLUMN bowler_name text;
  END IF;
  
  -- Add extra_runs column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clips' AND column_name = 'extra_runs') THEN
    ALTER TABLE clips ADD COLUMN extra_runs int DEFAULT 0;
  END IF;
  
  -- Add is_valid_ball column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clips' AND column_name = 'is_valid_ball') THEN
    ALTER TABLE clips ADD COLUMN is_valid_ball boolean DEFAULT true;
  END IF;
  
  -- Add over_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clips' AND column_name = 'over_number') THEN
    ALTER TABLE clips ADD COLUMN over_number int DEFAULT 0;
  END IF;
  
  -- Add ball_in_over column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clips' AND column_name = 'ball_in_over') THEN
    ALTER TABLE clips ADD COLUMN ball_in_over int DEFAULT 0;
  END IF;
END $$;