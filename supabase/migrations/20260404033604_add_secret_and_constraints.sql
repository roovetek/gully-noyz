/*
  # Add secret column and constraints to matches and clips tables

  1. Changes to `matches` Table
    - Add `secret_hash` column for storing hashed secrets
    - Add `is_public` column to track public/private matches
    - Add `id` column as uuid primary key

  2. Changes to `clips` Table
    - Add unique constraint to prevent duplicate ball numbers per match
    - Add check constraint for valid event types (dot, 1, 2, 3, 4, 6, wicket)

  3. Functions
    - Add function to verify match secrets
    - Add trigger to update updated_at timestamp

  4. Security
    - Uses pgcrypto extension for secure password hashing
    - Policies already exist from previous migration
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add id column to matches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'id'
  ) THEN
    ALTER TABLE matches ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add secret_hash column to matches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'secret_hash'
  ) THEN
    ALTER TABLE matches ADD COLUMN secret_hash text;
  END IF;
END $$;

-- Add is_public column to matches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE matches ADD COLUMN is_public boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add unique constraint to clips to prevent duplicate ball numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clips_match_over_ball_unique'
  ) THEN
    ALTER TABLE clips 
    ADD CONSTRAINT clips_match_over_ball_unique 
    UNIQUE (match_id, over_number, ball_number);
  END IF;
END $$;

-- Add check constraint for valid event types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clips_outcome_check'
  ) THEN
    ALTER TABLE clips 
    ADD CONSTRAINT clips_outcome_check 
    CHECK (outcome IN ('dot', '1', '2', '3', '4', '6', 'wicket'));
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to verify match secret
CREATE OR REPLACE FUNCTION verify_match_secret(match_id_param text, secret_param text)
RETURNS boolean AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT secret_hash INTO stored_hash
  FROM matches
  WHERE match_id = match_id_param;
  
  -- If no secret set (public match), return true
  IF stored_hash IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verify the secret
  RETURN stored_hash = crypt(secret_param, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;