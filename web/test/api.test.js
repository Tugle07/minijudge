import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

/* Test tích hợp: chạy server thật (database tạm, judge-cli thật) và gọi API như trình duyệt.
 * Yêu cầu đã build lõi C (make / mingw32-make) trước khi chạy: npm test */
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3900 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
const CODE = 'TEST-CLASS';
const AC_P01 = '#include <stdio.h>\nint main(void){long long a,b;scanf("%lld %lld",&a,&b);printf("%lld\\n",a+b);return 0;}\n';
const WA_P01 = '#include <stdio.h>\nint main(void){long long a,b;scanf("%lld %lld",&a,&b);printf("%lld\\n",a-b);return 0;}\n';

let server;
let dataDir;

function client() {
  let cookie = '';
  return async (url, { method = 'GET', body } = {}) => {
    const res = await fetch(BASE + url, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
}

async function waitVerdict(api, id) {
  for (let i = 0; i < 100; i++) {
    const { data } = await api(`/api/submissions/${id}`);
    if (data.verdict !== 'PENDING') return data;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('judge timeout');
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minijudge-test-'));
  server = spawn(process.execPath, [path.join(WEB, 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, REGISTER_CODE: CODE, BACKUP: '0', JUDGE_URL: '' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => d.toString().includes('MiniJudge web') && resolve());
    server.on('exit', (c) => reject(new Error(`server exited ${c}`)));
  });
});

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise((r) => server.once('exit', r));
    server.kill();
    await exited;
  }
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});

describe('MiniJudge API', () => {
  const api = client();

  test('chưa đăng nhập thì không vào được nội dung', async () => {
    assert.equal((await client()('/api/home')).status, 401);
  });

  test('đăng ký kiểm tra mã lớp và báo lỗi từng trường', async () => {
    const bad = await api('/api/register', { method: 'POST', body: { username: 'x', password: '1', code: 'SAI' } });
    assert.equal(bad.status, 400);
    assert.ok(bad.data.fields.user && bad.data.fields.pw && bad.data.fields.code);
    const ok = await api('/api/register', { method: 'POST', body: { username: 'sv_test', password: 'matkhau-test', code: CODE.toLowerCase() } });
    assert.equal(ok.status, 201);
    const dup = await client()('/api/register', { method: 'POST', body: { username: 'SV_TEST', password: 'matkhau-test', code: CODE } });
    assert.equal(dup.data.fields.user, 'Tên đăng nhập đã tồn tại');
  });

  test('đăng nhập sai mật khẩu bị từ chối', async () => {
    const r = await client()('/api/login', { method: 'POST', body: { username: 'sv_test', password: 'sai-roi' } });
    assert.equal(r.status, 401);
  });

  test('trang chủ, khối bài và đề bài', async () => {
    const home = await api('/api/home');
    assert.equal(home.status, 200);
    assert.ok(home.data.sets.length >= 1);
    const set = await api(`/api/sets/${home.data.sets[0].id}`);
    assert.ok(set.data.problems.length >= 1);
    const p = await api('/api/problems/P01');
    assert.equal(p.data.id, 'P01');
    assert.ok(p.data.samples.length >= 1 && p.data.statement.length > 0);
    assert.equal((await api('/api/problems/..%2Fetc')).status, 404);
  });

  test('nộp bài đúng được AC và tính vào số bài đã giải', async () => {
    const { status, data } = await api('/api/submissions', { method: 'POST', body: { problemId: 'P01', source: AC_P01 } });
    assert.equal(status, 201);
    const sub = await waitVerdict(api, data.id);
    assert.equal(sub.verdict, 'AC');
    assert.equal(sub.testsPassed, sub.testCount);
    const home = await api('/api/home');
    assert.equal(home.data.summary.solved, 1);
  });

  test('sai ở test ví dụ thì thấy đáp án và output của mình', async () => {
    const { data } = await api('/api/submissions', { method: 'POST', body: { problemId: 'P01', source: WA_P01 } });
    const sub = await waitVerdict(api, data.id);
    assert.equal(sub.verdict, 'WA');
    assert.equal(sub.failSample.test, 1);
    assert.equal(sub.failSample.expected.trim(), '3');
    assert.equal(sub.failSample.output.trim(), '-1');
  });

  test('chạy thử với input tự nhập', async () => {
    const { data } = await api('/api/run', { method: 'POST', body: { problemId: 'P01', source: AC_P01, input: '40 2' } });
    assert.equal(data.verdict, 'OK');
    assert.equal(data.output.trim(), '42');
    const ce = await api('/api/run', { method: 'POST', body: { source: 'int main( {', input: '' } });
    assert.equal(ce.data.verdict, 'CE');
  });

  test('kiểm tra cú pháp khi đang gõ', async () => {
    const bad = await api('/api/check', { method: 'POST', body: { source: 'int main(void) {\n    int n\n    return 0;\n}\n' } });
    assert.equal(bad.data.ok, false);
    assert.match(bad.data.log, /main\.c:3:\d+: error: expected/);
    assert.doesNotMatch(bad.data.log, /[\\/]work[\\/]/);
    const good = await api('/api/check', { method: 'POST', body: { source: AC_P01 } });
    assert.equal(good.data.ok, true);
  });

  test('health công khai, có header bảo mật', async () => {
    const res = await fetch(`${BASE}/api/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    const page = await fetch(`${BASE}/`);
    const csp = page.headers.get('content-security-policy');
    assert.match(csp, /script-src 'self' https:\/\/cdn\.jsdelivr\.net 'sha256-/);
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
  });

  test('hồ sơ cá nhân và đổi mật khẩu', async () => {
    const p = await api('/api/me/profile');
    assert.equal(p.data.username, 'sv_test');
    assert.equal(p.data.solved, 1);
    assert.equal(p.data.activity.length, 182);
    assert.ok(p.data.activity[181] >= 2);
    assert.equal(p.data.activeDays, 1);
    assert.ok(p.data.bestDay.count >= 2);
    assert.equal(p.data.recent[0].problemId, 'P01');
    assert.ok(p.data.unsolved.every((s) => s.problemId !== 'P01'));
    assert.deepEqual(p.data.contests, []);
    const wrong = await api('/api/me/password', { method: 'POST', body: { current: 'sai', next: 'matkhau-moi' } });
    assert.equal(wrong.data.fields.current, 'Mật khẩu hiện tại không đúng');
    const ok = await api('/api/me/password', { method: 'POST', body: { current: 'matkhau-test', next: 'matkhau-moi' } });
    assert.equal(ok.status, 200);
    assert.equal((await api('/api/me')).data.user.username, 'sv_test');
    assert.equal((await client()('/api/login', { method: 'POST', body: { username: 'sv_test', password: 'matkhau-test' } })).status, 401);
    assert.equal((await client()('/api/login', { method: 'POST', body: { username: 'sv_test', password: 'matkhau-moi' } })).status, 200);
  });

  test('chỉ xem được bài nộp của chính mình', async () => {
    const other = client();
    await other('/api/register', { method: 'POST', body: { username: 'sv_khac', password: 'matkhau-test', code: CODE } });
    const mine = await api('/api/submissions');
    assert.equal((await other(`/api/submissions/${mine.data[0].id}`)).status, 404);
    assert.equal((await other('/api/submissions')).data.length, 0);
  });
});
