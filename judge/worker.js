import http from 'node:http';

import { createRunner, ID_RE } from './judge-runner.js';

/* Dịch vụ chấm bài chạy trong container riêng (không có database, không ra Internet).
 * POST /judge {problemId, source}      → kết quả chấm của judge-cli
 * POST /run   {source, input, timeMs}  → chạy thử với input tự nhập
 * POST /check {source}                 → chỉ kiểm tra cú pháp (gcc -fsyntax-only), không chạy code */
const PORT = Number(process.env.PORT || 4000);
const MAX_BODY_BYTES = 256 * 1024;

const runner = createRunner({
  judgeBin: process.env.JUDGE_BIN || '/app/build/judge-cli',
  problemsDir: process.env.PROBLEMS_DIR || '/problems',
  customDir: process.env.CUSTOM_PROBLEMS_DIR || '/custom-problems',
  workRoot: process.env.WORK_ROOT || '/work',
});

/* Giới hạn số bài chạy cùng lúc (WORKER_CONCURRENCY, mặc định 1). */
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY) || 1);
const waiting = [];
/* Kiểm tra cú pháp nhẹ nên không xếp hàng sau bài chấm, nhưng giới hạn số lượt chạy cùng lúc. */
const MAX_CHECKS = 4;
let checking = 0;
const freeSlots = Array.from({ length: CONCURRENCY }, (_, i) => i);
function enqueue(task) {
  return new Promise((resolve, reject) => {
    waiting.push({ task, resolve, reject });
    pump();
  });
}
function pump() {
  while (freeSlots.length && waiting.length) {
    const slot = freeSlots.shift();
    const { task, resolve, reject } = waiting.shift();
    task(slot)
      .then(resolve, reject)
      .finally(() => {
        freeSlots.push(slot);
        pump();
      });
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const ROUTES = {
  '/judge': ({ problemId, source, origin }) =>
    typeof problemId === 'string' && ID_RE.test(problemId) && typeof source === 'string'
      ? (slot) => runner.judge(problemId, source, { slot, origin: origin === 'custom' ? 'custom' : 'repo' })
      : null,
  '/run': ({ source, input, timeMs, memoryMb }) =>
    typeof source === 'string' && typeof input === 'string'
      ? (slot) => runner.run(source, input, Number(timeMs) || 2000, Number(memoryMb) || 256, slot)
      : null,
  '/check': ({ source }) => (typeof source === 'string' ? () => runner.check(source) : null),
};

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, active: CONCURRENCY - freeSlots.length, waiting: waiting.length });
  }
  const route = ROUTES[req.url];
  if (req.method !== 'POST' || !route) return send(res, 404, { error: 'not found' });

  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY_BYTES) req.destroy();
    else chunks.push(c);
  });
  req.on('end', async () => {
    let task;
    try {
      task = route(JSON.parse(Buffer.concat(chunks).toString('utf8')) ?? {});
    } catch {
      return send(res, 400, { error: 'invalid json' });
    }
    if (!task) return send(res, 400, { error: 'invalid input' });
    if (req.url === '/check') {
      if (checking >= MAX_CHECKS) return send(res, 429, { ok: false, busy: true, log: '' });
      checking += 1;
      try {
        return send(res, 200, await task());
      } finally {
        checking -= 1;
      }
    }
    try {
      send(res, 200, await enqueue(task));
    } catch (e) {
      send(res, 500, { verdict: 'IE', compile_log: String(e) });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Judge worker listening on :${PORT}`));
