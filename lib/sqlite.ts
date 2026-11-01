import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let connection: DatabaseSync | undefined;
export function getDatabase() {
  if (connection) return connection;
  const filename = resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
      "./data/teamflow.sqlite",
  );
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user TEXT NOT NULL,
      expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user);
    CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires);
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      department INTEGER NOT NULL,
      assignee TEXT NOT NULL,
      creator TEXT NOT NULL,
      deadline TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
      priority TEXT NOT NULL,
      parent TEXT REFERENCES tasks(id),
      note TEXT NOT NULL DEFAULT '',
      updated TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_department ON tasks(department);
    CREATE INDEX IF NOT EXISTS tasks_parent ON tasks(parent);
    CREATE TABLE IF NOT EXISTS login_attempts (
      username TEXT PRIMARY KEY NOT NULL,
      failures INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );
    PRAGMA user_version = 1;
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, recipient TEXT NOT NULL, task_id TEXT NOT NULL,
      message TEXT NOT NULL, created TEXT NOT NULL, read_at TEXT
    );
    CREATE INDEX IF NOT EXISTS notifications_recipient ON notifications(recipient, created);
  `);
  // Keep legacy percentage data separate from optional completed quantities.
  const columns = db.prepare("PRAGMA table_info(tasks)").all();
  if (!columns.some((column) => column.name === "completed_quantity")) {
    db.exec("ALTER TABLE tasks ADD COLUMN completed_quantity INTEGER CHECK(completed_quantity IS NULL OR completed_quantity >= 0)");
  }
  connection = db;
  return db;
}
