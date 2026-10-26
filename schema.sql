-- Run once: creates the tables the website backend needs.
CREATE TABLE IF NOT EXISTS content (
  key     TEXT PRIMARY KEY,
  value   TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS history (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER,
  value   TEXT NOT NULL,
  created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id      TEXT PRIMARY KEY,
  mime    TEXT NOT NULL,
  name    TEXT,
  size    INTEGER,
  data    TEXT NOT NULL,
  created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  kind    TEXT NOT NULL,
  payload TEXT NOT NULL,
  created TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate (
  key TEXT NOT NULL,
  ts  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_key ON rate(key, ts);

-- Recommendations written by visitors through the /recommend page.
CREATE TABLE IF NOT EXISTS recs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  position   TEXT,
  org        TEXT,
  relation   TEXT,
  type       TEXT,
  text       TEXT NOT NULL,
  show_email INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'pending',   -- published | hidden | pending
  reply      TEXT,
  created    TEXT NOT NULL,
  replied    TEXT
);
CREATE INDEX IF NOT EXISTS recs_status ON recs(status, id);
