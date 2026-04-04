/*
  # Create Access Roles Table (Fixed)
  
  1. New Tables
    - `access_roles`
      - `id` (uuid, primary key)
      - `match_id` (text, foreign key) - reference to matches.match_id
      - `role` (text) - admin/umpire/scorer/captain
      - `passcode_hash` (text) - hashed passcode
      - `created_at` (timestamptz) - creation timestamp
      
  2. Security
    - Enable RLS on `access_roles` table
    - Add policy for reading (public can check access)
    - Add policy for inserting (match creation)
    
  3. Indexes
    - Index on match_id for fast lookups
    - Index on role for filtering
*/

CREATE TABLE IF NOT EXISTS access_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'umpire', 'scorer', 'captain')),
  passcode_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_roles_match_id ON access_roles(match_id);
CREATE INDEX IF NOT EXISTS idx_access_roles_role ON access_roles(role);

ALTER TABLE access_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read access roles for verification"
  ON access_roles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert access roles during match creation"
  ON access_roles FOR INSERT
  TO public
  WITH CHECK (true);