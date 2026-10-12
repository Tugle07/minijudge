import { DatabaseSync } from 'node:sqlite';

export function openDatabase(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pass_hash  TEXT NOT NULL,
      salt       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      problem_id   TEXT NOT NULL,
      source       TEXT NOT NULL,
      verdict      TEXT NOT NULL DEFAULT 'PENDING',
      time_ms      INTEGER,
      memory_kb    INTEGER,
      tests_passed INTEGER,
      test_count   INTEGER,
      tests_json   TEXT,
      compile_log  TEXT,
      created_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_verdict ON submissions(verdict);
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    /* Khối bài: lưu nguyên object JSON, position để sắp thứ tự trên trang chủ. */
    CREATE TABLE IF NOT EXISTS problem_sets (
      id       TEXT PRIMARY KEY,
      data     TEXT NOT NULL,
      position INTEGER NOT NULL
    );

    /* Thông tin quản trị của từng bài (cả bài trong repo lẫn bài tạo trên web). */
    CREATE TABLE IF NOT EXISTS problem_meta (
      id         TEXT PRIMARY KEY,
      status     TEXT NOT NULL DEFAULT 'pub',
      tags       TEXT NOT NULL DEFAULT '',
      solution   TEXT NOT NULL DEFAULT '',
      updated_at INTEGER
    );
  `);
  migrate(db);
  return db;
}

const columnsOf = (db, table) => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));

/* Thêm cột mới cho database đã tạo từ phiên bản trước (SQLite không có ADD COLUMN IF NOT EXISTS). */
function migrate(db) {
  const subs = columnsOf(db, 'submissions');
  if (!subs.has('fail_output')) db.exec('ALTER TABLE submissions ADD COLUMN fail_output TEXT');
  const users = columnsOf(db, 'users');
  if (!users.has('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
  if (!users.has('locked')) db.exec('ALTER TABLE users ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
  if (!users.has('last_seen')) db.exec('ALTER TABLE users ADD COLUMN last_seen INTEGER');
}
