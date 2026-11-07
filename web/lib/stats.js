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

  /* Theo dõi phiên và thời gian làm bài */
  const getAttempt = db.prepare('SELECT user_id, problem_id, started_at, ac_at, duration_ms FROM problem_attempts WHERE user_id = ? AND problem_id = ?');
  const insertAttempt = db.prepare('INSERT OR IGNORE INTO problem_attempts (user_id, problem_id, started_at) VALUES (?, ?, ?)');
  const updateAttemptStart = db.prepare('UPDATE problem_attempts SET started_at = ? WHERE user_id = ? AND problem_id = ? AND ac_at IS NULL');
  const getSubForAttempt = db.prepare('SELECT id, user_id, problem_id, verdict, contest_id, created_at FROM submissions WHERE id = ?');
  const getFirstSubForProb = db.prepare('SELECT MIN(created_at) AS first_at FROM submissions WHERE user_id = ? AND problem_id = ? AND contest_id IS NULL');
  const updateAttemptAc = db.prepare('UPDATE problem_attempts SET ac_at = ?, duration_ms = ? WHERE user_id = ? AND problem_id = ? AND ac_at IS NULL');
  const insertAttemptFull = db.prepare('INSERT OR IGNORE INTO problem_attempts (user_id, problem_id, started_at, ac_at, duration_ms) VALUES (?, ?, ?, ?, ?)');
  const hasAcSub = db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND problem_id = ? AND verdict = 'AC' AND contest_id IS NULL");
  const earliestAcSub = db.prepare("SELECT MIN(created_at) AS first_at FROM submissions WHERE user_id = ? AND problem_id = ? AND verdict = 'AC' AND contest_id IS NULL");
  const clearAttemptAc = db.prepare('UPDATE problem_attempts SET ac_at = NULL, duration_ms = NULL WHERE user_id = ? AND problem_id = ?');
  const syncAttemptAc = db.prepare('UPDATE problem_attempts SET ac_at = ?, duration_ms = ? WHERE user_id = ? AND problem_id = ?');

  function recordProblemView(userId, problemId) {
    if (!userId || !problemId) return;
    try {
      const existing = getAttempt.get(userId, problemId);
      const now = Date.now();
      if (!existing) {
        insertAttempt.run(userId, problemId, now);
      } else if (!existing.ac_at) {
        /* Nếu chưa AC và đã quá 4 tiếng kể từ lần mở trước, làm mới mốc started_at */
        if (now - existing.started_at > 4 * 3600_000) {
          updateAttemptStart.run(now, userId, problemId);
        }
      }
    } catch (e) {
      console.error('recordProblemView error:', e);
    }
  }

  function recordAcAttempt(subId) {
    if (!subId) return;
    try {
      const sub = getSubForAttempt.get(subId);
      if (!sub || sub.contest_id) return;
      const { user_id, problem_id, created_at, verdict } = sub;

      if (verdict === 'AC') {
        const existing = getAttempt.get(user_id, problem_id);
        const acTime = created_at || Date.now();

        if (existing) {
          if (!existing.ac_at) {
            let dur = acTime - existing.started_at;
            if (dur < 10_000) dur = 60_000;
            else if (dur > 2 * 3600_000) dur = 30 * 60_000;
            updateAttemptAc.run(acTime, dur, user_id, problem_id);
          }
        } else {
          const firstRow = getFirstSubForProb.get(user_id, problem_id);
          const firstAt = firstRow?.first_at || acTime;
          let dur = acTime - firstAt;
          if (dur < 30_000) dur = 60_000;
          else if (dur > 2 * 3600_000) dur = 30 * 60_000;
          const started = acTime - dur;
          insertAttemptFull.run(user_id, problem_id, started, acTime, dur);
        }
      } else {
        /* Xử lý trường hợp Rejudge: bài từ AC đổi thành WA/CE/TLE */
        const otherAc = hasAcSub.get(user_id, problem_id);
        if (!otherAc || otherAc.n === 0) {
          clearAttemptAc.run(user_id, problem_id);
        } else {
          const earliest = earliestAcSub.get(user_id, problem_id);
          if (earliest?.first_at) {
            const existing = getAttempt.get(user_id, problem_id);
            if (existing) {
              let dur = earliest.first_at - existing.started_at;
              if (dur < 10_000) dur = 60_000;
              else if (dur > 2 * 3600_000) dur = 30 * 60_000;
              syncAttemptAc.run(earliest.first_at, dur, user_id, problem_id);
            }
          }
        }
      }
    } catch (e) {
      console.error('recordAcAttempt error:', e);
    }
  }

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
        MIN(CASE WHEN s.verdict = 'AC' THEN s.created_at ELSE NULL END) AS first_ac_at,
        MAX(CASE WHEN COALESCE(s.score, CASE WHEN s.verdict = 'AC' THEN 100 ELSE 0 END) > 0 THEN s.created_at ELSE 0 END) AS last_score_at,
        MAX(CASE WHEN s.verdict = 'AC' THEN s.created_at ELSE 0 END) AS last_ac_at
      FROM submissions s
      WHERE s.contest_id IS NULL
        AND ${JUDGED}
        AND s.problem_id IN (${placeholders})
      GROUP BY s.user_id, s.problem_id
    `;

    const perProb = db.prepare(sql).all(...pids);
    const userMap = new Map();
    const userProbMap = new Map();
    for (const r of perProb) {
      if (!userProbMap.has(r.user_id)) userProbMap.set(r.user_id, new Map());
      userProbMap.get(r.user_id).set(r.problem_id, r);

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

    /* Lấy thời gian làm bài của từng bài tập từ problem_attempts */
    const attemptRows = db.prepare(`
      SELECT user_id, problem_id, duration_ms, started_at, ac_at
      FROM problem_attempts
      WHERE user_id IN (${uPlaceholders}) AND problem_id IN (${placeholders})
    `).all(...userIds, ...pids);

    const attemptMap = new Map();
    for (const a of attemptRows) {
      if (!attemptMap.has(a.user_id)) attemptMap.set(a.user_id, new Map());
      attemptMap.get(a.user_id).set(a.problem_id, a);
    }

    const rows = userIds.map((uid) => {
      const stat = userMap.get(uid);
      const info = infoMap.get(uid) || {};
      const probMap = userProbMap.get(uid) || new Map();
      const userAttempts = attemptMap.get(uid) || new Map();

      /* Thời gian làm bài = Tổng thời gian làm từng bài (tính từ khi bấm xem đề đến khi nộp bài đạt AC) */
      let workDurationMs = 0;
      for (const pid of pids) {
        const pSub = probMap.get(pid);
        if (!pSub || (!pSub.is_ac && (pSub.best_score || 0) === 0)) continue;
        const att = userAttempts.get(pid);
        if (att && att.ac_at && att.duration_ms > 0 && pSub.is_ac) {
          workDurationMs += att.duration_ms;
        } else if (pSub.is_ac && pSub.first_ac_at) {
          let dur = pSub.first_ac_at - pSub.first_sub_at;
          if (dur < 30_000) dur = 60_000;
          else if (dur > 2 * 3600_000) dur = 30 * 60_000;
          workDurationMs += dur;
        } else if ((pSub.best_score || 0) > 0) {
          let dur = pSub.last_score_at - pSub.first_sub_at;
          if (dur < 30_000) dur = 60_000;
          else if (dur > 2 * 3600_000) dur = 30 * 60_000;
          workDurationMs += dur;
        }
      }

      const finishAt = stat.lastScoreAt || stat.lastAcAt || 0;
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
      id: myRow.id,
      username: myRow.username,
      fullName: myRow.fullName,
      avatar: myRow.avatar,
      rank: myRow.rank,
      score: myRow.score,
      maxScore: myRow.maxScore,
      solved: myRow.solved,
      total: myRow.total,
      durationMs: myRow.durationMs,
      submissions: myRow.submissions,
      pct: myRow.total ? Math.round((myRow.solved / myRow.total) * 100) : 0,
    } : null;

    return { rows, myRank };
  }

  return { myProblemStatus, classStats, streak, setLeaderboard, recordProblemView, recordAcAttempt };
}
