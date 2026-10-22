const DAY_MS = 24 * 60 * 60 * 1000;
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; /* giờ Việt Nam (UTC+7) để tính "ngày" */
const JUDGED = "verdict NOT IN ('PENDING', 'IE')";

const dayIndex = (ms) => Math.floor((ms + TZ_OFFSET_MS) / DAY_MS);

/* Thống kê cho giao diện: tiến độ của tôi, tỉ lệ AC cả lớp, chuỗi ngày nộp bài.
 * Lớp vài chục người nên tính trực tiếp mỗi request là đủ nhanh. */
export function createStats(db, catalog) {
  const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users');
  const myStatus = db.prepare(
    `SELECT problem_id, MAX(verdict = 'AC') AS ac FROM submissions WHERE user_id = ? AND contest_id IS NULL AND ${JUDGED} GROUP BY problem_id`,
  );
  const problemSolvers = db.prepare(
    "SELECT problem_id, COUNT(DISTINCT user_id) AS solved FROM submissions WHERE verdict = 'AC' AND contest_id IS NULL GROUP BY problem_id",
  );
  const myDays = db.prepare(`SELECT created_at FROM submissions WHERE user_id = ? AND contest_id IS NULL AND ${JUDGED}`);

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

  return { myProblemStatus, classStats, streak };
}
