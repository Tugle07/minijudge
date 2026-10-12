import { Router } from 'express';

import { hashPassword, verifyPassword } from '../lib/auth.js';

const DAY = 86_400_000;
const TZ = 7 * 3600_000;
const HEATMAP_DAYS = 84; /* 12 tuần */
const dayIndex = (ms) => Math.floor((ms + TZ) / DAY);

export function profileRoutes({ db, catalog, stats, auth, authLimit }) {
  const r = Router();
  r.use(auth.requireUser);

  r.get('/me/profile', (req, res) => {
    const uid = req.user.id;
    const user = db.prepare('SELECT username, role, created_at FROM users WHERE id = ?').get(uid);
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
    const rows = stats.leaderboard();
    const { rank } = stats.rankOf(rows, req.user.username);

    res.json({
      username: user.username,
      role: user.role,
      createdAt: user.created_at,
      solved: [...mine.values()].filter((v) => v === 'ac').length,
      tried: mine.size,
      submissions: subs.length,
      acRate: subs.length ? Math.round(((verdicts.AC || 0) / subs.length) * 100) : 0,
      rank,
      classSize: rows.length,
      streak: stats.streak(uid),
      verdicts,
      activity,
      activityEnd: Date.now(),
      sets: catalog.visibleSets().map((s) => {
        const pids = catalog.visibleProblems(s);
        return { id: s.id, short: s.short, title: s.title, count: pids.length, ac: pids.filter((p) => mine.get(p) === 'ac').length };
      }),
    });
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
