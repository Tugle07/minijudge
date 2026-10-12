const JUDGE_TIMEOUT_MS = 120_000;

/* Kết nối tới judge: có judgeUrl (khi deploy) thì gọi container judge qua HTTP,
 * không có (khi dev trên máy) thì gọi judge-cli tại chỗ qua judge/judge-runner.js. */
export async function createJudgeClient({ judgeUrl, judgeBin, problemsDir, customDir, workRoot }) {
  if (judgeUrl) {
    const base = judgeUrl.replace(/\/judge\/?$/, '');
    const post = async (route, body) => {
      const res = await fetch(base + route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(JUDGE_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`judge worker HTTP ${res.status}`);
      return res.json();
    };
    return {
      judge: (problemId, source, { origin } = {}) => post('/judge', { problemId, source, origin }),
      run: (source, input, timeMs, memoryMb) => post('/run', { source, input, timeMs, memoryMb }),
      check: (source) => post('/check', { source }),
      health: async () => {
        const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
        return res.ok ? res.json() : { ok: false };
      },
    };
  }
  const { createRunner } = await import('../../judge/judge-runner.js');
  return createRunner({ judgeBin, problemsDir, customDir, workRoot });
}

/* Hàng đợi chấm: chạy tối đa `concurrency` bài cùng lúc (mặc định 1). Thời gian đo là CPU time
 * nên chấm song song không làm sai kết quả, chỉ cần máy đủ nhân. */
export function createJudgeQueue({ db, client, concurrency = 1, originOf = () => 'repo' }) {
  const queue = [];
  let running = 0;

  const getSubmission = db.prepare('SELECT id, problem_id, source FROM submissions WHERE id = ?');
  const saveResult = db.prepare(`
    UPDATE submissions
    SET verdict = ?, time_ms = ?, memory_kb = ?, tests_passed = ?, test_count = ?, tests_json = ?, compile_log = ?, fail_output = ?
    WHERE id = ?`);

  async function processNext() {
    if (running >= concurrency || queue.length === 0) return;
    running += 1;
    const id = queue.shift();
    try {
      const sub = getSubmission.get(id);
      if (sub) {
        const r = await client.judge(sub.problem_id, sub.source, { origin: originOf(sub.problem_id) });
        saveResult.run(
          r.verdict ?? 'IE',
          r.time_ms ?? 0,
          r.memory_kb ?? 0,
          r.tests_passed ?? 0,
          r.test_count ?? 0,
          JSON.stringify(r.tests ?? []),
          r.compile_log ?? '',
          r.fail_output ?? null,
          id,
        );
      }
    } catch (e) {
      console.error(`Judge #${id} failed:`, e);
      saveResult.run('IE', 0, 0, 0, 0, '[]', String(e), null, id);
    } finally {
      running -= 1;
      processNext();
    }
  }

  return {
    push(id) {
      queue.push(id);
      processNext();
    },
    get pending() {
      return queue.length + running;
    },
  };
}
