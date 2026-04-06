/*
  # admin_delete_match: stop deleting storage.objects directly

  Supabase blocks direct SQL deletes on storage.objects ("Use the Storage API instead").
  The app already removes clip files via supabase.storage.from('clips').remove(...) before calling this RPC.
*/

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

  DELETE FROM clips WHERE match_id = mid;
  DELETE FROM audit_logs WHERE match_id = mid;
  DELETE FROM matches WHERE match_id = mid;

  RETURN jsonb_build_object('ok', true);
END;
$$;
