import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { countIncidents, deviceOf, parseTests, scoreTests, similarity } from '../lib/contests.js';

/* Test tích hợp chế độ thi: tạo cuộc thi + subtask → thí sinh vào phòng bằng mã → nộp bài chấm đủ test →
 * điểm subtask, khóa luyện tập trong giờ thi, chỉ một phiên/thiết bị, giám sát, bảng điểm, so code giống nhau. */
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4900 + Math.floor(Math.random() * 150); /* tránh 5060/5061: fetch chặn cổng SIP */
const BASE = `http://127.0.0.1:${PORT}`;
const AC_P01 = '#include <stdio.h>\nint main(void){long long a,b;scanf("%lld %lld",&a,&b);printf("%lld\\n",a+b);return 0;}\n';
/* Sai đúng test 1 (a = 1), đúng test 2 và 3. */
const PARTIAL_P01 = '#include <stdio.h>\nint main(void){long long a,b;scanf("%lld %lld",&a,&b);if(a==1)printf("0\\n");else printf("%lld\\n",a+b);return 0;}\n';

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
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data };
  };
}

async function waitScore(api, contestId, subId) {
  for (let i = 0; i < 150; i++) {
    const { data } = await api(`/api/contests/${contestId}/submissions/${subId}`);
    if (data.verdict && data.verdict !== 'PENDING' && data.score != null) return data;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('judge timeout');
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minijudge-contest-'));
  server = spawn(process.execPath, [path.join(WEB, 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, REGISTER_CODE: 'LOP', ADMIN_USERS: 'giam_thi', BACKUP: '0', JUDGE_URL: '' },
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

describe('Hàm tính điểm', () => {
  test('parseTests đọc dải test và chặn test vượt quá', () => {
    assert.deepEqual(parseTests('1-3, 5', 6), [1, 2, 3, 5]);
    assert.equal(parseTests('1-9', 6), null);
    assert.equal(parseTests('a', 6), null);
  });
  test('subtask chỉ được điểm khi đúng hết test của nó', () => {
    const tests = [{ verdict: 'WA' }, { verdict: 'AC' }, { verdict: 'AC' }];
    const { score, detail } = scoreTests([{ name: 'S1', tests: '1-2', points: 40 }, { name: 'S2', tests: '3', points: 60 }], tests, 'WA');
    assert.equal(score, 60);
    assert.deepEqual(detail.map((d) => d.got), [0, 60]);
    assert.equal(scoreTests([{ name: 'S', tests: '1', points: 10 }], [], 'CE').score, 0);
  });
  test('đổi tên biến và khoảng trắng vẫn bị coi là giống nhau', () => {
    const a = 'int main(){int tong=0;for(int i=0;i<10;i++){tong+=i;}printf("%d",tong);return 0;}';
    const b = 'int main()\n{\n  int sum = 0; // cộng dồn\n  for (int k = 0; k < 10; k++) { sum += k; }\n  printf("%d", sum);\n  return 0;\n}';
    assert.ok(similarity(a, b) > 0.9);
    assert.ok(similarity(a, 'int main(){char s[100];scanf("%s",s);puts(s);}') < 0.3);
  });
});

describe('Đếm lần vi phạm và nhận diện thiết bị', () => {
  const ev = (type, sec) => ({ type, at: sec * 1000 });
  test('một lần Alt+Tab sinh 3 tín hiệu chỉ tính 1 lần', () => {
    assert.equal(countIncidents([ev('fullscreen_exit', 10), ev('tab_hidden', 10.2), ev('blur', 11), ev('tab_visible', 20)]), 1);
  });
  test('rời, quay lại, rồi rời lần nữa tính 2 lần', () => {
    assert.equal(countIncidents([ev('tab_hidden', 10), ev('tab_visible', 15), ev('blur', 40), ev('tab_visible', 45)]), 2);
  });
  test('bản cũ báo "đổi cửa sổ" ngay sau lúc quay lại vẫn thuộc lần rời trước', () => {
    assert.equal(countIncidents([ev('tab_hidden', 10), ev('tab_visible', 14), ev('blur', 14.1)]), 1);
  });
  test('sự kiện không phải vi phạm không được đếm', () => {
    assert.equal(countIncidents([ev('join', 1), ev('context_menu', 5), ev('finish', 9)]), 0);
  });
  test('nhận diện điện thoại, máy tính bảng, máy tính', () => {
    assert.equal(deviceOf('Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36'), 'mobile');
    assert.equal(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'), 'mobile');
    assert.equal(deviceOf('Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/129.0 Safari/537.36'), 'tablet');
    assert.equal(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'), 'desktop');
  });
});

describe('Cuộc thi', () => {
  const admin = client();
  const sv1 = client();
  const sv1b = client();
  const sv2 = client();
  let cid;

  test('Admin tạo cuộc thi, chia subtask, xuất bản', async () => {
    await admin('/api/register', { method: 'POST', body: { username: 'giam_thi', password: 'matkhau-gt', code: 'LOP' } });
    for (const [c, u] of [[sv1, 'sv_mot'], [sv2, 'sv_hai']]) {
      const r = await c('/api/register', { method: 'POST', body: { username: u, password: 'matkhau-sv', code: 'LOP' } });
      assert.equal(r.status, 201);
    }
    assert.equal((await sv1b('/api/login', { method: 'POST', body: { username: 'sv_mot', password: 'matkhau-sv' } })).status, 200);

    const now = Date.now();
    const created = await admin('/api/admin/contests', {
      method: 'POST',
      body: { title: 'Kiểm tra giữa kỳ', startAt: now - 60_000, endAt: now + 3_600_000, settings: { code: 'phong-a1' } },
    });
    assert.equal(created.status, 201);
    cid = created.data.id;

    const bad = await admin(`/api/admin/contests/${cid}/problems`, {
      method: 'PUT', body: { problems: [{ problemId: 'P01', subtasks: [{ name: 'X', tests: '1-99', points: 10 }] }] },
    });
    assert.equal(bad.status, 400);
    const set = await admin(`/api/admin/contests/${cid}/problems`, {
      method: 'PUT',
      body: { problems: [{ problemId: 'P01', subtasks: [{ name: 'Ví dụ', tests: '1-2', points: 40 }, { name: 'Còn lại', tests: '3-12', points: 60 }] }] },
    });
    assert.equal(set.status, 200);
    assert.equal(set.data.problems[0].label, 'A');
    assert.equal(set.data.problems[0].points, 100);

    assert.equal((await sv1('/api/contests')).data.contests.length, 0, 'cuộc thi nháp không hiện với sinh viên');
    assert.equal((await admin(`/api/admin/contests/${cid}`, { method: 'PUT', body: { status: 'published' } })).status, 200);
    const list = await sv1('/api/contests');
    assert.equal(list.data.contests[0].phase, 'running');
    assert.equal(list.data.contests[0].needCode, true);
  });

  test('Subtask mặc định của bài: điền sẵn khi thêm vào cuộc thi, Admin chỉnh và khôi phục được', async () => {
    const p13 = (await admin('/api/admin/problems/P13')).data;
    assert.equal(p13.subtasksSource, 'file');
    assert.deepEqual(p13.subtasks.map((x) => x.name), ['Ví dụ trong đề', 'Dữ liệu nhỏ', 'Trường hợp đặc biệt', 'Dữ liệu lớn']);
    assert.equal(p13.subtasks.reduce((t, x) => t + x.points, 0), 100);

    const tmp = (await admin('/api/admin/contests', { method: 'POST', body: { title: 'Thử subtask', startAt: Date.now() + 3_600_000, endAt: Date.now() + 7_200_000 } })).data;
    const put = await admin(`/api/admin/contests/${tmp.id}/problems`, { method: 'PUT', body: { problems: [{ problemId: 'P13' }] } });
    assert.equal(put.status, 200);
    assert.deepEqual(put.data.problems[0].subtasks.map((x) => x.tests), p13.subtasks.map((x) => x.tests), 'không truyền subtask thì lấy bộ mặc định của bài');
    assert.ok(put.data.problems[0].subtasks[2].note, 'giữ cả mô tả subtask');

    assert.equal((await admin('/api/admin/problems/P13/subtasks', { method: 'PUT', body: { subtasks: [{ name: 'X', tests: '1-99', points: 100 }] } })).status, 400);
    const own = await admin('/api/admin/problems/P13/subtasks', { method: 'PUT', body: { subtasks: [{ name: 'Tất cả', tests: `1-${p13.testCount}`, points: 100 }] } });
    assert.equal(own.status, 200);
    assert.equal(own.data.subtasksSource, 'admin');
    assert.equal((await admin('/api/admin/problems/P13/subtasks', { method: 'PUT', body: { reset: true } })).data.subtasksSource, 'file');
    assert.equal((await admin(`/api/admin/contests/${tmp.id}`, { method: 'DELETE' })).status, 200);
  });

  test('Bài thi bị ẩn khỏi luyện tập; vào phòng cần đúng mã', async () => {
    assert.equal((await sv1('/api/problems/P01')).status, 404);
    const wrong = await sv1(`/api/contests/${cid}/join`, { method: 'POST', body: { code: 'sai' } });
    assert.equal(wrong.status, 400);
    const multi = await sv1(`/api/contests/${cid}/join`, { method: 'POST', body: { code: 'PHONG-A1', extended: true } });
    assert.equal(multi.data.code, 'multi_screen');
    assert.equal((await sv1(`/api/contests/${cid}/join`, { method: 'POST', body: { code: 'PHONG-A1' } })).status, 200);
    assert.equal((await sv2(`/api/contests/${cid}/join`, { method: 'POST', body: { code: 'phong-a1' } })).status, 200);
  });

  test('Trong giờ thi: khóa luyện tập, chỉ một phiên được làm bài', async () => {
    const locked = await sv1('/api/home');
    assert.equal(locked.status, 423);
    assert.equal(locked.data.contestId, cid);
    const other = await sv1b(`/api/contests/${cid}/join`, { method: 'POST', body: { code: 'PHONG-A1' } });
    assert.equal(other.status, 423, 'phiên thứ hai bị chặn');
    assert.equal((await sv1b(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: 'A', source: AC_P01 } })).status, 423);
    const info = await sv1(`/api/contests/${cid}`);
    assert.equal(info.data.problems[0].label, 'A');
    const prob = await sv1(`/api/contests/${cid}/problems/A`);
    assert.equal(prob.status, 200);
    assert.ok(prob.data.statement.length > 0);
    assert.equal(prob.data.subtasks.length, 2);
  });

  test('Chấm đủ test và tính điểm theo subtask', async () => {
    const s1 = await sv1(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: 'A', source: PARTIAL_P01 } });
    assert.equal(s1.status, 201);
    const r1 = await waitScore(sv1, cid, s1.data.id);
    assert.equal(r1.verdict, 'WA');
    /* PARTIAL_P01 chỉ sai khi a = 1, tức test 1; chạy hết 12 test chứ không dừng ở test sai đầu tiên */
    assert.equal(r1.testsPassed, 11, 'chạy hết test chứ không dừng ở test sai đầu tiên');
    assert.equal(r1.score, 60);
    assert.deepEqual(r1.subtasks.map((s) => s.got), [0, 60]);

    const s2 = await sv2(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: 'A', source: AC_P01 } });
    assert.equal((await waitScore(sv2, cid, s2.data.id)).score, 100);
    const s3 = await sv1(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: 'A', source: AC_P01.replace('a+b', 'b+a') } });
    assert.equal((await waitScore(sv1, cid, s3.data.id)).score, 100);
    assert.equal((await sv1('/api/submissions')).status, 423, 'lịch sử luyện tập vẫn bị khóa');
  });

  test('Giám sát, mở khóa, bảng điểm, xuất CSV, so code', async () => {
    assert.equal((await sv1(`/api/contests/${cid}/heartbeat`, { method: 'POST', body: { fullscreen: true, visible: true } })).status, 200);
    assert.equal((await sv1(`/api/contests/${cid}/events`, { method: 'POST', body: { type: 'tab_hidden', detail: '5 giây' } })).status, 204);
    assert.equal((await sv1(`/api/contests/${cid}/events`, { method: 'POST', body: { type: 'hack' } })).status, 400);
    for (const type of ['finish', 'rejoin', 'join', 'multi_screen']) {
      assert.equal((await sv1(`/api/contests/${cid}/events`, { method: 'POST', body: { type, detail: 'Giám thị admin mở khóa' } })).status, 400, `client không được tự ghi sự kiện ${type}`);
    }

    const mon = await admin(`/api/admin/contests/${cid}/monitor`);
    const me = mon.data.participants.find((p) => p.username === 'sv_mot');
    assert.equal(me.online, true);
    assert.equal(me.fullscreen, true);
    /* nhiều màn hình + rời tab: 1 hoặc 2 lần tùy khoảng cách thời gian thực (logic gộp đã test riêng ở trên) */
    assert.ok(me.violations >= 1 && me.violations <= 2, `số lần vi phạm = ${me.violations}`);
    assert.equal(me.events.multi_screen, 1);
    assert.equal((await sv1(`/api/admin/contests/${cid}/monitor`)).status, 403);

    const board = await admin(`/api/admin/contests/${cid}/scoreboard`);
    assert.deepEqual(board.data.rows.map((r) => [r.username, r.total, r.rank]), [['sv_hai', 100, 1], ['sv_mot', 100, 2]]);
    const csv = await admin(`/api/admin/contests/${cid}/export.csv`);
    assert.match(csv.data, /sv_hai/);
    assert.match(csv.data, /Tổng điểm/);
    assert.match(csv.data, /Tổng số vi phạm/);
    const csvLine = (name) => csv.data.split('\r\n').find((l) => l.includes(name));
    assert.match(csvLine('sv_mot'), /"1 lần \(Tổng 0s\): \d\d:\d\d:\d\d \(5 giây\)"/);
    assert.match(csvLine('sv_mot'), /"1 lần: [^"]* lúc \d\d:\d\d:\d\d","[12]"$/);
    assert.match(csvLine('sv_hai'), /("0",){5}"0"$/);

    const sim = await admin(`/api/admin/contests/${cid}/similarity?threshold=0.8`);
    assert.equal(sim.data.pairs.length, 1);
    assert.ok(sim.data.pairs[0].similarity >= 80);

    assert.equal((await admin(`/api/admin/contests/${cid}/participants/${me.userId}/unlock`, { method: 'POST' })).status, 200);
    assert.equal((await sv1b(`/api/contests/${cid}/join`, { method: 'POST', body: {} })).status, 200, 'mở khóa xong vào được từ máy khác, không cần nhập lại mã');
    assert.equal((await sv1(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: 'A', source: AC_P01 } })).status, 423, 'phiên cũ mất quyền');
  });

  test('Nộp bài kết thúc rồi thì không nộp tiếp, mở lại luyện tập và xem được bảng xếp hạng trực tiếp', async () => {
    assert.equal((await sv1(`/api/contests/${cid}/results`)).status, 403, 'đang làm bài thì chưa xem bảng xếp hạng');
    assert.equal((await sv2(`/api/contests/${cid}/finish`, { method: 'POST' })).status, 200);
    assert.equal((await sv2(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: 'A', source: AC_P01 } })).status, 409);
    assert.equal((await sv2('/api/home')).status, 200);
    const board = await sv2(`/api/contests/${cid}/results`);
    assert.equal(board.status, 200);
    assert.equal(board.data.phase, 'running');
    assert.equal(board.data.rows.find((r) => r.username === 'sv_hai')?.finished, true);
    assert.equal(board.data.rows.find((r) => r.username === 'sv_mot')?.finished, false);
    assert.ok(board.data.rows.every((r) => !('userId' in r)));
    const mine = (await sv2('/api/me/profile')).data.contests.find((c) => c.id === cid);
    assert.equal(mine.finished, true);
    assert.equal(mine.rank, board.data.rows.find((r) => r.username === 'sv_hai').rank);
    assert.equal((await admin(`/api/admin/contests/${cid}`, { method: 'PUT', body: { settings: { boardAfterFinish: false } } })).status, 200);
    assert.equal((await sv2(`/api/contests/${cid}/results`)).status, 403, 'Admin tắt tùy chọn thì không xem được');
    assert.equal((await sv2('/api/me/profile')).data.contests.find((c) => c.id === cid).rank, null, 'hồ sơ cũng ẩn hạng');
  });
});
