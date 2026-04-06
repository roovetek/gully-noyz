/*
  # Add dismissal_type to clips and normalize wicket data

  - Introduce explicit dismissal_type for wicket deliveries
  - Backfill historical dismissal outcomes into dismissal_type
  - Normalize wicket outcomes to outcome='wicket'
  - Enforce outcome/dismissal_type consistency
*/

ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS dismissal_type text;

-- Move legacy dismissal literals into dedicated dismissal_type column.
UPDATE clips
SET
  dismissal_type = lower(outcome),
  outcome = 'wicket'
WHERE lower(outcome) IN (
  'bowled',
  'caught',
  'lbw',
  'runout',
  'stumped',
  'hitwicket',
  'hitballtwice',
  'obstructing',
  'timedout',
  'handledball'
);

-- Normalize pre-existing wicket rows that never captured dismissal type.
UPDATE clips
SET dismissal_type = 'unknown'
WHERE outcome = 'wicket' AND dismissal_type IS NULL;

-- If dismissal_type exists on non-wicket rows, normalize outcome to wicket.
UPDATE clips
SET outcome = 'wicket'
WHERE dismissal_type IS NOT NULL AND outcome <> 'wicket';

ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_outcome_check;
ALTER TABLE clips ADD CONSTRAINT clips_outcome_check
  CHECK (outcome IN ('dot', '1', '2', '3', '4', '6', 'wicket', 'other'));

ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_dismissal_type_check;
ALTER TABLE clips ADD CONSTRAINT clips_dismissal_type_check
  CHECK (
    dismissal_type IS NULL OR dismissal_type IN (
      'unknown',
      'bowled',
      'caught',
      'lbw',
      'runout',
      'stumped',
      'hitwicket',
      'hitballtwice',
      'obstructing',
      'timedout',
      'handledball'
    )
  );

ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_outcome_dismissal_consistency_check;
ALTER TABLE clips ADD CONSTRAINT clips_outcome_dismissal_consistency_check
  CHECK (
    (outcome = 'wicket' AND dismissal_type IS NOT NULL)
    OR (outcome <> 'wicket' AND dismissal_type IS NULL)
  );
