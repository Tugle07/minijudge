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

  function setLeaderboard(pids, currentUserId) {
    if (!pids || !pids.length) return { rows: [], myRank: null };

    const probMaxPoints = (pid) => {
      const p = catalog?.problemMap?.get(pid);
      if (!p) return 100;
      if (Array.isArray(p.subtasks) && p.subtasks.length) {
        return p.subtasks.reduce((sum, st) => sum + (Number(st.points) || 0), 0) || 100;
      }
      return 100;
    };
    const maxSetScore = pids.reduce((sum, pid) => sum + probMaxPoints(pid), 0);

    const placeholders = pids.map(() => '?').join(',');
    const sql = `
      SELECT
        s.user_id,
        s.problem_id,
        MAX(COALESCE(s.score, CASE WHEN s.verdict = 'AC' THEN 100 ELSE 0 END)) AS best_score,
        MAX(CASE WHEN s.verdict = 'AC' THEN 1 ELSE 0 END) AS is_ac,
        COUNT(*) AS tries,
        MIN(s.created_at) AS first_sub_at,
        MAX(CASE WHEN COALESCE(s.score, CASE WHEN s.verdict = 'AC' THEN 100 ELSE 0 END) > 0 THEN s.created_at ELSE 0 END) AS last_score_at,
        MAX(CASE WHEN s.verdict = 'AC' THEN s.created_at ELSE 0 END) AS last_ac_at
      FROM submissions s
      WHERE s.contest_id IS NULL
        AND s.verdict != 'PENDING'
        AND s.problem_id IN (${placeholders})
      GROUP BY s.user_id, s.problem_id
    `;

    const perProb = db.prepare(sql).all(...pids);
    const userMap = new Map();
    for (const r of perProb) {
      const u = userMap.get(r.user_id) || {
        userId: r.user_id,
        totalScore: 0,
        solved: 0,
        tries: 0,
        firstSubAt: r.first_sub_at || 0,
        lastScoreAt: 0,
        lastAcAt: 0,
      };
      u.totalScore += r.best_score || 0;
      if (r.is_ac) u.solved += 1;
      u.tries += r.tries || 0;
      if (!u.firstSubAt || (r.first_sub_at && r.first_sub_at < u.firstSubAt)) u.firstSubAt = r.first_sub_at;
      if (r.last_score_at > u.lastScoreAt) u.lastScoreAt = r.last_score_at;
      if (r.last_ac_at > u.lastAcAt) u.lastAcAt = r.last_ac_at;
      userMap.set(r.user_id, u);
    }

    const userIds = [...userMap.keys()];
    if (!userIds.length) return { rows: [], myRank: null };

    const uPlaceholders = userIds.map(() => '?').join(',');
    const userRows = db.prepare(`SELECT id, username, full_name, avatar, role FROM users WHERE id IN (${uPlaceholders})`).all(...userIds);
    const infoMap = new Map(userRows.map((u) => [u.id, u]));

    const rows = userIds.map((uid) => {
      const stat = userMap.get(uid);
      const info = infoMap.get(uid) || {};
      const finishAt = stat.lastScoreAt || stat.lastAcAt || 0;
      let workDurationMs = 0;
      if (finishAt && stat.firstSubAt && finishAt >= stat.firstSubAt) {
        workDurationMs = Math.max(1000, finishAt - stat.firstSubAt);
      }
      return {
        id: uid,
        username: info.username || '',
        fullName: info.full_name || '',
        avatar: info.avatar || '',
        role: info.role || 'student',
        score: stat.totalScore,
        maxScore: maxSetScore,
        solved: stat.solved,
        total: pids.length,
        pct: pids.length ? Math.round((stat.solved / pids.length) * 100) : 0,
        submissions: stat.tries,
        workDurationMs,
        finishAt,
        lastScoreAt: finishAt,
        lastAcAt: stat.lastAcAt,
        isMe: uid === currentUserId,
      };
    });

    /* Quy tắc xếp hạng:
     * 1. Điểm số: cao hơn xếp trên
     * 2. Số bài giải được (AC): nhiều hơn xếp trên
     * 3. Thời gian làm bài: ngắn hơn xếp trên
     * 4. Thời điểm hoàn thành: sớm hơn xếp trên
     * 5. Số lần nộp: ít hơn xếp trên
     * 6. Thứ tự bảng chữ cái
     */
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.solved !== a.solved) return b.solved - a.solved;
      if (a.score > 0 && b.score > 0) {
        const aDur = a.workDurationMs || Infinity;
        const bDur = b.workDurationMs || Infinity;
        if (aDur !== bDur) return aDur - bDur;
      }
      const aFin = a.finishAt || Infinity;
      const bFin = b.finishAt || Infinity;
      if (aFin !== bFin) return aFin - bFin;
      if (a.submissions !== b.submissions) return a.submissions - b.submissions;
      return (a.fullName || a.username).localeCompare(b.fullName || b.username);
    });

    let rank = 0;
    rows.forEach((r, i) => {
      if (
        i === 0 ||
        r.score !== rows[i - 1].score ||
        r.solved !== rows[i - 1].solved ||
        r.workDurationMs !== rows[i - 1].workDurationMs ||
        r.finishAt !== rows[i - 1].finishAt ||
        r.submissions !== rows[i - 1].submissions
      ) {
        rank = i + 1;
      }
      r.rank = rank;
    });

    const myRow = rows.find((r) => r.isMe);
    const myRank = myRow ? {
      rank: myRow.rank,
      score: myRow.score,
      maxScore: myRow.maxScore,
      solved: myRow.solved,
      total: myRow.total,
    } : null;

    return { rows, myRank };
  }

  return { myProblemStatus, classStats, streak, setLeaderboard };
}
