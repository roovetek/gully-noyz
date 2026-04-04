/*
  # Create Match Rule Overrides Table (Fixed)
  
  1. New Tables
    - `match_rule_overrides`
      - `id` (uuid, primary key)
      - `match_id` (text, foreign key) - reference to matches.match_id
      - `rule_name` (text) - name of rule being overridden
      - `original_value` (text) - original value from match snapshot
      - `override_value` (text) - new value set by umpire/admin
      - `reason` (text) - reason for override (required)
      - `applied_at` (timestamptz) - when override was applied
      - `applied_by_role` (text) - role that applied override
      - `reverted_at` (timestamptz) - when override was reverted (nullable)
      - `reverted_by_role` (text) - role that reverted override (nullable)
      
  2. Security
    - Enable RLS on `match_rule_overrides` table
    - Add policy for reading overrides
    - Add policy for inserting overrides (umpire/admin)
    - Add policy for updating (revert operation)
    
  3. Indexes
    - Index on match_id for fast lookups
    - Index on applied_at for audit trail
*/

CREATE TABLE IF NOT EXISTS match_rule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  original_value text NOT NULL,
  override_value text NOT NULL,
  reason text NOT NULL,
  applied_at timestamptz DEFAULT now(),
  applied_by_role text NOT NULL CHECK (applied_by_role IN ('admin', 'umpire')),
  reverted_at timestamptz,
  reverted_by_role text CHECK (reverted_by_role IN ('admin', 'umpire'))
);

CREATE INDEX IF NOT EXISTS idx_rule_overrides_match_id ON match_rule_overrides(match_id);
CREATE INDEX IF NOT EXISTS idx_rule_overrides_applied_at ON match_rule_overrides(applied_at);

ALTER TABLE match_rule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rule overrides"
  ON match_rule_overrides FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert rule overrides"
  ON match_rule_overrides FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update rule overrides"
  ON match_rule_overrides FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);