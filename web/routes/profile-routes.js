import { Router } from 'express';

import { hashPassword, verifyPassword } from '../lib/auth.js';

const DAY = 86_400_000;
const TZ = 7 * 3600_000;
const HEATMAP_DAYS = 182; /* 26 tuần */
const LIST_LIMIT = 8;
const dayIndex = (ms) => Math.floor((ms + TZ) / DAY);

export function profileRoutes({ db, catalog, stats, contests, auth, authLimit }) {
  const r = Router();
  r.use(auth.requireUser);

  function buildProfileData(user, viewer) {
    const uid = user.id;
    const isSelf = viewer.id === uid;
    const isAdmin = viewer.role === 'admin';
    const mine = stats.myProblemStatus(uid);
    const subs = db
      .prepare("SELECT verdict, created_at FROM submissions WHERE user_id = ? AND verdict NOT IN ('PENDING', 'IE')")
      .all(uid);

    const today = dayIndex(Date.now());
    const activity = Array(HEATMAP_DAYS).fill(0);
    for (const s of subs) {
      const k = HEATMAP_DAYS - 1 - (today - dayIndex(s.created_at));
      if (k >= 0) activity[k] += 1;
    }
    const verdicts = {};
    for (const s of subs) verdicts[s.verdict] = (verdicts[s.verdict] || 0) + 1;

    /* Số liệu hoạt động: số ngày có nộp, chuỗi dài nhất, ngày nộp nhiều nhất (tính trên toàn bộ lịch sử). */
    const perDay = new Map();
    for (const s of subs) perDay.set(dayIndex(s.created_at), (perDay.get(dayIndex(s.created_at)) || 0) + 1);
    const days = [...perDay.keys()].sort((a, b) => a - b);
    let longest = 0;
    let run = 0;
    days.forEach((d, i) => {
      run = i && d === days[i - 1] + 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
    });
    let bestDay = null;
    for (const [d, n] of perDay) if (!bestDay || n > bestDay.count) bestDay = { at: d * DAY - TZ, count: n };

    /* Chỉ hiện bài sinh viên còn mở được (đã xuất bản, không nằm trong cuộc thi chưa kết thúc). */
    const locked = contests.lockedProblemIds();
    const open = (pid) => {
      const p = catalog.problemMap.get(pid);
      return p && (viewer.role === 'admin' || (catalog.isProblemVisible(p) && !locked.has(pid)));
    };
    const titleOf = (pid) => catalog.problemMap.get(pid)?.title || pid;
    const practice = db
      .prepare(
        `SELECT id, problem_id, verdict, tests_passed, test_count, COALESCE(lang, 'c') AS lang, created_at FROM submissions
         WHERE user_id = ? AND contest_id IS NULL AND verdict NOT IN ('PENDING', 'IE') ORDER BY created_at DESC, id DESC`,
      )
      .all(uid)
      .filter((s) => open(s.problem_id));
    const brief = (s) => ({
      id: s.id,
      problemId: s.problem_id,
      title: titleOf(s.problem_id),
      verdict: s.verdict,
      lang: s.lang || 'c',
      testsPassed: s.tests_passed,
      testCount: s.test_count,
      createdAt: s.created_at,
    });
    const unsolved = [];
    const seen = new Set();
    for (const s of practice) {
      if (seen.has(s.problem_id)) continue;
      seen.add(s.problem_id);
      if (mine.get(s.problem_id) !== 'ac') unsolved.push({ ...brief(s), tries: practice.filter((x) => x.problem_id === s.problem_id).length });
    }

    const joined = db.prepare('SELECT contest_id, finished_at FROM contest_participants WHERE user_id = ? ORDER BY joined_at DESC').all(uid);
    const contestRows = joined
      .map((j) => {
        const c = contests.get(j.contest_id);
        if (!c || c.status !== 'published') return null;
        const board = contests.scoreboard(c.id);
        const row = board.rows.find((x) => x.userId === uid);
        const seeBoard = contests.canSeeBoard(c, viewer, { finished_at: j.finished_at });
        const phase = contests.phase(c);
        return {
          id: c.id,
          title: c.title,
          startAt: c.startAt,
          phase,
          finished: Boolean(j.finished_at) || phase === 'ended',
          score: (seeBoard || isSelf || isAdmin) ? (row?.total ?? 0) : 0,
          maxScore: board.problems.reduce((t, p) => t + p.points, 0),
          rank: seeBoard ? row?.rank ?? null : null,
          participants: board.rows.length,
          violations: (isSelf || isAdmin) ? contests.incidentsOf(c.id, uid) : 0,
        };
      })
      .filter(Boolean);

    const isPrivateHidden = !isSelf && !isAdmin;
    const unsolvedList = isPrivateHidden ? [] : unsolved.slice(0, LIST_LIMIT);
    const recentList = isPrivateHidden ? [] : practice.slice(0, LIST_LIMIT).map(brief);
    const practiceVerdictsMap = isPrivateHidden ? {} : practice.reduce((m, s) => ((m[s.verdict] = (m[s.verdict] || 0) + 1), m), {});

    return {
      username: user.username,
      fullName: user.full_name || '',
      role: user.role,
      avatar: user.avatar || '',
      createdAt: user.created_at,
      isSelf,
      isAdminViewer: isAdmin,
      isPrivateHidden,
      solved: [...mine.values()].filter((v) => v === 'ac').length,
      tried: mine.size,
      submissions: subs.length,
      acRate: subs.length ? Math.round(((verdicts.AC || 0) / subs.length) * 100) : 0,
      streak: stats.streak(uid),
      verdicts,
      activity,
      activityEnd: Date.now(),
      activeDays: perDay.size,
      longestStreak: longest,
      bestDay,
      unsolved: unsolvedList,
      unsolvedTotal: isPrivateHidden ? 0 : unsolved.length,
      recent: recentList,
      practiceVerdicts: practiceVerdictsMap,
      contests: contestRows,
      sets: catalog.visibleSets().map((s) => {
        const pids = catalog.visibleProblems(s);
        return { id: s.id, short: s.short, title: s.title, count: pids.length, ac: pids.filter((p) => mine.get(p) === 'ac').length };
      }),
    };
  }

  r.get('/me/profile', (req, res) => {
    const user = db.prepare('SELECT id, username, full_name, role, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json(buildProfileData(user, req.user));
  });

  r.get('/users/:username/profile', (req, res) => {
    const username = String(req.params.username || '').trim();
    const user = db.prepare('SELECT id, username, full_name, role, avatar, created_at FROM users WHERE username = ? COLLATE NOCASE').get(username);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json(buildProfileData(user, req.user));
  });

  /* Đổi ảnh đại diện (avatar) */
  r.put('/me/avatar', authLimit, (req, res) => {
    let { avatar } = req.body ?? {};
    if (avatar === null || avatar === undefined) avatar = '';
    if (typeof avatar !== 'string') return res.status(400).json({ error: 'Dữ liệu ảnh không hợp lệ' });
    avatar = avatar.trim();
    if (avatar !== '') {
      const isDataUrl = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(avatar);
      const isHttpUrl = /^https?:\/\/.+/.test(avatar);
      if (!isDataUrl && !isHttpUrl) {
        return res.status(400).json({ error: 'Định dạng ảnh không hợp lệ (hỗ trợ PNG, JPG, WebP, SVG)' });
      }
      if (avatar.length > 512 * 1024) {
        return res.status(400).json({ error: 'Ảnh quá lớn. Vui lòng chọn ảnh dưới 300KB' });
      }
    }
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id);
    req.user.avatar = avatar;
    res.json({ ok: true, avatar });
  });

  /* Đổi mật khẩu: kiểm tra mật khẩu cũ, đăng xuất mọi thiết bị khác, giữ phiên hiện tại. */
  r.post('/me/password', authLimit, (req, res) => {
    const { current, next } = req.body ?? {};
    const row = db.prepare('SELECT pass_hash, salt FROM users WHERE id = ?').get(req.user.id);
    if (typeof current !== 'string' || !verifyPassword(current, row.salt, row.pass_hash)) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng', fields: { current: 'Mật khẩu hiện tại không đúng' } });
    }
    if (typeof next !== 'string' || next.length < 6 || next.length > 128) {
      return res.status(400).json({ error: 'Mật khẩu mới cần từ 6 đến 128 ký tự', fields: { next: 'Mật khẩu mới cần từ 6 đến 128 ký tự' } });
    }
    if (next === current) return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu cũ', fields: { next: 'Mật khẩu mới phải khác mật khẩu cũ' } });
    const { hash, salt } = hashPassword(next);
    db.prepare('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?').run(hash, salt, req.user.id);
    auth.endAllSessions(req.user.id);
    auth.startSession(res, req.user.id);
    res.json({ ok: true });
  });

  return r;
}
