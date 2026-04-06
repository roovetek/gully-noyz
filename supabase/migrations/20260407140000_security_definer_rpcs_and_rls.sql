/*
  # Security: SECURITY DEFINER RPCs + tighter RLS (demo–production tier)

  - Match passcodes: no anon SELECT on access_roles; verify via verify_match_role_passcode
  - Dashboard password: no anon read/write on app_settings; use RPCs
  - global_rules: remove open anon UPDATE; use update_global_rules_as_admin
  - Destructive deletes: remove broad anon DELETE; production deletes via admin_delete_match RPC
  - Test isolation: anon may DELETE clips/matches only where is_test_data = true (CI / integration tests)
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers (same algorithm as browser: SHA-256 of UTF-8 bytes, lowercase hex)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._match_passcode_sha256_hex(p_passcode text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(digest(convert_to(p_passcode, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public._global_passcode_sha256_hex(p_passcode text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(digest(convert_to(trim(both from p_passcode), 'UTF8'), 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- Match role verification (replaces client-side hash read/compare)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_match_role_passcode(
  p_match_id text,
  p_role text,
  p_passcode text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
  computed text;
BEGIN
  IF p_match_id IS NULL OR p_role IS NULL OR p_passcode IS NULL THEN
    RETURN false;
  END IF;
  IF p_role NOT IN ('umpire', 'scorer', 'captain') THEN
    RETURN false;
  END IF;

  SELECT ar.passcode_hash INTO stored_hash
  FROM access_roles ar
  WHERE ar.match_id = p_match_id AND ar.role = p_role
  LIMIT 1;

  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;

  computed := public._match_passcode_sha256_hex(p_passcode);
  RETURN stored_hash = computed;
END;
$$;

-- ---------------------------------------------------------------------------
-- Global dashboard admin (app_settings)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_global_admin_password_configured()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  h text;
BEGIN
  SELECT s.global_admin_passcode_hash INTO h FROM app_settings s WHERE s.id = 1;
  IF h IS NULL OR length(trim(h)) = 0 THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.migrate_legacy_dashboard_hash(p_legacy_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF p_legacy_hash IS NULL OR length(trim(p_legacy_hash)) = 0 THEN
    RETURN false;
  END IF;
  normalized := lower(trim(both from p_legacy_hash));
  IF normalized !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;
  IF public.is_global_admin_password_configured() THEN
    RETURN false;
  END IF;

  INSERT INTO app_settings (id, global_admin_passcode_hash, updated_at)
  VALUES (1, normalized, now())
  ON CONFLICT (id) DO UPDATE
  SET global_admin_passcode_hash = excluded.global_admin_passcode_hash,
      updated_at = excluded.updated_at;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_global_admin_passcode(p_passcode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h text;
BEGIN
  IF p_passcode IS NULL OR length(trim(both from p_passcode)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Passcode must be at least 4 characters.');
  END IF;
  IF public.is_global_admin_password_configured() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Password already configured.');
  END IF;

  h := public._global_passcode_sha256_hex(p_passcode);
  INSERT INTO app_settings (id, global_admin_passcode_hash, updated_at)
  VALUES (1, h, now())
  ON CONFLICT (id) DO UPDATE
  SET global_admin_passcode_hash = excluded.global_admin_passcode_hash,
      updated_at = excluded.updated_at;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_global_admin_passcode(p_passcode text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  stored text;
BEGIN
  IF p_passcode IS NULL OR length(trim(both from p_passcode)) = 0 THEN
    RETURN false;
  END IF;
  SELECT s.global_admin_passcode_hash INTO stored FROM app_settings s WHERE s.id = 1;
  IF stored IS NULL OR length(trim(stored)) = 0 THEN
    RETURN false;
  END IF;
  RETURN stored = public._global_passcode_sha256_hex(p_passcode);
END;
$$;

CREATE OR REPLACE FUNCTION public.change_global_admin_passcode(p_current text, p_new text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored text;
BEGIN
  IF p_new IS NULL OR length(trim(both from p_new)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'New password must be at least 4 characters.');
  END IF;
  SELECT s.global_admin_passcode_hash INTO stored FROM app_settings s WHERE s.id = 1;
  IF stored IS NULL OR length(trim(stored)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No dashboard password is set yet. Sign in once to create it.');
  END IF;
  IF stored <> public._global_passcode_sha256_hex(p_current) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Current password is incorrect.');
  END IF;

  UPDATE app_settings
  SET global_admin_passcode_hash = public._global_passcode_sha256_hex(p_new),
      updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Global rules (requires dashboard passcode)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_global_rules_as_admin(p_passcode text, p_rules jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gid uuid;
BEGIN
  IF p_rules IS NULL OR jsonb_typeof(p_rules) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid rules payload.');
  END IF;
  IF NOT public.verify_global_admin_passcode(p_passcode) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid dashboard passcode.');
  END IF;

  SELECT g.id INTO gid FROM global_rules g LIMIT 1;

  IF gid IS NULL THEN
    INSERT INTO global_rules (
      overs_per_innings,
      balls_per_over,
      max_wickets,
      max_overs_per_bowler,
      wide_no_runs,
      wide_no_ball_count,
      legbye_no_runs,
      consecutive_overs_required,
      updated_at,
      updated_by
    )
    VALUES (
      COALESCE((p_rules->>'overs_per_innings')::int, 20),
      COALESCE((p_rules->>'balls_per_over')::int, 6),
      COALESCE((p_rules->>'max_wickets')::int, 10),
      COALESCE((p_rules->>'max_overs_per_bowler')::int, 4),
      COALESCE((p_rules->>'wide_no_runs')::boolean, false),
      COALESCE((p_rules->>'wide_no_ball_count')::boolean, false),
      COALESCE((p_rules->>'legbye_no_runs')::boolean, false),
      COALESCE((p_rules->>'consecutive_overs_required')::boolean, false),
      now(),
      'global_admin'
    );
  ELSE
    UPDATE global_rules SET
      overs_per_innings = COALESCE((p_rules->>'overs_per_innings')::int, overs_per_innings),
      balls_per_over = COALESCE((p_rules->>'balls_per_over')::int, balls_per_over),
      max_wickets = COALESCE((p_rules->>'max_wickets')::int, max_wickets),
      max_overs_per_bowler = COALESCE((p_rules->>'max_overs_per_bowler')::int, max_overs_per_bowler),
      wide_no_runs = COALESCE((p_rules->>'wide_no_runs')::boolean, wide_no_runs),
      wide_no_ball_count = COALESCE((p_rules->>'wide_no_ball_count')::boolean, wide_no_ball_count),
      legbye_no_runs = COALESCE((p_rules->>'legbye_no_runs')::boolean, legbye_no_runs),
      consecutive_overs_required = COALESCE((p_rules->>'consecutive_overs_required')::boolean, consecutive_overs_required),
      updated_at = now(),
      updated_by = 'global_admin'
    WHERE id = gid;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin delete match (storage + clips + audit + match row)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_delete_match(p_match_id text, p_passcode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mid text;
BEGIN
  mid := trim(both from upper(p_match_id));
  IF mid IS NULL OR mid !~ '^[A-Z0-9]{6}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid match ID format.');
  END IF;
  IF NOT public.verify_global_admin_passcode(p_passcode) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid dashboard passcode.');
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'clips'
    AND (name = mid OR name LIKE mid || '/%');

  DELETE FROM clips WHERE match_id = mid;
  DELETE FROM audit_logs WHERE match_id = mid;
  DELETE FROM matches WHERE match_id = mid;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants (callable by PostgREST anon/authenticated)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public._match_passcode_sha256_hex(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._global_passcode_sha256_hex(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_match_role_passcode(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_global_admin_password_configured() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.migrate_legacy_dashboard_hash(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_global_admin_passcode(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_global_admin_passcode(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.change_global_admin_passcode(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_global_rules_as_admin(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_match(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.verify_match_role_passcode(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_admin_password_configured() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_legacy_dashboard_hash(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_global_admin_passcode(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_global_admin_passcode(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_global_admin_passcode(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_global_rules_as_admin(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_match(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: access_roles — remove hash exfiltration
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can read access roles for verification" ON access_roles;

-- ---------------------------------------------------------------------------
-- RLS: app_settings — no direct anon access
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
DROP POLICY IF EXISTS "Anyone can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Anyone can update app settings" ON app_settings;

-- ---------------------------------------------------------------------------
-- RLS: global_rules — read-only for anon
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can update global rules" ON global_rules;

-- ---------------------------------------------------------------------------
-- RLS: remove broad anon DELETE (replaced by RPC + test-only where noted)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can delete clips" ON clips;
CREATE POLICY "Anyone can delete test clips only"
  ON clips FOR DELETE
  TO public
  USING (is_test_data = true);

DROP POLICY IF EXISTS "Anyone can delete match results" ON match_results;

DROP POLICY IF EXISTS "Anyone can delete rule overrides" ON match_rule_overrides;

DROP POLICY IF EXISTS "Anyone can delete access roles" ON access_roles;

DROP POLICY IF EXISTS "Anyone can delete audit logs" ON audit_logs;

DROP POLICY IF EXISTS "Anyone can delete clips from storage" ON storage.objects;

-- ---------------------------------------------------------------------------
-- matches: enable RLS — allow normal app use; DELETE only test rows for anon
-- ---------------------------------------------------------------------------

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read matches" ON matches;
CREATE POLICY "Anyone can read matches"
  ON matches FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert matches" ON matches;
CREATE POLICY "Anyone can insert matches"
  ON matches FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update matches" ON matches;
CREATE POLICY "Anyone can update matches"
  ON matches FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete test matches only" ON matches;
CREATE POLICY "Anyone can delete test matches only"
  ON matches FOR DELETE TO public USING (is_test_data = true);
