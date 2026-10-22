import { Router } from 'express';

import { CLIENT_EVENTS, deviceOf } from '../lib/contests.js';

const MAX_SOURCE_BYTES = 64 * 1024;
const STALE_SESSION_MS = 45_000;
const MAX_EVENTS_PER_MIN = 30;

/* API cho thí sinh. Trong giờ thi, bài thi gắn với đúng một phiên đăng nhập (một thiết bị, một tab):
 * phiên khác gọi vào sẽ bị từ chối cho tới khi phiên cũ im lặng quá 45 giây hoặc giám thị mở khóa. */
export function contestRoutes({ db, catalog, contests, auth, queue, submitLimit }) {
  const r = Router();
  r.use(auth.requireUser);

  const eventHits = new Map();
  const tooManyEvents = (key) => {
    const now = Date.now();
    const list = (eventHits.get(key) ?? []).filter((t) => now - t < 60_000);
    list.push(now);
    eventHits.set(key, list);
    return list.length > MAX_EVENTS_PER_MIN;
  };

  const canSee = (c, user) => c && (c.status === 'published' || user.role === 'admin');
  const allowed = (c, user) => !c.settings.allowUsers.length || c.settings.allowUsers.map((u) => u.toLowerCase()).includes(user.username.toLowerCase());
  const ipOk = (c, ip) => !c.settings.ipPrefixes.length || c.settings.ipPrefixes.some((p) => String(ip || '').startsWith(p));

  function load(req, res) {
    const c = contests.get(req.params.id);
    if (!canSee(c, req.user)) {
      res.status(404).json({ error: 'Không tìm thấy cuộc thi' });
      return null;
    }
    return c;
  }

  /* Thí sinh đang thi đúng phiên này; trả participant hoặc gửi lỗi. */
  function seat(req, res, c, { needRunning = true } = {}) {
    const p = contests.participant(c.id, req.user.id);
    if (!p) return res.status(403).json({ error: 'Bạn chưa vào phòng thi' }), null;
    if (needRunning && contests.phase(c) !== 'running') return res.status(409).json({ error: 'Cuộc thi không trong giờ làm bài' }), null;
    if (needRunning && p.finished_at) return res.status(409).json({ error: 'Bạn đã nộp bài và kết thúc' }), null;
    if (p.session_hash && p.session_hash !== req.sessionHash) {
      return res.status(423).json({ error: 'Bài thi đang mở ở thiết bị hoặc tab khác. Báo giám thị nếu cần mở khóa.', code: 'other_session' }), null;
    }
    return p;
  }

  const { canSeeBoard } = contests;

  const publicContest = (c, user, me) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    startAt: c.startAt,
    endAt: c.endAt,
    phase: contests.phase(c),
    needCode: Boolean(c.settings.code),
    blockMultiScreen: c.settings.blockMultiScreen !== false,
    beepOnLeave: c.settings.beepOnLeave !== false,
    blockPaste: c.settings.blockPaste !== false,
    desktopOnly: c.settings.desktopOnly !== false,
    allowed: allowed(c, user),
    joined: Boolean(me),
    finished: Boolean(me?.finished_at),
    resultsPublished: Boolean(c.settings.publishResults),
    canSeeBoard: canSeeBoard(c, user, me),
    problemCount: contests.problemsOf(c.id).length,
  });

  r.get('/contests', (req, res) => {
    const list = contests
      .list()
      .filter((c) => canSee(c, req.user))
      .map((c) => publicContest(c, req.user, contests.participant(c.id, req.user.id)));
    res.json({ now: Date.now(), contests: list });
  });

  /* Thông tin phòng thi. Đề chỉ trả khi đã vào phòng và cuộc thi đã bắt đầu. */
  r.get('/contests/:id', (req, res) => {
    const c = load(req, res);
    if (!c) return;
    const me = contests.participant(c.id, req.user.id);
    const out = { now: Date.now(), contest: publicContest(c, req.user, me), problems: [], total: 0 };
    const phase = contests.phase(c);
    if (me && (phase === 'running' || phase === 'ended')) {
      const best = new Map(
        db
          .prepare(`SELECT problem_id, MAX(score) AS score, COUNT(*) AS n FROM submissions WHERE contest_id = ? AND user_id = ? GROUP BY problem_id`)
          .all(c.id, req.user.id)
          .map((x) => [x.problem_id, x]),
      );
      out.problems = contests.problemsOf(c.id).map((p) => ({
        label: p.label,
        title: p.title,
        points: p.points,
        myScore: best.get(p.problemId)?.score ?? null,
        tries: best.get(p.problemId)?.n ?? 0,
      }));
      out.total = out.problems.reduce((s, p) => s + (p.myScore || 0), 0);
      out.otherSession = Boolean(me.session_hash && me.session_hash !== req.sessionHash);
      out.myViolations = contests.incidentsOf(c.id, req.user.id);
    }
    res.json(out);
  });

  r.post('/contests/:id/join', (req, res) => {
    const c = load(req, res);
    if (!c) return;
    const phase = contests.phase(c);
    if (phase !== 'running') return res.status(409).json({ error: phase === 'upcoming' ? 'Chưa đến giờ thi' : 'Cuộc thi đã kết thúc' });
    if (!allowed(c, req.user)) return res.status(403).json({ error: 'Tài khoản của bạn không có trong danh sách thí sinh' });
    if (!ipOk(c, req.clientIp)) return res.status(403).json({ error: 'Chỉ được vào thi bằng mạng của phòng thi' });
    const { code, extended, touch } = req.body ?? {};
    /* Điện thoại / máy tính bảng: bàn phím có nút dán clipboard không qua sự kiện "dán", lại dễ chụp màn hình gửi chat. */
    const device = deviceOf(req.headers['user-agent']);
    if (c.settings.desktopOnly !== false && (device !== 'desktop' || touch === true)) {
      return res.status(403).json({ error: 'Cuộc thi này chỉ làm trên máy tính. Hãy vào bằng máy tính của phòng thi.', code: 'desktop_only' });
    }
    const already = contests.participant(c.id, req.user.id);
    /* Mã phòng chỉ cần ở lần vào đầu tiên; vào lại (tải lại trang, máy khác sau khi mở khóa) không hỏi lại. */
    if (!already && c.settings.code && String(code || '').trim().toUpperCase() !== c.settings.code.trim().toUpperCase()) {
      return res.status(400).json({ error: 'Mã phòng thi không đúng', fields: { code: 'Mã phòng thi không đúng' } });
    }
    if (extended && c.settings.blockMultiScreen !== false) {
      contests.logEvent(c.id, req.user.id, 'multi_screen', 'Phát hiện nhiều màn hình khi vào phòng');
      return res.status(400).json({ error: 'Máy đang nối nhiều màn hình. Rút màn hình phụ rồi vào lại.', code: 'multi_screen' });
    }
    const now = Date.now();
    const me = contests.participant(c.id, req.user.id);
    if (me?.finished_at) return res.status(409).json({ error: 'Bạn đã nộp bài và kết thúc' });
    if (!me) {
      db.prepare('INSERT INTO contest_participants (contest_id, user_id, joined_at, session_hash, ip, last_seen, device) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        c.id, req.user.id, now, req.sessionHash, req.clientIp ?? null, now, device,
      );
      contests.logEvent(c.id, req.user.id, 'join', req.clientIp ?? '');
    } else if (me.session_hash !== req.sessionHash) {
      const busy = me.session_hash && me.last_seen && now - me.last_seen < STALE_SESSION_MS;
      if (busy) return res.status(423).json({ error: 'Bài thi đang mở ở thiết bị hoặc tab khác. Báo giám thị nếu cần mở khóa.', code: 'other_session' });
      db.prepare('UPDATE contest_participants SET session_hash = ?, ip = ?, last_seen = ? WHERE contest_id = ? AND user_id = ?').run(
        req.sessionHash, req.clientIp ?? null, now, c.id, req.user.id,
      );
      contests.logEvent(c.id, req.user.id, 'rejoin', `Vào lại từ ${req.clientIp ?? '?'}`);
    }
    res.json({ ok: true });
  });

  r.get('/contests/:id/problems/:label', (req, res) => {
    const c = load(req, res);
    if (!c || !seat(req, res, c, { needRunning: false })) return;
    if (contests.phase(c) === 'upcoming') return res.status(409).json({ error: 'Chưa đến giờ thi' });
    const cp = contests.problemsOf(c.id).find((p) => p.label === req.params.label);
    const p = cp && catalog.problemMap.get(cp.problemId);
    if (!p) return res.status(404).json({ error: 'Không tìm thấy bài' });
    res.json({
      label: cp.label,
      title: p.title,
      timeMs: p.timeMs,
      memoryMb: p.memoryMb,
      statement: p.statement,
      samples: p.samples,
      points: cp.points,
      subtasks: cp.subtasks.map((s) => ({ name: s.name, points: s.points, tests: s.tests, note: s.note || '' })),
    });
  });

  r.post('/contests/:id/submit', submitLimit, (req, res) => {
    const c = load(req, res);
    if (!c || !seat(req, res, c)) return;
    const { label, source } = req.body ?? {};
    const cp = contests.problemsOf(c.id).find((p) => p.label === label);
    if (!cp || !catalog.problemMap.has(cp.problemId)) return res.status(400).json({ error: 'Bài không hợp lệ' });
    if (typeof source !== 'string' || !source.trim()) return res.status(400).json({ error: 'Mã nguồn trống' });
    if (Buffer.byteLength(source) > MAX_SOURCE_BYTES) return res.status(400).json({ error: 'Mã nguồn tối đa 64KB' });
    const pending = db.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND verdict = 'PENDING'").get(req.user.id).n;
    if (pending > 0) return res.status(429).json({ error: 'Bài trước đang được chấm, đợi xong rồi nộp tiếp nhé' });
    const { lastInsertRowid } = db
      .prepare('INSERT INTO submissions (user_id, problem_id, source, created_at, contest_id) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, cp.problemId, source, Date.now(), c.id);
    const id = Number(lastInsertRowid);
    queue.push(id);
    res.status(201).json({ id });
  });

  const subRow = (s, labels) => ({
    id: s.id,
    label: labels.get(s.problem_id) ?? '?',
    verdict: s.verdict,
    score: s.score,
    testsPassed: s.tests_passed,
    testCount: s.test_count,
    timeMs: s.time_ms,
    memoryKb: s.memory_kb,
    subtasks: s.subtasks_json ? JSON.parse(s.subtasks_json) : [],
    createdAt: s.created_at,
  });

  r.get('/contests/:id/submissions', (req, res) => {
    const c = load(req, res);
    if (!c || !seat(req, res, c, { needRunning: false })) return;
    const labels = new Map(contests.problemsOf(c.id).map((p) => [p.problemId, p.label]));
    const rows = db.prepare('SELECT * FROM submissions WHERE contest_id = ? AND user_id = ? ORDER BY id DESC LIMIT 200').all(c.id, req.user.id);
    res.json(rows.map((s) => subRow(s, labels)));
  });

  r.get('/contests/:id/submissions/:sid', (req, res) => {
    const c = load(req, res);
    if (!c || !seat(req, res, c, { needRunning: false })) return;
    const s = db.prepare('SELECT * FROM submissions WHERE id = ? AND contest_id = ? AND user_id = ?').get(Number(req.params.sid), c.id, req.user.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
    const labels = new Map(contests.problemsOf(c.id).map((p) => [p.problemId, p.label]));
    res.json({ ...subRow(s, labels), compileLog: s.compile_log, source: s.source });
  });

  /* Trình duyệt gửi định kỳ ~10 giây: trạng thái toàn màn hình, tab có đang hiện, có nhiều màn hình không. */
  r.post('/contests/:id/heartbeat', (req, res) => {
    const c = load(req, res);
    if (!c) return;
    const p = seat(req, res, c);
    if (!p) return;
    const { fullscreen, visible, extended } = req.body ?? {};
    const state = { fullscreen: Boolean(fullscreen), visible: visible !== false, extended: Boolean(extended) };
    db.prepare('UPDATE contest_participants SET last_seen = ?, state = ? WHERE contest_id = ? AND user_id = ?').run(
      Date.now(), JSON.stringify(state), c.id, req.user.id,
    );
    res.json({ ok: true, now: Date.now(), endAt: c.endAt });
  });

  r.post('/contests/:id/events', (req, res) => {
    const c = load(req, res);
    if (!c || !contests.participant(c.id, req.user.id)) return res.status(204).end();
    const { type, detail } = req.body ?? {};
    if (!CLIENT_EVENTS.includes(type)) return res.status(400).json({ error: 'Sự kiện không hợp lệ' });
    if (tooManyEvents(`${c.id}:${req.user.id}`)) return res.status(429).json({ error: 'Quá nhiều sự kiện' });
    contests.logEvent(c.id, req.user.id, type, detail ?? '');
    res.status(204).end();
  });

  /* Nộp bài sớm và rời phòng: sau đó không nộp thêm được nữa. */
  r.post('/contests/:id/finish', (req, res) => {
    const c = load(req, res);
    if (!c || !seat(req, res, c)) return;
    db.prepare('UPDATE contest_participants SET finished_at = ? WHERE contest_id = ? AND user_id = ?').run(Date.now(), c.id, req.user.id);
    contests.logEvent(c.id, req.user.id, 'finish', '');
    res.json({ ok: true });
  });

  /* Bảng xếp hạng: xem điều kiện ở contests.canSeeBoard. Trong giờ thi là bảng trực tiếp, kèm trạng thái đang làm / đã kết thúc. */
  r.get('/contests/:id/results', (req, res) => {
    const c = load(req, res);
    if (!c) return;
    if (!canSeeBoard(c, req.user, contests.participant(c.id, req.user.id))) {
      return res.status(403).json({ error: 'Bạn chỉ xem được bảng xếp hạng sau khi hoàn tất bài làm' });
    }
    const board = contests.scoreboard(c.id);
    const phase = contests.phase(c);
    res.json({
      ...board,
      now: Date.now(),
      phase,
      rows: board.rows.map(({ userId, ...row }) => ({
        ...row,
        finished: phase === 'ended' || Boolean(contests.participant(c.id, userId)?.finished_at),
      })),
    });
  });

  return r;
}
