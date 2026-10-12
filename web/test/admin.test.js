import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

/* Test tích hợp khu Admin: tạo bài trên web → thêm test → kiểm tra lời giải → xuất bản → đưa vào khối
 * → sinh viên nộp được; chấm lại, khóa tài khoản, đặt lại mật khẩu, cài đặt đăng ký. */
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4400 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
const DOUBLE = '#include <stdio.h>\nint main(void){long long x;scanf("%lld",&x);printf("%lld\\n",2*x);return 0;}\n';

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
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minijudge-admin-'));
  server = spawn(process.execPath, [path.join(WEB, 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, REGISTER_CODE: 'LOP-A', ADMIN_USERS: 'thay_giao', BACKUP: '0', JUDGE_URL: '' },
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

describe('Admin', () => {
  const admin = client();
  const student = client();

  test('ADMIN_USERS được cấp quyền Admin, sinh viên thì không', async () => {
    const a = await admin('/api/register', { method: 'POST', body: { username: 'thay_giao', password: 'matkhau-admin', code: 'LOP-A' } });
    assert.equal(a.data.role, 'admin');
    const s = await student('/api/register', { method: 'POST', body: { username: 'sv_a', password: 'matkhau-sv', code: 'LOP-A' } });
    assert.equal(s.data.role, 'student');
    assert.equal((await student('/api/admin/dashboard')).status, 403);
    const dash = await admin('/api/admin/dashboard?range=7d');
    assert.equal(dash.status, 200);
    assert.equal(dash.data.series.vals.length, 7);
    assert.equal(dash.data.judge.ok, true);
  });

  test('tạo bài trên web, thêm test, kiểm tra lời giải, xuất bản', async () => {
    const created = await admin('/api/admin/problems', { method: 'POST', body: { id: 'x99' } });
    assert.equal(created.status, 201);
    assert.equal(created.data.status, 'draft');
    assert.equal((await admin('/api/admin/problems/X99', { method: 'PUT', body: { title: 'Gấp đôi', status: 'pub' } })).status, 400);

    const files = [
      { name: '1.in', content: '3\n' }, { name: '1.out', content: '6\n' },
      { name: '2.in', content: '-5\n' }, { name: '2.out', content: '-10\n' },
      { name: 'le.in', content: 'mồ côi\n' },
    ];
    const up = await admin('/api/admin/problems/X99/tests', { method: 'POST', body: { files } });
    assert.equal(up.data.added, 2);
    const reordered = await admin('/api/admin/problems/X99/tests', { method: 'PUT', body: { order: [2, 1], samples: [1] } });
    assert.deepEqual(reordered.data.tests.map((t) => [t.input.trim(), t.sample]), [['-5', false], ['3', true]]);

    const check = await admin('/api/admin/problems/X99/check', { method: 'POST', body: { source: DOUBLE } });
    assert.equal(check.data.verdict, 'AC');
    const pub = await admin('/api/admin/problems/X99', {
      method: 'PUT',
      body: { title: 'Gấp đôi', statement: 'In ra $2x$.', difficulty: 'Dễ', timeMs: 1000, memoryMb: 128, solution: DOUBLE, status: 'pub' },
    });
    assert.equal(pub.data.status, 'pub');
    assert.equal(pub.data.tests[1].sample, true);
  });

  test('bài chưa vào khối thì sinh viên không thấy; vào khối công khai thì nộp được', async () => {
    assert.equal((await student('/api/problems/X99')).status, 404);
    const saved = await admin('/api/admin/sets/new', { method: 'PUT', body: { title: 'Tuần 9 — Thử', status: 'open', problems: ['X99', 'P01'] } });
    assert.equal(saved.status, 200);
    const home = await student('/api/home');
    assert.ok(home.data.sets.some((s) => s.id === saved.data.id));
    const p = await student('/api/problems/X99');
    assert.equal(p.data.samples[0].output, '6');
    const { data } = await student('/api/submissions', { method: 'POST', body: { problemId: 'X99', source: DOUBLE } });
    assert.equal((await waitVerdict(student, data.id)).verdict, 'AC');

    await admin(`/api/admin/sets/${saved.data.id}/status`, { method: 'PATCH', body: { status: 'hidden' } });
    assert.equal((await student(`/api/sets/${saved.data.id}`)).status, 404);
  });

  test('danh sách bài nộp, chấm lại', async () => {
    const list = await admin('/api/admin/submissions?user=sv_a');
    assert.equal(list.data.total, 1);
    const id = list.data.rows[0].id;
    const rj = await admin('/api/admin/rejudge', { method: 'POST', body: { ids: [id] } });
    assert.equal(rj.data.queued, 1);
    for (let i = 0; i < 100; i++) {
      const d = await admin(`/api/admin/submissions/${id}`);
      if (d.data.verdict !== 'PENDING') return assert.equal(d.data.verdict, 'AC');
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.fail('rejudge timeout');
  });

  test('khóa tài khoản, đặt lại mật khẩu, tắt đăng ký', async () => {
    const users = (await admin('/api/admin/users')).data;
    const sv = users.find((u) => u.username === 'sv_a');
    assert.equal(sv.solved, 1);
    await admin(`/api/admin/users/${sv.id}`, { method: 'PATCH', body: { locked: true } });
    assert.equal((await student('/api/home')).status, 401);
    assert.equal((await client()('/api/login', { method: 'POST', body: { username: 'sv_a', password: 'matkhau-sv' } })).status, 403);
    await admin(`/api/admin/users/${sv.id}`, { method: 'PATCH', body: { locked: false } });
    const { tempPassword } = (await admin(`/api/admin/users/${sv.id}/reset-password`, { method: 'POST' })).data;
    assert.equal((await client()('/api/login', { method: 'POST', body: { username: 'sv_a', password: tempPassword } })).status, 200);

    const me = users.find((u) => u.username === 'thay_giao');
    assert.equal((await admin(`/api/admin/users/${me.id}`, { method: 'PATCH', body: { role: 'student' } })).status, 400);

    await admin('/api/admin/settings', { method: 'PUT', body: { allowRegister: false, banner: 'Nghỉ lễ' } });
    const cfg = (await client()('/api/config')).data;
    assert.equal(cfg.allowRegister, false);
    assert.equal(cfg.banner, 'Nghỉ lễ');
    assert.equal((await client()('/api/register', { method: 'POST', body: { username: 'sv_b', password: 'matkhau-sv', code: 'LOP-A' } })).status, 403);
  });
});
