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
        group: String(b.group ?? (idx >= 0 ? sets[idx].group : '')).trim().slice(0, 60),
        desc: String(b.desc || '').slice(0, 200),
        tags: Array.isArray(b.tags) ? b.tags.map((t) => String(t).slice(0, 30)).slice(0, 10) : [],
        difficulty: ['Dễ', 'Trung bình', 'Khó'].includes(b.difficulty) ? b.difficulty : 'Trung bình',
        status: SET_STATUSES.includes(b.status) ? b.status : 'draft',
        visibility: b.visibility,
        allowUsers: b.allowUsers,
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
    if (!s) return res.status(404).json({ error: 'Không tìm thấy khối' });
    if (req.body?.visibility && ['public', 'unlisted', 'restricted', 'draft'].includes(req.body.visibility)) {
      s.visibility = req.body.visibility;
      if (s.visibility === 'draft') s.status = 'draft';
      else if (s.visibility === 'unlisted') s.status = 'hidden';
      else s.status = 'open';
    } else if (SET_STATUSES.includes(req.body?.status)) {
      s.status = req.body.status;
      if (s.status === 'draft') s.visibility = 'draft';
      else if (s.status === 'hidden') s.visibility = 'unlisted';
      else s.visibility = 'public';
    } else {
      return res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
    }
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

  r.post('/sets-batch', (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
    if (!ids.length) return res.status(400).json({ error: 'Chưa chọn khối bài nào' });
    const { group, status, visibility } = req.body ?? {};
    const sets = rawSets();
    let updated = 0;
    for (const s of sets) {
      if (ids.includes(s.id)) {
        if (typeof group === 'string') s.group = group.trim().slice(0, 60);
        if (visibility && ['public', 'unlisted', 'restricted', 'draft'].includes(visibility)) {
          s.visibility = visibility;
          if (s.visibility === 'draft') s.status = 'draft';
          else if (s.visibility === 'unlisted') s.status = 'hidden';
          else s.status = 'open';
        } else if (SET_STATUSES.includes(status)) {
          s.status = status;
          if (s.status === 'draft') s.visibility = 'draft';
          else if (s.status === 'hidden') s.visibility = 'unlisted';
          else s.visibility = 'public';
        }
        updated++;
      }
    }
    if (updated) saveSets(sets);
    res.json({ ok: true, updated });
  });

  /* ---------- Khóa học (Courses CRUD) ---------- */
  function getCoursesMeta() {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'course_meta'").get();
      return row && row.value ? JSON.parse(row.value) : {};
    } catch {
      return {};
    }
  }

  function saveCoursesMeta(meta) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('course_meta', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(meta));
  }

  r.get('/courses', (_req, res) => {
    const sets = rawSets();
    const coursesMap = new Map();
    for (const s of sets) {
      const g = (s.group || '').trim();
      if (!g) continue;
      if (!coursesMap.has(g)) {
        coursesMap.set(g, { name: g, sets: [] });
      }
      coursesMap.get(g).sets.push({ id: s.id, title: s.title, num: s.num, problemCount: s.problems.length, status: s.status });
    }
    const metaMap = getCoursesMeta();
    const courses = Array.from(coursesMap.values()).map((c) => ({
      name: c.name,
      setCount: c.sets.length,
      problemCount: c.sets.reduce((t, s) => t + s.problemCount, 0),
      sets: c.sets,
      meta: metaMap[c.name] || {},
    }));
    res.json(courses);
  });

  r.post('/courses', (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: 'Tên khóa học không được để trống' });
    const rawSetIds = req.body?.setIds !== undefined ? req.body.setIds : req.body?.sets;
    const setIds = Array.isArray(rawSetIds) ? rawSetIds.map(String) : [];
    const sets = rawSets();
    let updated = false;
    for (const s of sets) {
      if (setIds.includes(s.id)) {
        s.group = name;
        updated = true;
      }
    }
    if (updated) saveSets(sets);

    const metaMap = getCoursesMeta();
    metaMap[name] = {
      visibility: ['public', 'unlisted', 'restricted', 'draft'].includes(req.body?.visibility) ? req.body.visibility : 'public',
      allowUsers: Array.isArray(req.body?.allowUsers)
        ? req.body.allowUsers.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
        : typeof req.body?.allowUsers === 'string'
          ? req.body.allowUsers.split(/[\r\n,]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
          : [],
      defaultLang: String(req.body?.defaultLang || '').trim().slice(0, 10),
      badge: String(req.body?.badge || '').slice(0, 50),
      tech: String(req.body?.tech || '').slice(0, 50),
      sub: String(req.body?.sub || '').slice(0, 160),
      dept: String(req.body?.dept || '').slice(0, 100),
      theme: String(req.body?.theme || 'blue').slice(0, 30),
      rating: String(req.body?.rating || '').slice(0, 80),
      schedule: String(req.body?.schedule || '').slice(0, 100),
      customSetsLabel: String(req.body?.customSetsLabel || '').slice(0, 80),
      customProblemsLabel: String(req.body?.customProblemsLabel || '').slice(0, 80),
      customColor: String(req.body?.customColor || '').slice(0, 50),
      infoItems: Array.isArray(req.body?.infoItems)
        ? req.body.infoItems.slice(0, 6).map((it) => ({
            icon: String(it?.icon || '•').slice(0, 10),
            text: String(it?.text || '').slice(0, 100),
          }))
        : [],
      highlights: Array.isArray(req.body?.highlights)
        ? req.body.highlights.map((h) => String(h).slice(0, 120)).filter(Boolean).slice(0, 6)
        : [],
    };
    saveCoursesMeta(metaMap);

    res.json({ ok: true, name, assignedCount: setIds.length, meta: metaMap[name] });
  });

  r.put('/courses/:name', (req, res) => {
    const oldName = decodeURIComponent(req.params.name).trim();
    const newName = String(req.body?.newName || req.body?.name || oldName).trim().slice(0, 60);
    if (!newName) return res.status(400).json({ error: 'Tên khóa học không được để trống' });
    const rawSetIds = req.body?.setIds !== undefined ? req.body.setIds : req.body?.sets;
    const setIds = Array.isArray(rawSetIds) ? rawSetIds.map(String) : null;
    const sets = rawSets();
    let changed = false;
    for (const s of sets) {
      if (s.group === oldName) {
        if (setIds !== null) {
          s.group = setIds.includes(s.id) ? newName : '';
        } else {
          s.group = newName;
        }
        changed = true;
      } else if (setIds !== null && setIds.includes(s.id)) {
        s.group = newName;
        changed = true;
      }
    }
    if (changed) saveSets(sets);

    const metaMap = getCoursesMeta();
    const existingMeta = metaMap[oldName] || {};
    if (oldName !== newName) {
      delete metaMap[oldName];
    }
    metaMap[newName] = {
      ...existingMeta,
      visibility: req.body?.visibility && ['public', 'unlisted', 'restricted', 'draft'].includes(req.body.visibility)
        ? req.body.visibility
        : (existingMeta.visibility || 'public'),
      allowUsers: req.body?.allowUsers !== undefined
        ? (Array.isArray(req.body.allowUsers)
            ? req.body.allowUsers.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
            : typeof req.body.allowUsers === 'string'
              ? req.body.allowUsers.split(/[\r\n,]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
              : [])
        : (existingMeta.allowUsers || []),
      defaultLang: req.body?.defaultLang !== undefined ? String(req.body.defaultLang).trim().slice(0, 10) : (existingMeta.defaultLang || ''),
      badge: req.body?.badge !== undefined ? String(req.body.badge).slice(0, 50) : (existingMeta.badge || ''),
      tech: req.body?.tech !== undefined ? String(req.body.tech).slice(0, 50) : (existingMeta.tech || ''),
      sub: req.body?.sub !== undefined ? String(req.body.sub).slice(0, 160) : (existingMeta.sub || ''),
      dept: req.body?.dept !== undefined ? String(req.body.dept).slice(0, 100) : (existingMeta.dept || ''),
      theme: req.body?.theme !== undefined ? String(req.body.theme).slice(0, 30) : (existingMeta.theme || 'blue'),
      rating: req.body?.rating !== undefined ? String(req.body.rating).slice(0, 80) : (existingMeta.rating || ''),
      schedule: req.body?.schedule !== undefined ? String(req.body.schedule).slice(0, 100) : (existingMeta.schedule || ''),
      customSetsLabel: req.body?.customSetsLabel !== undefined ? String(req.body.customSetsLabel).slice(0, 80) : (existingMeta.customSetsLabel || ''),
      customProblemsLabel: req.body?.customProblemsLabel !== undefined ? String(req.body.customProblemsLabel).slice(0, 80) : (existingMeta.customProblemsLabel || ''),
      customColor: req.body?.customColor !== undefined ? String(req.body.customColor).slice(0, 50) : (existingMeta.customColor || ''),
      infoItems: Array.isArray(req.body?.infoItems)
        ? req.body.infoItems.slice(0, 6).map((it) => ({
            icon: String(it?.icon || '•').slice(0, 10),
            text: String(it?.text || '').slice(0, 100),
          }))
        : (existingMeta.infoItems || []),
      highlights: Array.isArray(req.body?.highlights)
        ? req.body.highlights.map((h) => String(h).slice(0, 120)).filter(Boolean).slice(0, 6)
        : (existingMeta.highlights || []),
    };
    saveCoursesMeta(metaMap);

    res.json({ ok: true, name: newName, meta: metaMap[newName] });
  });

  r.delete('/courses/:name', (req, res) => {
    const name = decodeURIComponent(req.params.name).trim();
    const sets = rawSets();
    let changed = false;
    for (const s of sets) {
      if (s.group === name) {
        s.group = '';
        changed = true;
      }
    }
    if (changed) saveSets(sets);

    const metaMap = getCoursesMeta();
    if (metaMap[name]) {
      delete metaMap[name];
      saveCoursesMeta(metaMap);
    }
    res.json({ ok: true });
  });

  /* ---------- Bài nộp ---------- */
  r.get('/submissions', (req, res) => {
    const where = [];
    const args = [];
    const { user, problem, set, verdict, date } = req.query;
    if (user) where.push('(u.username LIKE ? OR u.full_name LIKE ?)') && args.push(`%${String(user).slice(0, 30)}%`, `%${String(user).slice(0, 30)}%`);
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
        `SELECT s.id, s.problem_id, s.verdict, s.time_ms, s.memory_kb, s.tests_passed, s.test_count, COALESCE(s.lang, 'c') AS lang, s.created_at, u.username, u.full_name AS fullName, u.avatar
         ${base} ORDER BY ${sortCol} ${dir}, s.id DESC LIMIT ${PAGE} OFFSET ${page * PAGE}`,
      )
      .all(...args);
    res.json({ total, page, pageSize: PAGE, rows: rows.map((x) => ({ ...x, title: catalog.problemMap.get(x.problem_id)?.title ?? x.problem_id })) });
  });

  r.get('/submissions/:id', (req, res) => {
    const row = db
      .prepare('SELECT s.*, u.username, u.full_name AS fullName, u.avatar FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.id = ?')
      .get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
    res.json({
      id: row.id,
      username: row.username,
      fullName: row.fullName || '',
      avatar: row.avatar || '',
      problemId: row.problem_id,
      title: catalog.problemMap.get(row.problem_id)?.title ?? row.problem_id,
      verdict: row.verdict,
      timeMs: row.time_ms,
      memoryKb: row.memory_kb,
      testsPassed: row.tests_passed,
      testCount: row.test_count,
      tests: row.tests_json ? JSON.parse(row.tests_json) : [],
      compileLog: row.compile_log,
      failOutput: row.fail_output || null,
      source: row.source,
      lang: row.lang || 'c',
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
        `SELECT u.id, u.username, u.full_name AS fullName, u.avatar, u.role, u.locked, u.last_seen, u.created_at,
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
    const { role, locked, avatar } = req.body ?? {};
    if (id === req.user.id && (role === 'student' || locked === true)) {
      return res.status(400).json({ error: 'Không thể tự hạ quyền hoặc tự khóa tài khoản của mình' });
    }
    if (role === 'admin' || role === 'student') db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    if (typeof locked === 'boolean') {
      db.prepare('UPDATE users SET locked = ? WHERE id = ?').run(locked ? 1 : 0, id);
      if (locked) auth.endAllSessions(id);
    }
    if (typeof avatar === 'string') {
      db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, id);
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
    res.json({
      registerCode: settings.registerCode,
      allowRegister: settings.allowRegister,
      banner: settings.banner,
      allowedLangs: settings.allowedLangs,
    });
  });

  r.put('/settings', (req, res) => {
    settings.update(req.body ?? {});
    res.json({
      registerCode: settings.registerCode,
      allowRegister: settings.allowRegister,
      banner: settings.banner,
      allowedLangs: settings.allowedLangs,
    });
  });

  return r;
}
