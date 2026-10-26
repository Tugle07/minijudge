import { Router } from 'express';

import { normalizeSubtasks, VIOLATIONS } from '../lib/contests.js';

const MAX_PROBLEMS = 26;
const VIOLATION_TEXT = {
  fullscreen_exit: 'Thoát toàn màn hình', tab_hidden: 'Rời trang thi', blur: 'Chuyển cửa sổ khác', multi_screen: 'Nhiều màn hình',
  second_tab: 'Mở tab thứ hai', paste_blocked: 'Dán code từ ngoài', devtools_key: 'Bấm phím DevTools',
};
/* Giờ Việt Nam (UTC+7) dạng HH:MM:SS, không phụ thuộc múi giờ của server/container. */
const vnTime = (ms) => new Date(ms + 7 * 3_600_000).toISOString().slice(11, 19);

function readSettings(b) {
  const list = (v) =>
    (Array.isArray(v) ? v : String(v || '').split(/[\s,;]+/))
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 500);
  return {
    code: String(b.code ?? '').trim().slice(0, 40),
    ipPrefixes: list(b.ipPrefixes).map((s) => s.slice(0, 45)),
    allowUsers: list(b.allowUsers).map((s) => s.slice(0, 40)),
    publishResults: Boolean(b.publishResults),
    boardAfterFinish: b.boardAfterFinish !== false,
    blockMultiScreen: b.blockMultiScreen !== false,
    beepOnLeave: b.beepOnLeave !== false,
    blockPaste: b.blockPaste !== false,
    desktopOnly: b.desktopOnly !== false,
    showSubtaskNotes: b.showSubtaskNotes === true,
  };
}

