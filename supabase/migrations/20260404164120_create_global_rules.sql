/*
  # Create Global Rules Table
  
  1. New Tables
    - `global_rules`
      - `id` (uuid, primary key) - singleton row
      - `overs_per_innings` (int) - default overs per innings
      - `balls_per_over` (int) - balls in an over
      - `max_wickets` (int) - wickets per innings
      - `max_overs_per_bowler` (int) - maximum overs a bowler can bowl
      - `wide_no_runs` (boolean) - whether wides count as 0 runs
      - `wide_no_ball_count` (boolean) - whether wides don't count as valid balls
      - `legbye_no_runs` (boolean) - whether leg-byes count as 0 runs
      - `consecutive_overs_required` (boolean) - whether bowlers must bowl consecutive overs
      - `updated_at` (timestamptz) - last update timestamp
      - `updated_by` (text) - admin who made the update
      
  2. Security
    - Enable RLS on `global_rules` table
    - Add policy for reading global rules (public read)
    - Add policy for updating global rules (restricted)
    
  3. Initial Data
    - Insert default cricket rules
*/

CREATE TABLE IF NOT EXISTS global_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  overs_per_innings int NOT NULL DEFAULT 20,
  balls_per_over int NOT NULL DEFAULT 6,
  max_wickets int NOT NULL DEFAULT 10,
  max_overs_per_bowler int NOT NULL DEFAULT 4,
  wide_no_runs boolean NOT NULL DEFAULT false,
  wide_no_ball_count boolean NOT NULL DEFAULT false,
  legbye_no_runs boolean NOT NULL DEFAULT false,
  consecutive_overs_required boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

ALTER TABLE global_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global rules"
  ON global_rules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can update global rules"
  ON global_rules FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default rules (singleton row)
INSERT INTO global_rules (
  overs_per_innings,
  balls_per_over,
  max_wickets,
  max_overs_per_bowler,
  wide_no_runs,
  wide_no_ball_count,
  legbye_no_runs,
  consecutive_overs_required,
  updated_by
) VALUES (
  20, -- T20 format
  6,  -- standard cricket
  10, -- standard cricket
  4,  -- T20 standard
  false,
  false,
  false,
  false,
  'system'
) ON CONFLICT DO NOTHING;