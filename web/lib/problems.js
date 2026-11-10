import fs from 'node:fs';
import path from 'node:path';

import { defaultSubtasks, normalizeSubtasks } from './contests.js';

export const ID_RE = /^[A-Za-z0-9_]{1,15}$/;
export const SET_STATUSES = ['draft', 'open', 'closed', 'hidden'];
export const VISIBILITY_MODES = ['public', 'unlisted', 'restricted', 'draft'];

export function normalizeAllowUsers(val) {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return normalizeAllowUsers(parsed);
    } catch {}
    return val.split(/[\r\n,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  if (Array.isArray(val)) {
    return Array.from(new Set(val.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)));
  }
  return [];
}

export function isUserAllowed(allowList, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const username = String(user.username || '').trim().toLowerCase();
  if (!username) return false;
  const list = normalizeAllowUsers(allowList);
  return list.includes(username);
}

export function parseVisibility(vis, fallbackStatus) {
  if (vis && VISIBILITY_MODES.includes(vis)) return vis;
  if (fallbackStatus === 'draft') return 'draft';
  if (fallbackStatus === 'hidden') return 'unlisted';
  return 'public';
}

export function canAccessCourse(courseMeta, user) {
  if (!courseMeta) return true;
  if (user?.role === 'admin') return true;
  const vis = courseMeta.visibility || 'public';
  if (vis === 'draft') return false;
  if (vis === 'restricted') return isUserAllowed(courseMeta.allowUsers, user);
  return true; // 'public', 'unlisted'
}

export function canListCourse(courseMeta, user) {
  if (!courseMeta) return true;
  const vis = courseMeta.visibility || 'public';
  if (vis === 'draft' || vis === 'unlisted') return false;
  if (vis === 'restricted') return isUserAllowed(courseMeta.allowUsers, user);
  return true; // 'public'
}

export function canAccessSet(s, user, coursesMeta) {
  if (!s) return false;
  if (user?.role === 'admin') return true;
  if (s.group && coursesMeta && coursesMeta[s.group]) {
    if (!canAccessCourse(coursesMeta[s.group], user)) return false;
  }
  const vis = s.visibility || (s.status === 'draft' ? 'draft' : s.status === 'hidden' ? 'unlisted' : 'public');
  if (vis === 'draft') return false;
  if (vis === 'restricted') return isUserAllowed(s.allowUsers, user);
  return true; // 'public', 'unlisted'
}

export function canListSet(s, user, coursesMeta) {
  if (!s) return false;
  if (s.group && coursesMeta && coursesMeta[s.group]) {
    if (!canListCourse(coursesMeta[s.group], user)) return false;
  }
  if (s.openAt && Date.parse(s.openAt) > Date.now()) {
    if (user?.role !== 'admin') return false;
  }
  const vis = s.visibility || (s.status === 'draft' ? 'draft' : s.status === 'hidden' ? 'unlisted' : 'public');
  if (vis === 'draft' || vis === 'unlisted') return false;
  if (vis === 'restricted') return isUserAllowed(s.allowUsers, user);
  return true; // 'public'
}

export function canAccessProblem(p, user, catalog, coursesMeta) {
  if (!p || p.status === 'deleted') return false;
  if (user?.role === 'admin') return true;
  const vis = p.visibility || (p.status === 'pub' ? 'public' : 'draft');
  if (vis === 'draft') return false;
  if (vis === 'restricted') return isUserAllowed(p.allowUsers, user);
  if (catalog && catalog.sets) {
    const parentSets = catalog.sets.filter((s) => s.problems.includes(p.id));
    if (parentSets.length > 0) {
      const anySetAccessible = parentSets.some((s) => canAccessSet(s, user, coursesMeta));
      if (!anySetAccessible) return false;
    }
  }
  return true;
}

export function canListProblem(p, s, user, coursesMeta) {
  if (!p || p.status === 'deleted') return false;
  if (user?.role === 'admin') return true;
  const vis = p.visibility || (p.status === 'pub' ? 'public' : 'draft');
  if (vis === 'draft' || vis === 'unlisted') return false;
  if (vis === 'restricted') return isUserAllowed(p.allowUsers, user);
  return true;
}

