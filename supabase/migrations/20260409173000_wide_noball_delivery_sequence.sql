/*
  # Enable wide/no-ball outcomes and repeated deliveries within an over

  1) Add `delivery_index` to `clips` so one legal ball can have multiple deliveries
     (e.g. multiple wides/no-balls before the legal delivery lands).
  2) Replace uniqueness from (match, innings, over, ball_number) to
     (match, innings, over, delivery_index).
  3) Extend outcome check to include `wide` and `noball`.
*/

-- 1) Add delivery_index and backfill from current ball_number.
ALTER TABLE clips
  ADD COLUMN IF NOT EXISTS delivery_index integer;

UPDATE clips
SET delivery_index = ball_number
WHERE delivery_index IS NULL;

ALTER TABLE clips
  ALTER COLUMN delivery_index SET NOT NULL;

ALTER TABLE clips
  ALTER COLUMN delivery_index SET DEFAULT 1;

-- 2) Unique key now tracks actual sequence of deliveries in an over.
ALTER TABLE clips
  DROP CONSTRAINT IF EXISTS clips_match_innings_over_ball_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clips_match_innings_over_delivery_unique'
  ) THEN
    ALTER TABLE clips
      ADD CONSTRAINT clips_match_innings_over_delivery_unique
      UNIQUE (match_id, innings_number, over_number, delivery_index);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clips_match_innings_over_delivery
  ON clips (match_id, innings_number, over_number, delivery_index);

-- 3) Allow wide/no-ball outcomes.
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_outcome_check;
ALTER TABLE clips ADD CONSTRAINT clips_outcome_check
  CHECK (outcome IN ('dot', '1', '2', '3', '4', '6', 'wicket', 'other', 'wide', 'noball'));
