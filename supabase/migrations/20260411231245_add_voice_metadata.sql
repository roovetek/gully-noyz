/*
  # Add voice metadata tracking to match scoring

  1. Changes to clips table
    - Add `input_method` enum column (manual, voice)
    - Add index for querying voice entries
    - Set default to 'manual' for backward compatibility

  2. Changes to ai_decision_logs table
    - Extend to include trace_id, raw_transcript, sanitized_transcript, confidence_score
    - All new columns optional for backward compatibility

  3. Security
    - All data is subject to existing RLS policies
    - Audit logs are immutable once created

  4. Backward Compatibility
    - Existing clips default to 'manual' input method
    - Null values in new columns acceptable for legacy data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clips' AND column_name = 'input_method'
  ) THEN
    ALTER TABLE clips ADD COLUMN input_method text DEFAULT 'manual' CHECK (input_method IN ('manual', 'voice'));
    CREATE INDEX idx_clips_input_method ON clips(match_id, input_method);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_decision_logs' AND column_name = 'trace_id'
  ) THEN
    ALTER TABLE ai_decision_logs ADD COLUMN trace_id uuid;
    CREATE INDEX idx_ai_decision_logs_trace_id ON ai_decision_logs(trace_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_decision_logs' AND column_name = 'raw_transcript'
  ) THEN
    ALTER TABLE ai_decision_logs ADD COLUMN raw_transcript text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_decision_logs' AND column_name = 'sanitized_transcript'
  ) THEN
    ALTER TABLE ai_decision_logs ADD COLUMN sanitized_transcript text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_decision_logs' AND column_name = 'confidence_score'
  ) THEN
    ALTER TABLE ai_decision_logs ADD COLUMN confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1);
  END IF;
END $$;
