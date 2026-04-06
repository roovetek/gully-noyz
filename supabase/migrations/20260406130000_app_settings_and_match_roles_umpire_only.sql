/*
  # App-wide admin password + match roles: umpire/scorer/captain only

  - app_settings: stores SHA-256 hash for dashboard (global) admin login
  - access_roles: remove duplicate "admin" match role; migrate data to umpire
  - match_results / match_rule_overrides: completed_by_role / applied_by_role umpire-only
*/

-- 1) Singleton settings row for global (dashboard) admin passcode hash
CREATE TABLE IF NOT EXISTS app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  global_admin_passcode_hash text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO app_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
CREATE POLICY "Anyone can read app settings"
  ON app_settings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert app settings" ON app_settings;
CREATE POLICY "Anyone can insert app settings"
  ON app_settings FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update app settings" ON app_settings;
CREATE POLICY "Anyone can update app settings"
  ON app_settings FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 2) access_roles: drop admin where umpire already exists; rename remaining admin -> umpire
DELETE FROM access_roles ar
WHERE ar.role = 'admin'
  AND EXISTS (
    SELECT 1 FROM access_roles u
    WHERE u.match_id = ar.match_id AND u.role = 'umpire'
  );

UPDATE access_roles SET role = 'umpire' WHERE role = 'admin';

ALTER TABLE access_roles DROP CONSTRAINT IF EXISTS access_roles_role_check;
ALTER TABLE access_roles ADD CONSTRAINT access_roles_role_check
  CHECK (role IN ('umpire', 'scorer', 'captain'));

-- 3) Historical rows: admin -> umpire in audit columns
UPDATE match_results SET completed_by_role = 'umpire' WHERE completed_by_role = 'admin';

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_completed_by_role_check;
ALTER TABLE match_results ADD CONSTRAINT match_results_completed_by_role_check
  CHECK (completed_by_role = 'umpire');

UPDATE match_rule_overrides SET applied_by_role = 'umpire' WHERE applied_by_role = 'admin';
UPDATE match_rule_overrides SET reverted_by_role = 'umpire' WHERE reverted_by_role = 'admin';

ALTER TABLE match_rule_overrides DROP CONSTRAINT IF EXISTS match_rule_overrides_applied_by_role_check;
ALTER TABLE match_rule_overrides ADD CONSTRAINT match_rule_overrides_applied_by_role_check
  CHECK (applied_by_role = 'umpire');

ALTER TABLE match_rule_overrides DROP CONSTRAINT IF EXISTS match_rule_overrides_reverted_by_role_check;
ALTER TABLE match_rule_overrides ADD CONSTRAINT match_rule_overrides_reverted_by_role_check
  CHECK (reverted_by_role IS NULL OR reverted_by_role = 'umpire');
