PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  innings_number INTEGER NOT NULL DEFAULT 1,
  over_number INTEGER NOT NULL DEFAULT 1,
  legal_balls_in_over INTEGER NOT NULL DEFAULT 0,
  runs INTEGER NOT NULL DEFAULT 0,
  wickets INTEGER NOT NULL DEFAULT 0,
  striker_id TEXT,
  non_striker_id TEXT,
  pending_sync INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  team_name TEXT,
  batting_order INTEGER,
  bowling_order INTEGER,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  innings_number INTEGER NOT NULL,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  delivery_index INTEGER NOT NULL,
  striker_id TEXT,
  non_striker_id TEXT,
  bowler_id TEXT,
  outcome_label TEXT NOT NULL,
  runs_batter INTEGER NOT NULL DEFAULT 0,
  runs_extras INTEGER NOT NULL DEFAULT 0,
  extra_type TEXT NOT NULL DEFAULT 'none',
  wicket_type TEXT,
  wicket_counts INTEGER NOT NULL DEFAULT 0,
  is_legal_delivery INTEGER NOT NULL DEFAULT 1,
  hit_timestamp_ms INTEGER,
  video_clip_id TEXT,
  voice_intent_confidence REAL,
  is_highlight INTEGER NOT NULL DEFAULT 0,
  transcript TEXT,
  pending_sync INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_match_over_delivery
  ON deliveries(match_id, innings_number, over_number, delivery_index);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TEXT NOT NULL,
  last_attempt_at TEXT,
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status_queued_at
  ON sync_queue(status, queued_at);

