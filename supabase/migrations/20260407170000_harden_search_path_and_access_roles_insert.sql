/*
  # Harden mutable function search_path + access_roles insert path

  1) Set explicit search_path for trigger function update_updated_at_column()
  2) Remove permissive direct INSERT policy on access_roles
  3) Add SECURITY DEFINER RPC for controlled match role creation
*/

-- 1) Hardening: immutable object resolution for trigger function
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;

-- 2) Remove permissive direct insert policy flagged by security advisor
DROP POLICY IF EXISTS "Anyone can insert access roles during match creation" ON public.access_roles;

-- 3) Controlled insert path for match access roles
CREATE OR REPLACE FUNCTION public.create_match_access_roles(
  p_match_id text,
  p_umpire_passcode text,
  p_scorer_passcode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_match_id IS NULL OR p_match_id !~ '^[A-Z0-9]{6}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid match ID format.');
  END IF;

  IF p_umpire_passcode IS NULL OR length(trim(both FROM p_umpire_passcode)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Umpire passcode must be at least 4 characters.');
  END IF;

  IF p_scorer_passcode IS NULL OR length(trim(both FROM p_scorer_passcode)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Scorer passcode must be at least 4 characters.');
  END IF;

  INSERT INTO public.access_roles (match_id, role, passcode_hash)
  VALUES
    (p_match_id, 'umpire', public._match_passcode_sha256_hex(p_umpire_passcode)),
    (p_match_id, 'scorer', public._match_passcode_sha256_hex(p_scorer_passcode));

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Access roles already exist for this match.');
END;
$$;

REVOKE ALL ON FUNCTION public.create_match_access_roles(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_match_access_roles(text, text, text) TO anon, authenticated;
