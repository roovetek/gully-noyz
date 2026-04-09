/*
  # Create matches table (base schema)

  Later migrations alter `matches` (secrets, rules, innings, RLS, etc.). Those migrations
  assumed this table already existed in hosted Supabase; fresh `supabase db reset`
  failed with "relation matches does not exist" because no migration created it.
*/

CREATE TABLE IF NOT EXISTS public.matches (
  match_id text PRIMARY KEY,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches (created_at DESC);
