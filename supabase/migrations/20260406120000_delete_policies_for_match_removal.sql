/*
  # DELETE policies for admin match removal

  Clips, child match tables, and storage previously had no DELETE policy under RLS,
  so removing a match row would fail on CASCADE or leave orphan clip rows/storage files.

  Matches table has no RLS in this project; anon DELETE relies on table grants.
*/

DROP POLICY IF EXISTS "Anyone can delete clips" ON clips;
CREATE POLICY "Anyone can delete clips"
  ON clips FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete match results" ON match_results;
CREATE POLICY "Anyone can delete match results"
  ON match_results FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete rule overrides" ON match_rule_overrides;
CREATE POLICY "Anyone can delete rule overrides"
  ON match_rule_overrides FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete access roles" ON access_roles;
CREATE POLICY "Anyone can delete access roles"
  ON access_roles FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete audit logs" ON audit_logs;
CREATE POLICY "Anyone can delete audit logs"
  ON audit_logs FOR DELETE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can delete clips from storage" ON storage.objects;
CREATE POLICY "Anyone can delete clips from storage"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'clips');
