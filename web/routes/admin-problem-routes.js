import { Router } from 'express';
import express from 'express';

const NEW_ID_RE = /^[A-Z][A-Z0-9_]{1,14}$/;

/* Quản lý bài: bài trong repo chỉ đổi được trạng thái/nhãn/lời giải (nội dung sửa qua git);
 * bài custom (tạo trên web) sửa được toàn bộ: thông tin, đề, gợi ý, test. */
export function adminProblemRoutes({ db, catalog, auth, judge, store, adminStats }) {
  const r = Router();
  r.use(auth.requireAdmin);

  const upsertMeta = db.prepare(`
    INSERT INTO problem_meta (id, status, tags, solution, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET status = excluded.status, tags = excluded.tags, solution = excluded.solution, updated_at = excluded.updated_at`);
  const subCounts = db.prepare('SELECT problem_id, COUNT(*) AS n FROM submissions GROUP BY problem_id');

  const find = (req, res) => {
    const p = catalog.problemMap.get(req.params.id);
    if (!p) res.status(404).json({ error: 'Không tìm thấy bài' });
    return p;
  };
  const detail = (p) => ({
    id: p.id,
    origin: p.origin,
    title: p.title,
    timeMs: p.timeMs,
    memoryMb: p.memoryMb,
    difficulty: p.difficulty,
    status: p.status,
    tags: p.tags,
    statement: p.statement,
    hint: p.hint,
    solution: p.solution,
    sets: catalog.sets.filter((s) => s.problems.includes(p.id)).map((s) => ({ id: s.id, short: s.short })),
    tests: store.listTests(p.id, p.root),
  });

  r.get('/problems', (_req, res) => {
    const stats = adminStats.problemStats();
    const subs = new Map(subCounts.all().map((x) => [x.problem_id, x.n]));
    res.json(
      catalog.problems.map((p) => {
        const s = stats.get(p.id);
        return {
          id: p.id,
          title: p.title,
          origin: p.origin,
          difficulty: p.difficulty,
          status: p.status,
          tests: p.tests,
          submissions: subs.get(p.id) || 0,
          acRate: s && s.tried ? Math.round((s.solved / s.tried) * 100) : 0,
          sets: catalog.sets.filter((x) => x.problems.includes(p.id)).map((x) => ({ id: x.id, short: x.short })),
        };
      }),
    );
  });

  r.get('/problems/:id', (req, res) => {
    const p = find(req, res);
    if (p) res.json(detail(p));
  });

  r.post('/problems', (req, res) => {
    const id = String(req.body?.id || '').trim().toUpperCase();
    if (!NEW_ID_RE.test(id)) return res.status(400).json({ error: 'Mã bài gồm 2–15 ký tự in hoa/số/_ và bắt đầu bằng chữ (vd P18)' });
    if (catalog.problemMap.has(id) || store.exists(id)) return res.status(409).json({ error: `Mã ${id} đã tồn tại` });
    store.create(id);
    upsertMeta.run(id, 'draft', '', '', Date.now());
    catalog.reload();
    res.status(201).json(detail(catalog.problemMap.get(id)));
  });

  /* Lưu thông tin + đề + lời giải; status = 'pub' để xuất bản, 'draft' để lưu nháp. */
  r.put('/problems/:id', (req, res) => {
    const p = find(req, res);
    if (!p) return;
    const b = req.body ?? {};
    if (p.origin === 'custom') {
      if (typeof b.title !== 'string' || !b.title.trim()) return res.status(400).json({ error: 'Nhập tên bài', fields: { title: 'Nhập tên bài' } });
      store.saveMeta(p.id, {
        title: b.title.trim().slice(0, 120),
        timeMs: b.timeMs,
        memoryMb: b.memoryMb,
        difficulty: ['Dễ', 'Trung bình', 'Khó'].includes(b.difficulty) ? b.difficulty : undefined,
        statement: typeof b.statement === 'string' ? b.statement.slice(0, 50_000) : undefined,
        hint: typeof b.hint === 'string' ? b.hint.slice(0, 5_000) : undefined,
      });
    }
    const status = b.status === 'pub' || b.status === 'draft' ? b.status : p.status;
    if (status === 'pub' && p.origin === 'custom' && store.listTests(p.id).length === 0) {
      return res.status(400).json({ error: 'Cần ít nhất 1 test trước khi xuất bản' });
    }
    upsertMeta.run(
      p.id,
      status,
      typeof b.tags === 'string' ? b.tags.slice(0, 200) : p.tags,
      typeof b.solution === 'string' ? b.solution.slice(0, 64 * 1024) : p.solution,
      Date.now(),
    );
    catalog.reload();
    res.json(detail(catalog.problemMap.get(p.id)));
  });

  r.post('/problems/:id/tests', express.json({ limit: '40mb' }), (req, res) => {
    const p = find(req, res);
    if (!p) return;
    if (p.origin !== 'custom') return res.status(400).json({ error: 'Test của bài trong repo được quản lý qua git' });
    const added = store.addTests(p.id, Array.isArray(req.body?.files) ? req.body.files : []);
    catalog.reload();
    res.json({ added, tests: store.listTests(p.id) });
  });

  r.put('/problems/:id/tests', (req, res) => {
    const p = find(req, res);
    if (!p) return;
    if (p.origin !== 'custom') return res.status(400).json({ error: 'Test của bài trong repo được quản lý qua git' });
    const { order, samples } = req.body ?? {};
    if (!Array.isArray(order) || !Array.isArray(samples)) return res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
    store.reorderTests(p.id, order, samples);
    catalog.reload();
    res.json({ tests: store.listTests(p.id) });
  });

  /* Chạy lời giải mẫu với toàn bộ test (không lưu thành bài nộp). */
  r.post('/problems/:id/check', async (req, res) => {
    const p = find(req, res);
    if (!p) return;
    const source = typeof req.body?.source === 'string' ? req.body.source : p.solution;
    if (!source.trim()) return res.status(400).json({ error: 'Chưa có lời giải mẫu' });
    try {
      res.json(await judge.judge(p.id, source, { origin: p.origin }));
    } catch (e) {
      console.error('Check failed:', e);
      res.status(503).json({ error: 'Hệ thống chấm đang bận, thử lại sau' });
    }
  });

  return r;
}
