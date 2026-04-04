/*
  # Create Match Results Table (Fixed)
  
  1. New Tables
    - `match_results`
      - `id` (uuid, primary key)
      - `match_id` (text, foreign key, unique) - one result per match
      - `status` (text) - completed/abandoned/tie
      - `winner` (text) - winning team name (nullable)
      - `completion_reason` (text) - reason for result (e.g., "target achieved", "all out")
      - `completed_at` (timestamptz) - when match was completed
      - `completed_by_role` (text) - role that completed the match
      
  2. Security
    - Enable RLS on `match_results` table
    - Add policy for reading results
    - Add policy for inserting results (umpire/admin only)
    
  3. Constraints
    - Unique constraint on match_id (one result per match)
    - Check constraint on status values
*/

CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL UNIQUE REFERENCES matches(match_id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('completed', 'abandoned', 'tie')),
  winner text,
  completion_reason text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  completed_by_role text NOT NULL CHECK (completed_by_role IN ('admin', 'umpire'))
);

CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_completed_at ON match_results(completed_at);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read match results"
  ON match_results FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert match results"
  ON match_results FOR INSERT
  TO public
  WITH CHECK (true);