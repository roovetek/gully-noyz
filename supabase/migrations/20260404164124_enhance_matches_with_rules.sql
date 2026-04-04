/*
  # Enhance Matches Table with Rule Snapshot
  
  1. Changes to `matches` table
    - Add rule columns (snapshot from global_rules at creation)
    - `overs_per_innings` (int) - frozen at match creation
    - `balls_per_over` (int)
    - `max_wickets` (int)
    - `max_overs_per_bowler` (int) - NEW
    - `wide_no_runs` (boolean)
    - `wide_no_ball_count` (boolean)
    - `legbye_no_runs` (boolean)
    - `consecutive_overs_required` (boolean)
    - Add match status tracking
    - `status` (text) - in_progress/completed/abandoned
    - `result_type` (text) - winner/tie/abandoned/no_result
    - `winner` (text) - team name if result_type = winner
    
  2. Notes
    - These rules are immutable once match is created
    - Admin changes to global_rules don't affect existing matches
    - Umpire can override during match (stored separately)
*/

DO $$
BEGIN
  -- Add rule columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'overs_per_innings') THEN
    ALTER TABLE matches ADD COLUMN overs_per_innings int NOT NULL DEFAULT 20;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'balls_per_over') THEN
    ALTER TABLE matches ADD COLUMN balls_per_over int NOT NULL DEFAULT 6;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'max_wickets') THEN
    ALTER TABLE matches ADD COLUMN max_wickets int NOT NULL DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'max_overs_per_bowler') THEN
    ALTER TABLE matches ADD COLUMN max_overs_per_bowler int NOT NULL DEFAULT 4;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'wide_no_runs') THEN
    ALTER TABLE matches ADD COLUMN wide_no_runs boolean NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'wide_no_ball_count') THEN
    ALTER TABLE matches ADD COLUMN wide_no_ball_count boolean NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'legbye_no_runs') THEN
    ALTER TABLE matches ADD COLUMN legbye_no_runs boolean NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'consecutive_overs_required') THEN
    ALTER TABLE matches ADD COLUMN consecutive_overs_required boolean NOT NULL DEFAULT false;
  END IF;
  
  -- Add status tracking columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'status') THEN
    ALTER TABLE matches ADD COLUMN status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'result_type') THEN
    ALTER TABLE matches ADD COLUMN result_type text CHECK (result_type IN ('winner', 'tie', 'abandoned', 'no_result'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'winner') THEN
    ALTER TABLE matches ADD COLUMN winner text;
  END IF;
END $$;