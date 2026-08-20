-- Polls and Voting Tables
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT,
  options TEXT NOT NULL, -- JSON array of [{ id, text, imageUrl }]
  category TEXT DEFAULT 'football', -- 'football', 'sports', 'entertainment', 'general'
  status TEXT DEFAULT 'active', -- 'active', 'closed'
  featured INTEGER DEFAULT 1,
  total_votes INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(poll_id, participant_id),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_participant_id ON poll_votes(participant_id);
