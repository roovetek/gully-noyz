/*
  # AI decision trace logs

  Stores local AI scoring outputs (live + mock + fallback) for auditability.
*/

CREATE TABLE IF NOT EXISTS ai_decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  match_id text,
  innings_number integer,
  over_number integer,
  ball_number integer,
  delivery_index integer,
  mode text NOT NULL CHECK (mode IN ('live', 'mock', 'off', 'fallback')),
  status text NOT NULL CHECK (status IN ('success', 'unavailable', 'error')),
  transcript text,
  decision jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text,
  confidence numeric,
  error_message text,
  raw_response jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_match_created_at
  ON ai_decision_logs (match_id, created_at DESC);

ALTER TABLE ai_decision_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert ai_decision_logs" ON ai_decision_logs;
CREATE POLICY "Anyone can insert ai_decision_logs"
  ON ai_decision_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read ai_decision_logs" ON ai_decision_logs;
CREATE POLICY "Anyone can read ai_decision_logs"
  ON ai_decision_logs
  FOR SELECT
  TO public
  USING (true);