/* Quản trị cuộc thi: tạo/sửa, chọn bài + chia subtask, giám sát phòng thi, bảng điểm, xuất Excel, so code giống nhau. */
export function adminContestRoutes({ db, catalog, contests, auth }) {
  const r = Router();
  r.use(auth.requireAdmin);

  const find = (req, res) => {
    const c = contests.get(req.params.id);
    if (!c) res.status(404).json({ error: 'Không tìm thấy cuộc thi' });
    return c;
  };

  function validate(b) {
    const fields = {};
    const title = String(b.title ?? '').trim();
    const startAt = Number(b.startAt);
    const endAt = Number(b.endAt);
    if (!title) fields.title = 'Nhập tên cuộc thi';
    if (!Number.isFinite(startAt) || startAt <= 0) fields.startAt = 'Chọn giờ bắt đầu';
    if (!Number.isFinite(endAt) || endAt <= startAt) fields.endAt = 'Giờ kết thúc phải sau giờ bắt đầu';
    return { fields, title: title.slice(0, 120), startAt, endAt };
  }

  const summary = (c) => ({
    ...c,
    phase: contests.phase(c),
    problemCount: contests.problemsOf(c.id).length,
    participants: db.prepare('SELECT COUNT(*) AS n FROM contest_participants WHERE contest_id = ?').get(c.id).n,
  });

  r.get('/contests', (_req, res) => res.json(contests.list().map(summary)));

  r.post('/contests', (req, res) => {
    const b = req.body ?? {};
    const { fields, title, startAt, endAt } = validate(b);
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Thông tin chưa hợp lệ', fields });
    const { lastInsertRowid } = db
      .prepare('INSERT INTO contests (title, description, start_at, end_at, status, settings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(title, String(b.description ?? '').slice(0, 4000), startAt, endAt, 'draft', JSON.stringify(readSettings(b.settings ?? {})), Date.now());
    res.status(201).json(summary(contests.get(Number(lastInsertRowid))));
  });

  r.get('/contests/:id', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    res.json({ ...summary(c), problems: contests.problemsOf(c.id) });
  });

  r.put('/contests/:id', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const b = { title: c.title, startAt: c.startAt, endAt: c.endAt, description: c.description, ...req.body };
    const { fields, title, startAt, endAt } = validate(b);
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Thông tin chưa hợp lệ', fields });
    const status = b.status === 'published' || b.status === 'draft' ? b.status : c.status;
    if (status === 'published' && contests.problemsOf(c.id).length === 0) {
      return res.status(400).json({ error: 'Cuộc thi chưa có bài nào' });
    }
    const settings = readSettings({ ...c.settings, ...(b.settings ?? {}) });
    db.prepare('UPDATE contests SET title = ?, description = ?, start_at = ?, end_at = ?, status = ?, settings = ? WHERE id = ?').run(
      title, String(b.description ?? '').slice(0, 4000), startAt, endAt, status, JSON.stringify(settings), c.id,
    );
    res.json(summary(contests.get(c.id)));
  });

  r.delete('/contests/:id', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const n = db.prepare('SELECT COUNT(*) AS n FROM submissions WHERE contest_id = ?').get(c.id).n;
    if (n > 0) return res.status(409).json({ error: `Cuộc thi đã có ${n} bài nộp, không xóa được` });
    db.prepare('DELETE FROM contests WHERE id = ?').run(c.id);
    res.json({ ok: true });
  });

  /* Đặt danh sách bài: [{problemId, subtasks: [{name, tests: "1-5", points}]}] theo thứ tự A, B, C… */
  r.put('/contests/:id/problems', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const list = Array.isArray(req.body?.problems) ? req.body.problems : null;
    if (!list || list.length > MAX_PROBLEMS) return res.status(400).json({ error: 'Danh sách bài không hợp lệ' });
    const errors = {};
    const rows = [];
    const seen = new Set();
    list.forEach((item, i) => {
      const p = catalog.problemMap.get(String(item?.problemId ?? ''));
      if (!p) return (errors[i] = 'Không tìm thấy bài');
      if (seen.has(p.id)) return (errors[i] = 'Bài bị trùng');
      seen.add(p.id);
      const raw = Array.isArray(item.subtasks) && item.subtasks.length ? item.subtasks : p.subtasks;
      const { subtasks, error } = normalizeSubtasks(raw, p.tests);
      if (error) return (errors[i] = error);
      rows.push({ problemId: p.id, label: contests.LABELS[i], subtasks });
    });
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Danh sách bài chưa hợp lệ', fields: errors });
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM contest_problems WHERE contest_id = ?').run(c.id);
      const ins = db.prepare('INSERT INTO contest_problems (contest_id, problem_id, label, position, subtasks) VALUES (?, ?, ?, ?, ?)');
      rows.forEach((row, i) => ins.run(c.id, row.problemId, row.label, i, JSON.stringify(row.subtasks)));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    /* Chấm lại điểm subtask của bài đã nộp (nếu Admin sửa cách chia điểm giữa chừng). */
    for (const { id } of db.prepare("SELECT id FROM submissions WHERE contest_id = ? AND verdict != 'PENDING'").all(c.id)) contests.scoreSubmission(id);
    res.json({ problems: contests.problemsOf(c.id) });
  });

  r.get('/contests/:id/monitor', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const events = db
      .prepare(
        `SELECT e.type, e.detail, e.at, u.username, u.full_name AS fullName FROM contest_events e JOIN users u ON u.id = e.user_id
         WHERE e.contest_id = ? ORDER BY e.id DESC LIMIT 80`,
      )
      .all(c.id);
    res.json({ now: Date.now(), phase: contests.phase(c), participants: contests.monitor(c.id), events });
  });

  r.get('/contests/:id/events', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const userId = Number(req.query.user);
    res.json(db.prepare('SELECT type, detail, at FROM contest_events WHERE contest_id = ? AND user_id = ? ORDER BY id').all(c.id, userId));
  });

  /* Giám thị mở khóa: cho thí sinh vào lại từ thiết bị khác (máy hỏng, trình duyệt treo…). */
  r.post('/contests/:id/participants/:userId/unlock', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    db.prepare('UPDATE contest_participants SET session_hash = NULL, finished_at = NULL WHERE contest_id = ? AND user_id = ?').run(
      c.id, Number(req.params.userId),
    );
    contests.logEvent(c.id, Number(req.params.userId), 'rejoin', `Giám thị ${req.user.username} mở khóa`);
    res.json({ ok: true });
  });

  r.get('/contests/:id/scoreboard', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    res.json(contests.scoreboard(c.id));
  });

  /* Bảng điểm dạng CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
  r.get('/contests/:id/export.csv', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const { problems, rows } = contests.scoreboard(c.id);
    const violations = new Map(contests.monitor(c.id).map((m) => [m.userId, m.violations]));

    const allEvs = db
      .prepare('SELECT user_id, type, detail, at FROM contest_events WHERE contest_id = ? ORDER BY at, id')
      .all(c.id);

    const userEvs = new Map();
    for (const e of allEvs) {
      const list = userEvs.get(e.user_id) ?? [];
      list.push(e);
      userEvs.set(e.user_id, list);
    }

    const pasteNote = (userId) => {
      const list = (userEvs.get(userId) ?? []).filter((e) => e.type === 'paste_blocked');
      if (!list.length) return '0';
      const items = list.map((e) => `${vnTime(e.at)} (${e.detail || 'Dán code'})`);
      return `${list.length} lần: ${items.join('; ')}`;
    };

    const awayNote = (userId) => {
      const evs = userEvs.get(userId) ?? [];
      const records = [];
      let totalSec = 0;
      let cur = null;
      for (const e of evs) {
        if (e.type === 'tab_hidden' || e.type === 'blur') {
          if (!cur) cur = { start: e.at, type: e.type, detail: e.detail, sec: 0 };
        } else if (e.type === 'tab_visible' && cur) {
          const m = String(e.detail || '').match(/(\d+)\s*giây/);
          const sec = m ? parseInt(m[1], 10) : 0;
          cur.sec = sec;
          totalSec += sec;
          records.push(cur);
          cur = null;
        }
      }
      if (cur) records.push(cur);
      if (!records.length) return '0';
      const items = records.map((a) => (a.sec > 0 ? `${vnTime(a.start)} (rời ${a.sec}s)` : `${vnTime(a.start)} (${a.detail || 'Rời trang'})`));
      return `${records.length} lần (Tổng ${totalSec}s): ${items.join('; ')}`;
    };

    const fullscreenNote = (userId) => {
      const list = (userEvs.get(userId) ?? []).filter((e) => e.type === 'fullscreen_exit');
      if (!list.length) return '0';
      const grouped = [];
      let lastT = 0;
      for (const f of list) {
        if (f.at - lastT > 2000) {
          grouped.push(f);
          lastT = f.at;
        }
      }
      return `${grouped.length} lần: ${grouped.map((f) => vnTime(f.at)).join(', ')}`;
    };

    const secondTabNote = (userId) => {
      const list = (userEvs.get(userId) ?? []).filter((e) => e.type === 'second_tab' || e.type === 'rejoin');
      if (!list.length) return '0';
      const items = [];
      let lastSt = 0;
      let count = 0;
      for (const s of list) {
        if (s.type === 'second_tab') {
          if (s.at - lastSt > 2000) {
            count++;
            items.push(`Mở tab thứ 2 lúc ${vnTime(s.at)}`);
            lastSt = s.at;
          }
        } else if (s.type === 'rejoin') {
          count++;
          items.push(`Đăng nhập lại lúc ${vnTime(s.at)} (${s.detail})`);
        }
      }
      return `${count} lần: ${items.join('; ')}`;
    };

    const othersNote = (userId) => {
      const list = (userEvs.get(userId) ?? []).filter((e) => e.type === 'devtools_key' || e.type === 'multi_screen');
      if (!list.length) return '0';
      const items = list.map((o) => (o.type === 'devtools_key' ? `Phím ${o.detail || 'F12'} lúc ${vnTime(o.at)}` : `${o.detail || 'Nhiều màn hình'} lúc ${vnTime(o.at)}`));
      return `${list.length} lần: ${items.join('; ')}`;
    };

    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const fmtMs = (ms) => {
      if (!ms || ms <= 0) return '—';
      const sec = Math.round(ms / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}p ${s}s`;
    };

    const head = [
      'Hạng',
      'MSSV / Tài khoản',
      'Họ và tên',
      ...problems.map((p) => `${p.label} (${p.points}đ)`),
      'Tổng điểm',
      'Thời gian làm bài',
      'Thời điểm hoàn thành',
      'Số lần nộp',
      'Vi phạm Copy/Dán code',
      'Rời tab / Chuyển cửa sổ',
      'Thoát toàn màn hình',
      'Mở tab khác / Login khác',
      'Vi phạm khác (F12/DevTools)',
      'Tổng số vi phạm',
    ];

    const lines = [
      head,
      ...rows.map((r) => [
        r.rank,
        r.username,
        r.fullName,
        ...r.cells.map((x) => x.score ?? 0),
        r.total,
        fmtMs(r.workDurationMs),
        r.finishAt ? vnTime(r.finishAt) : '—',
        r.totalTries ?? 0,
        pasteNote(r.userId),
        awayNote(r.userId),
        fullscreenNote(r.userId),
        secondTabNote(r.userId),
        othersNote(r.userId),
        violations.get(r.userId) ?? 0,
      ]),
    ];

    const name = `ket-qua-cuoc-thi-${c.id}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(`\uFEFF${lines.map((l) => l.map(cell).join(',')).join('\r\n')}\r\n`);
  });

  r.get('/contests/:id/similarity', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const threshold = Math.min(1, Math.max(0.3, Number(req.query.threshold) || 0.8));
    res.json({ threshold, pairs: contests.similar(c.id, threshold) });
  });

  r.get('/contests/:id/submissions/:sid', (req, res) => {
    const c = find(req, res);
    if (!c) return;
    const s = db
      .prepare('SELECT s.*, u.username FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.contest_id = ?')
      .get(Number(req.params.sid), c.id);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy bài nộp' });
    res.json({ id: s.id, username: s.username, problemId: s.problem_id, verdict: s.verdict, score: s.score, source: s.source, createdAt: s.created_at });
  });

  return r;
}
