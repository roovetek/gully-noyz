-- Allow video_url to be NULL so ball outcomes can be logged without a recording
ALTER TABLE clips ALTER COLUMN video_url DROP NOT NULL;