const readIfExists = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

export function parseConfig(text) {
  const cfg = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && !line.startsWith('#')) cfg[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return cfg;
}

function loadProblem(root, id, origin) {
  const base = path.join(root, id);
  const cfg = parseConfig(readIfExists(path.join(base, 'problem.txt')));
  const sampleIds = (cfg.samples || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return {
    id,
    origin,
    root,
    title: cfg.title || id,
    timeMs: Number(cfg.time_ms) || 1000,
    memoryMb: Number(cfg.memory_mb) || 256,
    tests: Number(cfg.tests) || 0,
    difficulty: cfg.difficulty || 'Trung bình',
    /* Bộ subtask mặc định soạn kèm bài (problems/<id>/subtasks.json); sai định dạng thì bỏ qua. */
    fileSubtasks: (() => {
      try {
        const raw = JSON.parse(readIfExists(path.join(base, 'subtasks.json')) || 'null');
        return raw ? normalizeSubtasks(raw, Number(cfg.tests) || 0).subtasks ?? null : null;
      } catch {
        return null;
      }
    })(),
    statement: readIfExists(path.join(base, 'statement.md')),
    hint: readIfExists(path.join(base, 'hint.md')).trim(),
    sampleTests: sampleIds,
    samples: sampleIds.map((n) => ({
      input: readIfExists(path.join(base, 'tests', `${n}.in`)).replace(/\s+$/, ''),
      output: readIfExists(path.join(base, 'tests', `${n}.out`)).replace(/\s+$/, ''),
    })),
  };
}

function repoIds(dir) {
  return readIfExists(path.join(dir, 'index.txt'))
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#') && ID_RE.test(s));
}

function customIds(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && ID_RE.test(d.name) && fs.existsSync(path.join(dir, d.name, 'problem.txt')))
    .map((d) => d.name)
    .sort();
}

function normalizeSet(s, i) {
  const visibility = parseVisibility(s.visibility, s.status);
  const allowUsers = normalizeAllowUsers(s.allowUsers);
  return {
    id: String(s.id),
    num: s.num || String(i + 1).padStart(2, '0'),
    short: s.short || String(s.title || '').split(' — ')[0] || s.id,
    title: s.title || s.id,
    group: String(s.group || '').slice(0, 60),
    desc: s.desc || '',
    tags: Array.isArray(s.tags) ? s.tags : [],
    difficulty: s.difficulty || 'Trung bình',
    status: SET_STATUSES.includes(s.status) ? s.status : (visibility === 'draft' ? 'draft' : visibility === 'unlisted' ? 'hidden' : 'open'),
    visibility,
    allowUsers,
    openAt: s.openAt || null,
    deadline: s.deadline || null,
    hue: Number.isFinite(s.hue) ? s.hue : (i * 70 + 200) % 360,
    problems: Array.isArray(s.problems) ? s.problems.map(String) : [],
  };
}

/* Danh mục đề + khối bài. Đề lấy từ 2 nguồn: repo (problems/, sửa qua git) và custom
 * (tạo trên trang Admin, lưu ở customDir). Khối bài và trạng thái bài lưu trong database. */
