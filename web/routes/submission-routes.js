import { Router } from 'express';

const MAX_SOURCE_BYTES = 64 * 1024;
const PAGE_SIZE = 100;

const MAX_INPUT_BYTES = 64 * 1024;

/* Nếu bài sai (WA) đúng ở một test ví dụ thì cho xem input / đáp án / output của mình.
 * Test ẩn thì không trả gì để không lộ test. */
function failedSample(row, problem) {
  if (row.verdict !== 'WA' || !problem || row.fail_output == null) return null;
  const testNo = (row.tests_passed ?? 0) + 1;
  const k = problem.sampleTests.indexOf(testNo);
  if (k < 0) return null;
  return { test: testNo, input: problem.samples[k].input, expected: problem.samples[k].output, output: row.fail_output };
}

export function submissionRoutes({ db, catalog, stats, auth, queue, judge, submitLimit, runLimit, checkLimit }) {
  const r = Router();
  r.use(auth.requireUser);

  /* Kiểm tra cú pháp khi đang gõ: chỉ chạy gcc -fsyntax-only, không chạy chương trình. */
  r.post('/check', checkLimit, async (req, res) => {
    const { source } = req.body ?? {};
    if (typeof source !== 'string' || Buffer.byteLength(source) > MAX_SOURCE_BYTES) return res.status(400).json({ error: 'Mã nguồn không hợp lệ' });
    if (!judge.check) return res.json({ ok: true, log: '' });
    try {
      const { ok, log } = await judge.check(source);
      res.json({ ok: Boolean(ok), log: log || '' });
    } catch {
      res.json({ ok: false, log: '', busy: true });
    }
  });

  r.post('/run', runLimit, async (req, res) => {
    const { problemId, source, input } = req.body ?? {};
    if (typeof source !== 'string' || !source.trim()) return res.status(400).json({ error: 'Mã nguồn trống' });
    if (Buffer.byteLength(source) > MAX_SOURCE_BYTES) return res.status(400).json({ error: 'Mã nguồn tối đa 64KB' });
    if (typeof input !== 'string' || Buffer.byteLength(input) > MAX_INPUT_BYTES) {
      return res.status(400).json({ error: 'Input tối đa 64KB' });
    }
    const p = catalog.problemMap.get(problemId);
    try {
      const result = await judge.run(source, input.endsWith('\n') ? input : `${input}\n`, p?.timeMs ?? 2000, p?.memoryMb ?? 256);
      res.json(result);
    } catch (e) {
      console.error('Custom run failed:', e);
      res.status(503).json({ error: 'Hệ thống chấm đang bận, thử lại sau ít giây' });
    }
  });

  r.post('/submissions', submitLimit, (req, res) => {
    const { problemId, source } = req.body ?? {};
    const problem = catalog.problemMap.get(problemId);
    if (!problem || (req.user.role !== 'admin' && !catalog.isProblemVisible(problem))) {
      return res.status(400).json({ error: 'Mã đề không hợp lệ' });
    }
    if (typeof source !== 'string' || !source.trim()) return res.status(400).json({ error: 'Mã nguồn trống' });
    if (Buffer.byteLength(source) > MAX_SOURCE_BYTES) return res.status(400).json({ error: 'Mã nguồn tối đa 64KB' });

    const pending = db
      .prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND verdict = 'PENDING'")
      .get(req.user.id).n;
    if (pending > 0) return res.status(429).json({ error: 'Bạn đang có bài chờ chấm, đợi xong rồi nộp tiếp nhé' });

    const { lastInsertRowid } = db
      .prepare('INSERT INTO submissions (user_id, problem_id, source, created_at) VALUES (?, ?, ?, ?)')
      .run(req.user.id, problemId, source, Date.now());
    const id = Number(lastInsertRowid);
    queue.push(id);
    res.status(201).json({ id });
  });

  /* Chỉ trả bài nộp của chính mình; ?problem=P02 để lọc theo bài. */
  r.get('/submissions', (req, res) => {
    const problem = typeof req.query.problem === 'string' ? req.query.problem : null;
    const rows = db
      .prepare(
        `SELECT id, problem_id, verdict, time_ms, memory_kb, tests_passed, test_count, created_at
         FROM submissions WHERE user_id = ? ${problem ? 'AND problem_id = ?' : ''}
         ORDER BY id DESC LIMIT ${PAGE_SIZE}`,
      )
      .all(...(problem ? [req.user.id, problem] : [req.user.id]));
    res.json(rows.map((s) => ({ ...s, title: catalog.problemMap.get(s.problem_id)?.title ?? s.problem_id })));
  });

  r.get('/submissions/:id', (req, res) => {
    const row = db
      .prepare('SELECT * FROM submissions WHERE id = ? AND user_id = ?')
      .get(Number(req.params.id), req.user.id);
    if (!row) return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
    res.json({
      id: row.id,
      problemId: row.problem_id,
      verdict: row.verdict,
      timeMs: row.time_ms,
      memoryKb: row.memory_kb,
      testsPassed: row.tests_passed,
      testCount: row.test_count,
      tests: row.tests_json ? JSON.parse(row.tests_json) : [],
      compileLog: row.compile_log,
      failSample: failedSample(row, catalog.problemMap.get(row.problem_id)),
      source: row.source,
      createdAt: row.created_at,
    });
  });

  r.get('/leaderboard', (req, res) => {
    const rows = stats.leaderboard();
    const visible = catalog.visibleSets();
    const setId = visible.some((s) => s.id === req.query.set) ? req.query.set : null;
    const { sorted } = stats.rankOf(rows, req.user.username, setId);
    res.json({
      sets: visible.map((s) => ({ id: s.id, short: s.short, status: s.status, count: catalog.visibleProblems(s).length })),
      setId,
      rows: sorted.map((r) => ({
        username: r.username,
        total: r.total,
        perSet: r.perSet,
        lastAcAt: setId ? r.setLastAcAt[setId] || 0 : r.lastAcAt,
      })),
    });
  });

  return r;
}
