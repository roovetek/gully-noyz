/*
  # Admin recovery RPC: reset match secret + role passcodes

  - Adds admin_reset_match_credentials(match_id, admin_passcode, new_secret, new_umpire, new_scorer)
  - Verifies dashboard admin passcode server-side
  - Resets private match secret and both role passcodes
  - Writes metadata-only audit entry (no plaintext secrets/passcodes)
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_reset_match_credentials(
  p_match_id text,
  p_admin_passcode text,
  p_new_match_secret text,
  p_new_umpire_passcode text,
  p_new_scorer_passcode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  mid text;
BEGIN
  mid := trim(both from upper(p_match_id));
  IF mid IS NULL OR mid !~ '^[A-Z0-9]{6}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid match ID format.');
  END IF;

  IF NOT public.verify_global_admin_passcode(p_admin_passcode) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid dashboard passcode.');
  END IF;

  IF p_new_match_secret IS NULL OR length(trim(both from p_new_match_secret)) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Match secret must be at least 6 characters.');
  END IF;
  IF p_new_umpire_passcode IS NULL OR length(trim(both from p_new_umpire_passcode)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Umpire passcode must be at least 4 characters.');
  END IF;
  IF p_new_scorer_passcode IS NULL OR length(trim(both from p_new_scorer_passcode)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Scorer passcode must be at least 4 characters.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE match_id = mid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Match not found.');
  END IF;

  UPDATE matches
  SET
    secret_hash = encode(digest(convert_to(trim(both from p_new_match_secret), 'UTF8'), 'sha256'), 'hex'),
    is_public = false
  WHERE match_id = mid;

  UPDATE access_roles
  SET passcode_hash = public._match_passcode_sha256_hex(trim(both from p_new_umpire_passcode))
  WHERE match_id = mid AND role = 'umpire';

  IF NOT EXISTS (
    SELECT 1 FROM access_roles WHERE match_id = mid AND role = 'umpire'
  ) THEN
    INSERT INTO access_roles (match_id, role, passcode_hash)
    VALUES (mid, 'umpire', public._match_passcode_sha256_hex(trim(both from p_new_umpire_passcode)));
  END IF;

  UPDATE access_roles
  SET passcode_hash = public._match_passcode_sha256_hex(trim(both from p_new_scorer_passcode))
  WHERE match_id = mid AND role = 'scorer';

  IF NOT EXISTS (
    SELECT 1 FROM access_roles WHERE match_id = mid AND role = 'scorer'
  ) THEN
    INSERT INTO access_roles (match_id, role, passcode_hash)
    VALUES (mid, 'scorer', public._match_passcode_sha256_hex(trim(both from p_new_scorer_passcode)));
  END IF;

  PERFORM public.audit_log_create(
    gen_random_uuid()::text,
    mid,
    'admin_reset_match_credentials',
    jsonb_build_object(
      'action', 'reset_match_credentials',
      'updated_secret', true,
      'updated_umpire_passcode', true,
      'updated_scorer_passcode', true
    ),
    jsonb_build_object('ok', true),
    '200'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_match_credentials(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_match_credentials(text, text, text, text, text) TO anon, authenticated;
