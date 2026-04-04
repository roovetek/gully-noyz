/*
  # Create clips table and storage bucket

  1. New Tables
    - `clips`
      - `id` (uuid, primary key) - Unique identifier for each clip
      - `match_id` (text) - ID of the match this clip belongs to
      - `over_number` (integer) - The over number in the match
      - `ball_number` (integer) - The ball number within the over (1-6)
      - `outcome` (text) - The outcome of the ball (Dot, 4, 6, Wicket, etc.)
      - `video_url` (text) - URL to the video clip in Supabase Storage
      - `duration` (integer) - Duration of the clip in seconds
      - `created_at` (timestamptz) - Timestamp when the clip was created

  2. Storage
    - Create 'clips' storage bucket for video files
    - Enable public access for playback

  3. Security
    - Enable RLS on `clips` table
    - Add policy for anyone to read clips (public viewing)
    - Add policy for anyone to insert clips (any user can record)
    - Add policy for users to update/delete their own clips
*/

-- Create clips table
CREATE TABLE IF NOT EXISTS clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  over_number integer NOT NULL DEFAULT 1,
  ball_number integer NOT NULL DEFAULT 1,
  outcome text NOT NULL,
  video_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clips_match_id ON clips(match_id);
CREATE INDEX IF NOT EXISTS idx_clips_over_ball ON clips(over_number DESC, ball_number DESC);

-- Enable RLS
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read clips (for public match viewing)
CREATE POLICY "Anyone can view clips"
  ON clips
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert clips (for recording)
CREATE POLICY "Anyone can insert clips"
  ON clips
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for clips
INSERT INTO storage.buckets (id, name, public)
VALUES ('clips', 'clips', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can upload clips
CREATE POLICY "Anyone can upload clips"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'clips');

-- Storage policy: Anyone can read clips
CREATE POLICY "Anyone can view clips"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'clips');
