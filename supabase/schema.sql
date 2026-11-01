CREATE SCHEMA IF NOT EXISTS teamflow;
CREATE TABLE IF NOT EXISTS teamflow.accounts (id TEXT PRIMARY KEY, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS teamflow.sessions (id TEXT PRIMARY KEY, "user" TEXT NOT NULL, expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user ON teamflow.sessions("user");
CREATE INDEX IF NOT EXISTS sessions_expires ON teamflow.sessions(expires);
CREATE TABLE IF NOT EXISTS teamflow.tasks (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
 department INTEGER NOT NULL, assignee TEXT NOT NULL, creator TEXT NOT NULL,
 deadline TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
 priority TEXT NOT NULL, parent TEXT REFERENCES teamflow.tasks(id),
 note TEXT NOT NULL DEFAULT '', updated TEXT NOT NULL,
 completed_quantity BIGINT CHECK(completed_quantity BETWEEN 0 AND 9007199254740991)
);
CREATE INDEX IF NOT EXISTS tasks_department ON teamflow.tasks(department);
CREATE INDEX IF NOT EXISTS tasks_parent ON teamflow.tasks(parent);
CREATE TABLE IF NOT EXISTS teamflow.login_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL, reset_at BIGINT NOT NULL);
ALTER TABLE teamflow.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teamflow.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teamflow.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teamflow.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA teamflow FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA teamflow FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS teamflow.notifications (
 id TEXT PRIMARY KEY, recipient TEXT NOT NULL, task_id TEXT NOT NULL,
 message TEXT NOT NULL, created TEXT NOT NULL, read_at TEXT
);
CREATE INDEX IF NOT EXISTS notifications_recipient ON teamflow.notifications(recipient, created);
ALTER TABLE teamflow.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON teamflow.notifications FROM PUBLIC, anon, authenticated;

ALTER TABLE teamflow.tasks ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE teamflow.tasks ADD COLUMN IF NOT EXISTS deleted_by TEXT;
CREATE TABLE IF NOT EXISTS teamflow.access_events (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, path TEXT NOT NULL,
 device TEXT NOT NULL, visited_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS access_events_visited ON teamflow.access_events(visited_at);
ALTER TABLE teamflow.access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON teamflow.access_events FROM PUBLIC, anon, authenticated;
