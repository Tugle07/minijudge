import crypto from 'node:crypto';
import { Router } from 'express';

import { hashPassword } from '../lib/auth.js';
import { normalizeSet, SET_STATUSES } from '../lib/problems.js';

const PAGE = 20;
const SORTS = { id: 's.id', time: 's.time_ms', memory: 's.memory_kb' };
const DAY = 86_400_000;
const TZ = 7 * 3600_000;
const SET_ID_RE = /^[a-z0-9_-]{1,24}$/;

export function adminRoutes({ db, catalog, auth, queue, judge, settings, adminStats }) {
  const r = Router();
  r.use(auth.requireAdmin);

  /* ---------- Dashboard ---------- */
  r.get('/dashboard', async (req, res) => {
    const range = ['today', '7d', '30d'].includes(req.query.range) ? req.query.range : 'today';
    let health;
    try {
      health = await judge.health();
    } catch {
      health = { ok: false };
    }
    res.json({ ...adminStats.dashboard(range), judge: { ok: Boolean(health.ok), queue: queue.pending } });
  });

  /* ---------- Khối bài ---------- */
  const saveSets = (sets) => {
    db.exec('BEGIN');
    try {
      db.exec('DELETE FROM problem_sets');
      const ins = db.prepare('INSERT INTO problem_sets (id, data, position) VALUES (?, ?, ?)');
      sets.forEach((s, i) => ins.run(s.id, JSON.stringify(s), i));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    catalog.reload();
  };
  const rawSets = () => db.prepare('SELECT data FROM problem_sets ORDER BY position, id').all().map((x, i) => normalizeSet(JSON.parse(x.data), i));

  r.get('/sets', (_req, res) => {
    const completion = adminStats.setCompletion();
    const subs = db.prepare('SELECT problem_id, COUNT(*) AS n FROM submissions GROUP BY problem_id').all();
    const subMap = new Map(subs.map((s) => [s.problem_id, s.n]));
    res.json(
      rawSets().map((s) => ({
        ...s,
        completion: completion.get(s.id) ?? 0,
        submissions: s.problems.reduce((t, p) => t + (subMap.get(p) || 0), 0),
      })),
    );
  });

  r.put('/sets/:id', (req, res) => {
    const b = req.body ?? {};
    const isNew = req.params.id === 'new';
    const id = isNew ? String(b.id || `k${Date.now().toString(36)}`).toLowerCase() : req.params.id;
    if (!SET_ID_RE.test(id)) return res.status(400).json({ error: 'Mã khối không hợp lệ' });
    const errors = {};
    if (typeof b.title !== 'string' || !b.title.trim()) errors.title = 'Nhập tên khối';
    if (b.openAt && b.deadline && b.deadline <= b.openAt) errors.deadline = 'Hạn nộp phải sau thời gian mở';
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Thông tin chưa hợp lệ', fields: errors });

    const sets = rawSets();
    const idx = sets.findIndex((s) => s.id === id);
    if (isNew && idx >= 0) return res.status(409).json({ error: 'Mã khối đã tồn tại' });
    if (!isNew && idx < 0) return res.status(404).json({ error: 'Không tìm thấy khối' });
    const set = normalizeSet(
      {
        ...(idx >= 0 ? sets[idx] : {}),
        id,
        title: b.title.trim().slice(0, 120),
        short: String(b.short || b.title.split(' — ')[0]).trim().slice(0, 40),
        num: String(b.num || (idx >= 0 ? sets[idx].num : String(sets.length + 1).padStart(2, '0'))).slice(0, 4),
        desc: String(b.desc || '').slice(0, 200),
        tags: Array.isArray(b.tags) ? b.tags.map((t) => String(t).slice(0, 30)).slice(0, 10) : [],
        difficulty: ['Dễ', 'Trung bình', 'Khó'].includes(b.difficulty) ? b.difficulty : 'Trung bình',
        status: SET_STATUSES.includes(b.status) ? b.status : 'draft',
        openAt: b.openAt || null,
        deadline: b.deadline || null,
        hue: Number.isFinite(Number(b.hue)) ? Number(b.hue) : 200,
        problems: Array.isArray(b.problems) ? [...new Set(b.problems.map(String))].filter((p) => catalog.problemMap.has(p)) : [],
      },
      idx >= 0 ? idx : sets.length,
    );
    if (idx >= 0) sets[idx] = set;
    else sets.push(set);
    saveSets(sets);
    res.json(set);
  });

  r.patch('/sets/:id/status', (req, res) => {
    const sets = rawSets();
    const s = sets.find((x) => x.id === req.params.id);
    if (!s || !SET_STATUSES.includes(req.body?.status)) return res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
    s.status = req.body.status;
    saveSets(sets);
    res.json(s);
  });

  r.put('/sets-order', (req, res) => {
    const order = Array.isArray(req.body?.order) ? req.body.order : [];
    const sets = rawSets();
    sets.sort((a, b) => (order.indexOf(a.id) + 1 || 1e9) - (order.indexOf(b.id) + 1 || 1e9));
    saveSets(sets);
    res.json({ ok: true });
  });

  r.delete('/sets/:id', (req, res) => {
    const sets = rawSets();
    if (!sets.some((s) => s.id === req.params.id)) return res.status(404).json({ error: 'Không tìm thấy khối' });
    saveSets(sets.filter((s) => s.id !== req.params.id));
    res.json({ ok: true });
  });

  /* ---------- Bài nộp ---------- */
  r.get('/submissions', (req, res) => {
    const where = [];
    const args = [];
    const { user, problem, set, verdict, date } = req.query;
    if (user) where.push('u.username LIKE ?') && args.push(`%${String(user).slice(0, 30)}%`);
    if (problem && problem !== 'all') where.push('s.problem_id = ?') && args.push(String(problem));
    if (set && set !== 'all') {
      const pids = catalog.setMap.get(String(set))?.problems ?? [];
      where.push(`s.problem_id IN (${pids.map(() => '?').join(',') || "''"})`);
      args.push(...pids);
    }
    if (verdict && verdict !== 'all') where.push('s.verdict = ?') && args.push(String(verdict));
    if (date === 'today' || date === 'yday') {
      const today = Math.floor((Date.now() + TZ) / DAY) * DAY - TZ;
      const from = date === 'today' ? today : today - DAY;
      where.push('s.created_at >= ? AND s.created_at < ?');
      args.push(from, from + DAY);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortCol = SORTS[req.query.sort] || SORTS.id;
    const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
    const page = Math.max(0, Number(req.query.page) || 0);
    const base = `FROM submissions s JOIN users u ON u.id = s.user_id ${clause}`;
    const total = db.prepare(`SELECT COUNT(*) AS n ${base}`).get(...args).n;
    const rows = db
      .prepare(
        `SELECT s.id, s.problem_id, s.verdict, s.time_ms, s.memory_kb, s.tests_passed, s.test_count, s.created_at, u.username
         ${base} ORDER BY ${sortCol} ${dir}, s.id DESC LIMIT ${PAGE} OFFSET ${page * PAGE}`,
      )
      .all(...args);
    res.json({ total, page, pageSize: PAGE, rows: rows.map((x) => ({ ...x, title: catalog.problemMap.get(x.problem_id)?.title ?? x.problem_id })) });
  });

  r.get('/submissions/:id', (req, res) => {
    const row = db
      .prepare('SELECT s.*, u.username FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.id = ?')
      .get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
    res.json({
      id: row.id,
      username: row.username,
      problemId: row.problem_id,
      title: catalog.problemMap.get(row.problem_id)?.title ?? row.problem_id,
      verdict: row.verdict,
      timeMs: row.time_ms,
      memoryKb: row.memory_kb,
      testsPassed: row.tests_passed,
      testCount: row.test_count,
      tests: row.tests_json ? JSON.parse(row.tests_json) : [],
      compileLog: row.compile_log,
      source: row.source,
      createdAt: row.created_at,
    });
  });

  r.post('/rejudge', (req, res) => {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter(Number.isInteger).slice(0, 500);
    const reset = db.prepare(
      "UPDATE submissions SET verdict = 'PENDING', time_ms = NULL, memory_kb = NULL, tests_passed = NULL, tests_json = NULL, compile_log = NULL, fail_output = NULL WHERE id = ? AND verdict != 'PENDING'",
    );
    let n = 0;
    for (const id of ids) {
      if (reset.run(id).changes) {
        queue.push(id);
        n += 1;
      }
    }
    res.json({ queued: n });
  });

  /* ---------- Người dùng ---------- */
  r.get('/users', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.username, u.role, u.locked, u.last_seen, u.created_at,
           (SELECT COUNT(DISTINCT problem_id) FROM submissions s WHERE s.user_id = u.id AND s.verdict = 'AC') AS solved
         FROM users u ORDER BY u.username COLLATE NOCASE`,
      )
      .all();
    res.json(rows);
  });

  r.patch('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    const { role, locked } = req.body ?? {};
    if (id === req.user.id && (role === 'student' || locked === true)) {
      return res.status(400).json({ error: 'Không thể tự hạ quyền hoặc tự khóa tài khoản của mình' });
    }
    if (role === 'admin' || role === 'student') db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    if (typeof locked === 'boolean') {
      db.prepare('UPDATE users SET locked = ? WHERE id = ?').run(locked ? 1 : 0, id);
      if (locked) auth.endAllSessions(id);
    }
    res.json(db.prepare('SELECT id, username, role, locked FROM users WHERE id = ?').get(id));
  });

  r.post('/users/:id/reset-password', (req, res) => {
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    const temp = `mj-${crypto.randomBytes(5).toString('hex')}`;
    const { hash, salt } = hashPassword(temp);
    db.prepare('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?').run(hash, salt, id);
    auth.endAllSessions(id);
    res.json({ tempPassword: temp });
  });

  /* ---------- Cài đặt ---------- */
  r.get('/settings', (_req, res) => {
    res.json({ registerCode: settings.registerCode, allowRegister: settings.allowRegister, banner: settings.banner });
  });

  r.put('/settings', (req, res) => {
    settings.update(req.body ?? {});
    res.json({ registerCode: settings.registerCode, allowRegister: settings.allowRegister, banner: settings.banner });
  });

  return r;
}
