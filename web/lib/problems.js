import fs from 'node:fs';
import path from 'node:path';

export const ID_RE = /^[A-Za-z0-9_]{1,15}$/;
export const SET_STATUSES = ['draft', 'open', 'closed', 'hidden'];

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
  return {
    id: String(s.id),
    num: s.num || String(i + 1).padStart(2, '0'),
    short: s.short || String(s.title || '').split(' — ')[0] || s.id,
    title: s.title || s.id,
    group: String(s.group || '').slice(0, 60),
    desc: s.desc || '',
    tags: Array.isArray(s.tags) ? s.tags : [],
    difficulty: s.difficulty || 'Trung bình',
    status: SET_STATUSES.includes(s.status) ? s.status : 'open',
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
  const listMeta = db.prepare('SELECT id, status, tags, solution FROM problem_meta');

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
    const problems = [
      ...repo.map((id) => loadProblem(repoDir, id, 'repo')),
      ...customIds(customDir)
        .filter((id) => !repo.includes(id))
        .map((id) => loadProblem(customDir, id, 'custom')),
    ].map((p) => {
      const m = meta.get(p.id);
      return {
        ...p,
        status: m?.status ?? (p.origin === 'repo' ? 'pub' : 'draft'),
        tags: m?.tags ?? '',
        solution: m?.solution ?? '',
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

  /* Sinh viên chỉ thấy khối Đang mở/Đã đóng đã tới giờ mở, và bài đã xuất bản. */
  catalog.isSetVisible = (s) => (s.status === 'open' || s.status === 'closed') && (!s.openAt || Date.parse(s.openAt) <= Date.now());
  catalog.visibleSets = () => catalog.sets.filter(catalog.isSetVisible);
  catalog.visibleProblems = (s) => s.problems.filter((pid) => catalog.problemMap.get(pid)?.status === 'pub');
  catalog.isProblemVisible = (p) =>
    p?.status === 'pub' && catalog.sets.some((s) => catalog.isSetVisible(s) && s.problems.includes(p.id));

  catalog.reload();
  return catalog;
}

export { normalizeSet };
