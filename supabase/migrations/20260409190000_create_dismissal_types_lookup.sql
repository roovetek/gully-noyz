/*
  # Dismissal lookup table + clips FK integrity

  - Create `dismissal_types` as the canonical source for dismissal metadata.
  - Seed with existing dismissal keys in current UI/DB checks.
  - Keep public read access (app needs dropdown options).
  - Replace `clips_dismissal_type_check` with FK to `dismissal_types(code)`.
*/

CREATE TABLE IF NOT EXISTS dismissal_types (
  code text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO dismissal_types (code, label, sort_order, active)
VALUES
  ('bowled', 'Bowled', 10, true),
  ('caught', 'Caught', 20, true),
  ('lbw', 'Leg Before Wicket (LBW)', 30, true),
  ('runout', 'Run Out', 40, true),
  ('stumped', 'Stumped', 50, true),
  ('handledball', 'Handled the Ball', 60, true),
  ('hitballtwice', 'Hit the Ball Twice', 70, true),
  ('hitwicket', 'Hit Wicket', 80, true),
  ('obstructing', 'Obstructing the Field', 90, true),
  ('timedout', 'Timed Out', 100, true),
  ('unknown', 'Other', 999, true)
ON CONFLICT (code) DO UPDATE
SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

CREATE INDEX IF NOT EXISTS idx_dismissal_types_active_sort
  ON dismissal_types (active, sort_order, code);

ALTER TABLE dismissal_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read dismissal types" ON dismissal_types;
CREATE POLICY "Anyone can read dismissal types"
  ON dismissal_types
  FOR SELECT
  TO public
  USING (true);

ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_dismissal_type_check;

ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_dismissal_type_fk;
ALTER TABLE clips
  ADD CONSTRAINT clips_dismissal_type_fk
  FOREIGN KEY (dismissal_type)
  REFERENCES dismissal_types(code)
  ON UPDATE CASCADE
  ON DELETE RESTRICT;
