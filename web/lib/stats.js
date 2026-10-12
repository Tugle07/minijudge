const DAY_MS = 24 * 60 * 60 * 1000;
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; /* giờ Việt Nam (UTC+7) để tính "ngày" */
const JUDGED = "verdict NOT IN ('PENDING', 'IE')";

const dayIndex = (ms) => Math.floor((ms + TZ_OFFSET_MS) / DAY_MS);

/* Thống kê cho giao diện: tiến độ của tôi, tỉ lệ AC cả lớp, bảng xếp hạng.
 * Lớp vài chục người nên tính trực tiếp mỗi request là đủ nhanh. */
export function createStats(db, catalog) {
  const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users');
  const myStatus = db.prepare(
    `SELECT problem_id, MAX(verdict = 'AC') AS ac FROM submissions WHERE user_id = ? AND ${JUDGED} GROUP BY problem_id`,
  );
  const problemSolvers = db.prepare(
    "SELECT problem_id, COUNT(DISTINCT user_id) AS solved FROM submissions WHERE verdict = 'AC' GROUP BY problem_id",
  );
  const firstAcs = db.prepare(
    `SELECT u.username, s.problem_id, MIN(s.created_at) AS at
     FROM submissions s JOIN users u ON u.id = s.user_id
     WHERE s.verdict = 'AC' GROUP BY s.user_id, s.problem_id`,
  );
  const allUsers = db.prepare('SELECT username FROM users ORDER BY id');
  const myDays = db.prepare(`SELECT created_at FROM submissions WHERE user_id = ? AND ${JUDGED}`);

  function myProblemStatus(userId) {
    const map = new Map();
    for (const r of myStatus.all(userId)) map.set(r.problem_id, r.ac ? 'ac' : 'tried');
    return map;
  }

  function classStats() {
    const classSize = countUsers.get().n;
    const solved = new Map(problemSolvers.all().map((r) => [r.problem_id, r.solved]));
    return { classSize, solved };
  }

  function leaderboard() {
    const rows = new Map(
      allUsers.all().map(({ username }) => [username, { username, total: 0, perSet: {}, lastAcAt: 0, setLastAcAt: {} }]),
    );
    for (const { username, problem_id, at } of firstAcs.all()) {
      const row = rows.get(username);
      const setId = catalog.problemMap.get(problem_id)?.setId;
      if (!row || !setId) continue;
      row.total += 1;
      row.lastAcAt = Math.max(row.lastAcAt, at);
      row.perSet[setId] = (row.perSet[setId] || 0) + 1;
      row.setLastAcAt[setId] = Math.max(row.setLastAcAt[setId] || 0, at);
    }
    return [...rows.values()];
  }

  function streak(userId) {
    const days = new Set(myDays.all(userId).map((r) => dayIndex(r.created_at)));
    let day = dayIndex(Date.now());
    if (!days.has(day)) day -= 1;
    let n = 0;
    while (days.has(day)) {
      n += 1;
      day -= 1;
    }
    return n;
  }

  /* Xếp hạng: nhiều bài AC hơn xếp trên; bằng nhau thì ai đạt điểm đó sớm hơn xếp trên. */
  function rankOf(rows, username, setId) {
    const score = (r) => (setId ? r.perSet[setId] || 0 : r.total);
    const last = (r) => (setId ? r.setLastAcAt[setId] || 0 : r.lastAcAt) || Infinity;
    const sorted = [...rows].sort((a, b) => score(b) - score(a) || last(a) - last(b) || a.username.localeCompare(b.username));
    return { sorted, rank: sorted.findIndex((r) => r.username === username) + 1 };
  }

  return { myProblemStatus, classStats, leaderboard, streak, rankOf };
}
