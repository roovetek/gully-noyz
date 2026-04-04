/*
  # Add Test Data Isolation Flags

  1. Changes
    - Add `is_test_data` boolean column to matches and clips tables
    - Default value is `false` for all columns
    - Add indexes on `is_test_data` columns for efficient filtering

  2. Purpose
    - Enable test data isolation so test matches don't appear in production UI
    - All test records will be marked with `is_test_data = true`
    - Production queries will filter with `is_test_data = false`
    - Automated cleanup can target records where `is_test_data = true`

  3. Performance
    - Indexes ensure filtering doesn't impact query performance
    - Default value of `false` means existing data is production data
*/

-- Add is_test_data column to matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'is_test_data'
  ) THEN
    ALTER TABLE matches ADD COLUMN is_test_data boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add is_test_data column to clips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clips' AND column_name = 'is_test_data'
  ) THEN
    ALTER TABLE clips ADD COLUMN is_test_data boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_matches_is_test_data ON matches(is_test_data);
CREATE INDEX IF NOT EXISTS idx_clips_is_test_data ON clips(is_test_data);

-- Add composite indexes for common query patterns (production data queries)
CREATE INDEX IF NOT EXISTS idx_matches_not_test ON matches(created_at DESC) WHERE is_test_data = false;
CREATE INDEX IF NOT EXISTS idx_clips_match_not_test ON clips(match_id, ball_number) WHERE is_test_data = false;