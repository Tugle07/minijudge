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
      lang         TEXT NOT NULL DEFAULT 'c',
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

    /* Cuộc thi: settings là JSON (mã phòng, dải IP, danh sách thí sinh, công bố kết quả…). */
    CREATE TABLE IF NOT EXISTS contests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      start_at    INTEGER NOT NULL,
      end_at      INTEGER NOT NULL,
      status      TEXT NOT NULL DEFAULT 'draft',
      settings    TEXT NOT NULL DEFAULT '{}',
      created_at  INTEGER NOT NULL
    );

    /* Bài trong cuộc thi; subtasks là JSON [{name, tests: "1-5,8", points}]. */
    CREATE TABLE IF NOT EXISTS contest_problems (
      contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
      problem_id TEXT NOT NULL,
      label      TEXT NOT NULL,
      position   INTEGER NOT NULL,
      subtasks   TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (contest_id, problem_id)
    );

    /* Thí sinh đã vào phòng; session_hash gắn bài thi với đúng một phiên đăng nhập (một thiết bị/tab). */
    CREATE TABLE IF NOT EXISTS contest_participants (
      contest_id   INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at    INTEGER NOT NULL,
      finished_at  INTEGER,
      session_hash TEXT,
      ip           TEXT,
      last_seen    INTEGER,
      state        TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (contest_id, user_id)
    );

    /* Nhật ký giám sát: thoát toàn màn hình, chuyển tab, dán code từ ngoài… */
    CREATE TABLE IF NOT EXISTS contest_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      detail     TEXT NOT NULL DEFAULT '',
      at         INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_contest_events ON contest_events(contest_id, user_id);

    /* Theo dõi thời gian làm bài: tính từ khi bấm vào đề đến khi nộp AC */
    CREATE TABLE IF NOT EXISTS problem_attempts (
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id   TEXT NOT NULL,
      started_at   INTEGER NOT NULL,
      ac_at        INTEGER,
      duration_ms  INTEGER,
      PRIMARY KEY (user_id, problem_id)
    );
    CREATE INDEX IF NOT EXISTS idx_problem_attempts_user ON problem_attempts(user_id);
  `);
  migrate(db);
  return db;
}

const columnsOf = (db, table) => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));

/* Thêm cột mới cho database đã tạo từ phiên bản trước (SQLite không có ADD COLUMN IF NOT EXISTS). */
function migrate(db) {
  const subs = columnsOf(db, 'submissions');
  if (!subs.has('fail_output')) db.exec('ALTER TABLE submissions ADD COLUMN fail_output TEXT');
  if (!subs.has('contest_id')) db.exec('ALTER TABLE submissions ADD COLUMN contest_id INTEGER');
  if (!subs.has('score')) db.exec('ALTER TABLE submissions ADD COLUMN score REAL');
  if (!subs.has('subtasks_json')) db.exec('ALTER TABLE submissions ADD COLUMN subtasks_json TEXT');
  if (!subs.has('lang')) db.exec("ALTER TABLE submissions ADD COLUMN lang TEXT NOT NULL DEFAULT 'c'");
  db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_contest ON submissions(contest_id, user_id)');
  const users = columnsOf(db, 'users');
  if (!users.has('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
  if (!users.has('locked')) db.exec('ALTER TABLE users ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
  if (!users.has('last_seen')) db.exec('ALTER TABLE users ADD COLUMN last_seen INTEGER');
  if (!users.has('full_name')) db.exec("ALTER TABLE users ADD COLUMN full_name TEXT NOT NULL DEFAULT ''");
  if (!users.has('avatar')) db.exec("ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT ''");
  const meta = columnsOf(db, 'problem_meta');
  if (meta.size && !meta.has('subtasks')) db.exec('ALTER TABLE problem_meta ADD COLUMN subtasks TEXT');
  const parts = columnsOf(db, 'contest_participants');
  if (parts.size && !parts.has('device')) db.exec("ALTER TABLE contest_participants ADD COLUMN device TEXT NOT NULL DEFAULT ''");

  db.exec(`
    CREATE TABLE IF NOT EXISTS problem_attempts (
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id   TEXT NOT NULL,
      started_at   INTEGER NOT NULL,
      ac_at        INTEGER,
      duration_ms  INTEGER,
      PRIMARY KEY (user_id, problem_id)
    );
    CREATE INDEX IF NOT EXISTS idx_problem_attempts_user ON problem_attempts(user_id);
  `);

  /* Tự động chuyển đổi dữ liệu lịch sử nếu bảng problem_attempts chưa có */
  const attemptCount = db.prepare('SELECT COUNT(*) AS n FROM problem_attempts').get().n;
  if (attemptCount === 0) {
    const acs = db.prepare(`
      SELECT user_id, problem_id, MIN(created_at) AS first_at,
             MIN(CASE WHEN verdict = 'AC' THEN created_at ELSE NULL END) AS ac_at
      FROM submissions
      WHERE contest_id IS NULL AND verdict != 'PENDING'
      GROUP BY user_id, problem_id
      HAVING ac_at IS NOT NULL
    `).all();
    const insertAttempt = db.prepare(`
      INSERT OR IGNORE INTO problem_attempts (user_id, problem_id, started_at, ac_at, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const r of acs) {
      let dur = r.ac_at - r.first_at;
      if (dur < 30_000) dur = 60_000;
      else if (dur > 2 * 3600_000) dur = 30 * 60_000;
      const started = r.ac_at - dur;
      insertAttempt.run(r.user_id, r.problem_id, started, r.ac_at, dur);
    }
  }
}