export function createCatalog({ db, repoDir, customDir }) {
  const catalog = { problems: [], problemMap: new Map(), sets: [], setMap: new Map(), repoDir, customDir };
  const listSets = db.prepare('SELECT data FROM problem_sets ORDER BY position, id');
  const listMeta = db.prepare('SELECT id, status, visibility, allow_users, tags, solution, subtasks FROM problem_meta');

  /* Khối mới thêm vào sets.json (qua git) được nạp vào DB đúng một lần; khối Admin đã xóa không bị nạp lại. */
  const seed = JSON.parse(readIfExists(path.join(repoDir, 'sets.json')) || '[]');
  const existing = db.prepare('SELECT id FROM problem_sets').all().map((r) => r.id);
  const seededRow = db.prepare("SELECT value FROM settings WHERE key = 'seeded_sets'").get();
  const seeded = new Set(seededRow ? JSON.parse(seededRow.value) : existing);
  const insert = db.prepare('INSERT INTO problem_sets (id, data, position) VALUES (?, ?, ?)');
  let position = db.prepare('SELECT COALESCE(MAX(position), -1) AS p FROM problem_sets').get().p;
  seed.forEach((s, i) => {
    const id = String(s.id);
    if (seeded.has(id) || existing.includes(id)) return;
    insert.run(id, JSON.stringify(normalizeSet(s, i)), ++position);
    seeded.add(id);
  });
  db.prepare("INSERT INTO settings (key, value) VALUES ('seeded_sets', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    JSON.stringify([...seeded, ...existing.filter((id) => !seeded.has(id))]),
  );

  catalog.reload = () => {
    const meta = new Map(listMeta.all().map((m) => [m.id, m]));
    const repo = repoIds(repoDir);
    const custom = customIds(customDir);
    /* Bài repo đã được Admin chỉnh trên web: dùng bản trong customDir (overridesRepo), bản gốc vẫn còn để khôi phục. */
    const problems = [
      ...repo.map((id) => (custom.includes(id) ? { ...loadProblem(customDir, id, 'custom'), overridesRepo: true } : loadProblem(repoDir, id, 'repo'))),
      ...custom.filter((id) => !repo.includes(id)).map((id) => loadProblem(customDir, id, 'custom')),
    ].map((p) => {
      const m = meta.get(p.id);
      /* Subtask mặc định: Admin đã chỉnh (lưu DB) > soạn kèm bài (subtasks.json) > một subtask gồm toàn bộ test. */
      let custom = null;
      try {
        custom = m?.subtasks ? normalizeSubtasks(JSON.parse(m.subtasks), p.tests).subtasks ?? null : null;
      } catch {}
      const fallbackVis = m?.status === 'pub' ? 'public' : (p.origin === 'repo' ? 'public' : 'draft');
      const visibility = parseVisibility(m?.visibility, m?.status ? (m.status === 'pub' ? 'public' : 'draft') : fallbackVis);
      const allowUsers = normalizeAllowUsers(m?.allow_users);
      return {
        ...p,
        status: m?.status ?? (visibility === 'draft' ? 'draft' : 'pub'),
        visibility,
        allowUsers,
        tags: m?.tags ?? '',
        solution: m?.solution ?? '',
        subtasks: custom || p.fileSubtasks || defaultSubtasks(p.tests),
        subtasksSource: custom ? 'admin' : p.fileSubtasks ? 'file' : 'auto',
      };
    });
    const problemMap = new Map(problems.map((p) => [p.id, p]));
    const sets = listSets.all().map((r, i) => {
      const s = normalizeSet(JSON.parse(r.data), i);
      return { ...s, problems: s.problems.filter((pid) => problemMap.has(pid)) };
    });
    for (const p of problems) p.setId = sets.find((s) => s.problems.includes(p.id))?.id ?? null;
    Object.assign(catalog, { problems, problemMap, sets, setMap: new Map(sets.map((s) => [s.id, s])) });
  };

  catalog.canAccessCourse = canAccessCourse;
  catalog.canListCourse = canListCourse;
  catalog.canAccessSet = (s, user, cm) => canAccessSet(s, user, cm);
  catalog.canListSet = (s, user, cm) => canListSet(s, user, cm);
  catalog.canAccessProblem = (p, user, cm) => canAccessProblem(p, user, catalog, cm);
  catalog.canListProblem = (p, s, user, cm) => canListProblem(p, s, user, cm);

  /* Sinh viên chỉ thấy khối và bài khi có quyền hiển thị tương ứng. */
  catalog.isSetVisible = (s, user, cm) => canListSet(s, user, cm);
  catalog.visibleSets = (user, cm) => catalog.sets.filter((s) => canListSet(s, user, cm));
  catalog.visibleProblems = (s, user, cm) => s.problems.filter((pid) => {
    const p = catalog.problemMap.get(pid);
    return p && canListProblem(p, s, user, cm);
  });
  catalog.isProblemVisible = (p, user, cm) => canAccessProblem(p, user, catalog, cm);

  catalog.reload();
  return catalog;
}

export { normalizeSet };
