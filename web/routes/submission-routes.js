import { Router } from 'express';

const MAX_SOURCE_BYTES = 64 * 1024;
const PAGE_SIZE = 100;

const MAX_INPUT_BYTES = 64 * 1024;

export function normalizeLang(rawLang) {
  const s = String(rawLang || '').trim().toLowerCase();
  if (s === 'cpp14' || s === 'c++14') return 'cpp14';
  if (s === 'cpp' || s === 'cpp17' || s === 'c++' || s === 'c++17') return 'cpp';
  if (s === 'pypy' || s === 'pypy3') return 'pypy3';
  if (s === 'py' || s === 'py3' || s === 'python' || s === 'python3') return 'py';
  return 'c';
}

/* Nếu bài sai (WA) đúng ở một test ví dụ thì cho xem input / đáp án / output của mình.
 * Test ẩn thì không trả gì để không lộ test. */
function failedSample(row, problem) {
  if (row.verdict !== 'WA' || !problem || row.fail_output == null) return null;
  /* Web chấm hết mọi test (--all), nên tests_passed không cho biết test sai đầu tiên. fail_output là output của test WA đầu tiên. */
  const tests = row.tests_json ? JSON.parse(row.tests_json) : [];
  const testNo = tests.findIndex((t) => t.verdict === 'WA') + 1;
  const k = problem.sampleTests.indexOf(testNo);
  if (k < 0) return null;
  return { test: testNo, input: problem.samples[k].input, expected: problem.samples[k].output, output: row.fail_output };
}

export function submissionRoutes({ db, catalog, stats, auth, queue, judge, settings, submitLimit, runLimit, checkLimit }) {
  const r = Router();
  r.use(auth.requireUser);

  /* Kiểm tra cú pháp khi đang gõ: gcc/g++ -fsyntax-only hoặc python/pypy3 -m py_compile. */
  r.post('/check', checkLimit, async (req, res) => {
    const { source, lang: rawLang } = req.body ?? {};
    if (typeof source !== 'string' || Buffer.byteLength(source) > MAX_SOURCE_BYTES) return res.status(400).json({ error: 'Mã nguồn không hợp lệ' });
    if (!judge.check) return res.json({ ok: true, log: '' });
    const allowed = settings?.allowedLangs || ['c'];
    const requested = normalizeLang(rawLang);
    const lang = allowed.includes(requested) ? requested : (allowed[0] || 'c');
    try {
      const { ok, log } = await judge.check(source, lang);
      res.json({ ok: Boolean(ok), log: log || '' });
    } catch {
      res.json({ ok: false, log: '', busy: true });
    }
  });

  r.post('/run', runLimit, async (req, res) => {
    const { source, input, lang: rawLang } = req.body ?? {};
    const problemId = req.body?.problemId || req.body?.problem_id;
    if (typeof source !== 'string' || !source.trim()) return res.status(400).json({ error: 'Mã nguồn trống' });
    if (Buffer.byteLength(source) > MAX_SOURCE_BYTES) return res.status(400).json({ error: 'Mã nguồn tối đa 64KB' });
    if (typeof input !== 'string' || Buffer.byteLength(input) > MAX_INPUT_BYTES) {
      return res.status(400).json({ error: 'Input tối đa 64KB' });
    }
    const allowed = settings?.allowedLangs || ['c'];
    const requested = normalizeLang(rawLang);
    if (!allowed.includes(requested)) {
      return res.status(400).json({ error: `Ngôn ngữ ${requested.toUpperCase()} hiện chưa được bật trên hệ thống` });
    }
    const lang = requested;
    const coursesMeta = (() => {
      try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'course_meta'").get();
        return row && row.value ? JSON.parse(row.value) : {};
      } catch {
        return {};
      }
    })();
    const p = problemId ? catalog.problemMap.get(problemId) : null;
    if (problemId && (!p || !catalog.canAccessProblem(p, req.user, coursesMeta))) {
      return res.status(403).json({ error: 'Bạn không có quyền chạy thử bài tập này' });
    }
    try {
      const result = await judge.run(source, input.endsWith('\n') ? input : `${input}\n`, p?.timeMs ?? 2000, p?.memoryMb ?? 256, lang);
      res.json(result);
    } catch (e) {
      console.error('Custom run failed:', e);
      res.status(503).json({ error: 'Hệ thống chấm đang bận, thử lại sau ít giây' });
    }
  });

  r.post('/submissions', submitLimit, (req, res) => {
    const { source, lang: rawLang } = req.body ?? {};
    const problemId = req.body?.problemId || req.body?.problem_id;
    const coursesMeta = (() => {
      try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'course_meta'").get();
        return row && row.value ? JSON.parse(row.value) : {};
      } catch {
        return {};
      }
    })();
    const problem = catalog.problemMap.get(problemId);
    if (!problem || !catalog.canAccessProblem(problem, req.user, coursesMeta)) {
      return res.status(403).json({ error: 'Bạn không có quyền nộp bài tập này' });
    }
    if (typeof source !== 'string' || !source.trim()) return res.status(400).json({ error: 'Mã nguồn trống' });
    if (Buffer.byteLength(source) > MAX_SOURCE_BYTES) return res.status(400).json({ error: 'Mã nguồn tối đa 64KB' });

    const allowed = settings?.allowedLangs || ['c'];
    const requested = normalizeLang(rawLang);
    if (!allowed.includes(requested)) {
      return res.status(400).json({ error: `Ngôn ngữ ${requested.toUpperCase()} hiện chưa được bật trên hệ thống` });
    }
    const lang = requested;

    const pending = db
      .prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND verdict = 'PENDING'")
      .get(req.user.id).n;
    if (pending > 0) return res.status(429).json({ error: 'Bạn đang có bài chờ chấm, đợi xong rồi nộp tiếp nhé' });

    const { lastInsertRowid } = db
      .prepare('INSERT INTO submissions (user_id, problem_id, source, lang, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, problemId, source, lang, Date.now());
    const id = Number(lastInsertRowid);
    stats.recordProblemView?.(req.user.id, problemId);
    queue.push(id);
    res.status(201).json({ id });
  });

  /* Chỉ trả bài nộp của chính mình; ?problem=P02 để lọc theo bài. */
  r.get('/submissions', (req, res) => {
    const problem = typeof req.query.problem === 'string' ? req.query.problem : null;
    const rows = db
      .prepare(
        `SELECT id, problem_id, verdict, time_ms, memory_kb, tests_passed, test_count, COALESCE(lang, 'c') AS lang, created_at
         FROM submissions WHERE user_id = ? AND contest_id IS NULL ${problem ? 'AND problem_id = ?' : ''}
         ORDER BY id DESC LIMIT ${PAGE_SIZE}`,
      )
      .all(...(problem ? [req.user.id, problem] : [req.user.id]));
    res.json(rows.map((s) => ({ ...s, title: catalog.problemMap.get(s.problem_id)?.title ?? s.problem_id })));
  });

  r.get('/submissions/:id', (req, res) => {
    const row = db
      .prepare('SELECT * FROM submissions WHERE id = ? AND user_id = ? AND contest_id IS NULL')
      .get(Number(req.params.id), req.user.id);
    if (!row) return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
    res.json({
      id: row.id,
      problemId: row.problem_id,
      verdict: row.verdict,
      lang: row.lang || 'c',
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

  return r;
}
