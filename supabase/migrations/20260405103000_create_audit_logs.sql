/*
  # Create Audit Logs Table

  Stores request/response traces for UI-triggered database actions.
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id uuid NOT NULL,
  match_id text,
  endpoint_name text,
  request_payload jsonb,
  response_body jsonb,
  status_code text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id ON audit_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_match_id ON audit_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint_name ON audit_logs(endpoint_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audit logs"
  ON audit_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert audit logs"
  ON audit_logs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update audit logs"
  ON audit_logs FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
