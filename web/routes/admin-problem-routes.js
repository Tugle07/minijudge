import path from 'node:path';

import { Router } from 'express';
import express from 'express';

import { normalizeSubtasks } from '../lib/contests.js';

const NEW_ID_RE = /^[A-Z][A-Z0-9_]{1,14}$/;

/* Quản lý bài (thêm / xem / sửa / xóa). Bài trong repo sửa được trên web: lần sửa nội dung hoặc test đầu tiên
 * chép bài sang customDir rồi sửa bản đó (bản gốc giữ nguyên để khôi phục). Xóa là chuyển vào thùng rác
 * (status = 'deleted', gỡ khỏi các khối); bài tạo trên web xóa vĩnh viễn được từ thùng rác. */
export function adminProblemRoutes({ db, catalog, auth, judge, store, adminStats }) {
  const r = Router();
  r.use(auth.requireAdmin);

  const upsertMeta = db.prepare(`
    INSERT INTO problem_meta (id, status, tags, solution, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET status = excluded.status, tags = excluded.tags, solution = excluded.solution, updated_at = excluded.updated_at`);
  const subCounts = db.prepare('SELECT problem_id, COUNT(*) AS n FROM submissions GROUP BY problem_id');
  const setRows = db.prepare('SELECT id, data FROM problem_sets');
  const saveSet = db.prepare('UPDATE problem_sets SET data = ? WHERE id = ?');
  const openContests = db.prepare(
    `SELECT c.title FROM contest_problems cp JOIN contests c ON c.id = cp.contest_id
     WHERE cp.problem_id = ? AND (c.status != 'published' OR c.end_at > ?)`,
  );
  const deleteMeta = db.prepare('DELETE FROM problem_meta WHERE id = ?');

  /* Bài repo chưa có bản chỉnh: chép sang customDir trước khi sửa nội dung/test. */
  const editable = (p) => {
    if (p.origin !== 'repo') return p;
    store.copyFrom(path.join(catalog.repoDir, p.id), p.id);
    catalog.reload();
    return catalog.problemMap.get(p.id);
  };

  const find = (req, res) => {
    const p = catalog.problemMap.get(req.params.id);
    if (!p) res.status(404).json({ error: 'Không tìm thấy bài' });
    return p;
  };
  const detail = (p) => ({
    id: p.id,
    origin: p.origin,
    overridesRepo: Boolean(p.overridesRepo),
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
    testCount: p.tests,
    subtasks: p.subtasks,
    subtasksSource: p.subtasksSource,
    fileSubtasks: p.fileSubtasks,
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
          overridesRepo: Boolean(p.overridesRepo),
          difficulty: p.difficulty,
          status: p.status,
          tests: p.tests,
          subtasks: p.subtasks,
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
    let p = find(req, res);
    if (!p) return;
    if (p.status === 'deleted') return res.status(409).json({ error: 'Bài đang ở thùng rác — khôi phục trước khi sửa' });
    const b = req.body ?? {};
    const changed =
      (typeof b.title === 'string' && b.title.trim() !== p.title) ||
      (typeof b.statement === 'string' && b.statement !== p.statement) ||
      (typeof b.hint === 'string' && b.hint.trim() !== p.hint) ||
      (b.timeMs !== undefined && Number(b.timeMs) !== p.timeMs) ||
      (b.memoryMb !== undefined && Number(b.memoryMb) !== p.memoryMb) ||
      (typeof b.difficulty === 'string' && b.difficulty !== p.difficulty);
    if (changed) p = editable(p);
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

  /* Bộ subtask mặc định của bài: dùng khi thêm bài vào cuộc thi. reset = true thì quay về bộ soạn kèm bài. */
  const saveSubtasks = db.prepare(`
    INSERT INTO problem_meta (id, status, tags, solution, subtasks, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET subtasks = excluded.subtasks, updated_at = excluded.updated_at`);
  r.put('/problems/:id/subtasks', (req, res) => {
    const p = find(req, res);
    if (!p) return;
    if (req.body?.reset) {
      saveSubtasks.run(p.id, p.status, p.tags, p.solution, null, Date.now());
    } else {
      const { subtasks, error } = normalizeSubtasks(req.body?.subtasks, p.tests);
      if (error) return res.status(400).json({ error });
      saveSubtasks.run(p.id, p.status, p.tags, p.solution, JSON.stringify(subtasks), Date.now());
    }
    catalog.reload();
    res.json(detail(catalog.problemMap.get(p.id)));
  });

  r.post('/problems/:id/tests', express.json({ limit: '40mb' }), (req, res) => {
    let p = find(req, res);
    if (!p) return;
    p = editable(p);
    const added = store.addTests(p.id, Array.isArray(req.body?.files) ? req.body.files : []);
    catalog.reload();
    res.json({ added, tests: store.listTests(p.id) });
  });

  /* Đọc một test (toàn bộ nội dung, không bị cắt) để Admin chỉnh sửa. */
  r.get('/problems/:id/tests/:n', (req, res) => {
    const p = find(req, res);
    if (!p) return;
    try {
      res.json(store.readTest(p.id, Number(req.params.n), p.root));
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });

  /* Ghi lại một test đã có. */
  r.put('/problems/:id/tests/:n', express.json({ limit: '20mb' }), (req, res) => {
    let p = find(req, res);
    if (!p) return;
    p = editable(p);
    try {
      store.writeTest(p.id, Number(req.params.n), req.body ?? {});
      catalog.reload();
      res.json({ tests: store.listTests(p.id) });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });

  /* Thêm một test mới (gõ trực tiếp input/output, không cần kéo file). */
  r.post('/problems/:id/tests/new', express.json({ limit: '20mb' }), (req, res) => {
    let p = find(req, res);
    if (!p) return;
    p = editable(p);
    try {
      const n = store.appendTest(p.id, req.body ?? {});
      catalog.reload();
      res.json({ n, tests: store.listTests(p.id) });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });

  r.put('/problems/:id/tests', (req, res) => {
    let p = find(req, res);
    if (!p) return;
    const { order, samples } = req.body ?? {};
    if (!Array.isArray(order) || !Array.isArray(samples)) return res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
    p = editable(p);
    store.reorderTests(p.id, order, samples);
    catalog.reload();
    res.json({ tests: store.listTests(p.id) });
  });

  /* Xóa: chuyển vào thùng rác và gỡ khỏi mọi khối. Không xóa khi bài đang nằm trong cuộc thi chưa kết thúc. */
  r.delete('/problems/:id', (req, res) => {
    const p = find(req, res);
    if (!p) return;
    const busy = openContests.all(p.id, Date.now()).map((c) => c.title);
    if (busy.length) return res.status(409).json({ error: `Bài đang dùng trong cuộc thi chưa kết thúc: ${busy.join(', ')}. Gỡ bài khỏi cuộc thi trước.` });
    if (req.query.permanent === '1') {
      if (p.status !== 'deleted') return res.status(409).json({ error: 'Chuyển bài vào thùng rác trước khi xóa vĩnh viễn' });
      if (p.origin !== 'custom' || p.overridesRepo) return res.status(400).json({ error: 'Bài trong repo không xóa vĩnh viễn được, chỉ để trong thùng rác' });
      store.remove(p.id);
      deleteMeta.run(p.id);
      catalog.reload();
      return res.json({ ok: true, removed: true });
    }
    for (const row of setRows.all()) {
      const data = JSON.parse(row.data);
      if (Array.isArray(data.problems) && data.problems.includes(p.id)) {
        saveSet.run(JSON.stringify({ ...data, problems: data.problems.filter((x) => x !== p.id) }), row.id);
      }
    }
    upsertMeta.run(p.id, 'deleted', p.tags, p.solution, Date.now());
    catalog.reload();
    res.json(detail(catalog.problemMap.get(p.id)));
  });

  /* Khôi phục từ thùng rác (về Nháp, Admin tự thêm lại vào khối). */
  r.post('/problems/:id/restore', (req, res) => {
    const p = find(req, res);
    if (!p) return;
    upsertMeta.run(p.id, p.status === 'deleted' ? 'draft' : p.status, p.tags, p.solution, Date.now());
    catalog.reload();
    res.json(detail(catalog.problemMap.get(p.id)));
  });

  /* Bỏ bản chỉnh trên web, dùng lại đề và test gốc trong repo. */
  r.post('/problems/:id/revert', (req, res) => {
    const p = find(req, res);
    if (!p) return;
    if (!p.overridesRepo) return res.status(400).json({ error: 'Bài này chưa có bản chỉnh sửa' });
    store.remove(p.id);
    catalog.reload();
    res.json(detail(catalog.problemMap.get(p.id)));
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
