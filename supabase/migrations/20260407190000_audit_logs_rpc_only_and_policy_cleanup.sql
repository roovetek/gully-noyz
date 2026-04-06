/*
  # Path A security hardening: audit_logs RPC-only + policy cleanup

  - Remove direct client INSERT/UPDATE/DELETE on audit_logs
  - Provide SECURITY DEFINER RPCs for audit log create/update
  - Clean duplicate/noisy matches policies while preserving existing permissive behavior
*/

-- ---------------------------------------------------------------------------
-- audit_logs: RPC-only write path
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_log_create(
  p_trace_id text,
  p_match_id text,
  p_endpoint_name text,
  p_request_payload jsonb,
  p_response_body jsonb DEFAULT '{"status":"pending"}'::jsonb,
  p_status_code text DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    trace_id,
    match_id,
    endpoint_name,
    request_payload,
    response_body,
    status_code
  )
  VALUES (
    p_trace_id::uuid,
    p_match_id,
    p_endpoint_name,
    p_request_payload,
    p_response_body,
    p_status_code
  );

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid trace_id format.');
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_update(
  p_trace_id text,
  p_response_body jsonb,
  p_status_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE audit_logs
  SET response_body = p_response_body,
      status_code = p_status_code
  WHERE trace_id = p_trace_id::uuid;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid trace_id format.');
END;
$$;

REVOKE ALL ON FUNCTION public.audit_log_create(text, text, text, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_log_update(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_log_create(text, text, text, jsonb, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_log_update(text, jsonb, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Anyone can update audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Anyone can delete audit logs" ON audit_logs;

-- ---------------------------------------------------------------------------
-- matches: remove duplicate/noisy policies and keep canonical permissive ones
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can create matches" ON matches;
DROP POLICY IF EXISTS "Anyone can update match names" ON matches;

DROP POLICY IF EXISTS "Anyone can insert matches" ON matches;
CREATE POLICY "Anyone can insert matches"
  ON matches FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update matches" ON matches;
CREATE POLICY "Anyone can update matches"
  ON matches FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
