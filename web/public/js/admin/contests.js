import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { confirmDialog, fmtDateTime, openDrawer, pill } from './kit.js';

const PHASE = {
  draft: ['Nháp', 'var(--pd)'],
  upcoming: ['Sắp diễn ra', 'var(--ce)'],
  running: ['Đang thi', 'var(--ac)'],
  ended: ['Đã kết thúc', 'var(--fg3)'],
};
const EVENT_TEXT = {
  join: 'Vào phòng', rejoin: 'Vào lại', fullscreen_exit: 'Thoát toàn màn hình', fullscreen_enter: 'Bật lại toàn màn hình',
  tab_hidden: 'Rời trang thi', tab_visible: 'Quay lại trang thi', blur: 'Chuyển cửa sổ khác', multi_screen: 'Nhiều màn hình',
  second_tab: 'Mở tab thứ hai', paste_blocked: 'Dán code từ ngoài', devtools_key: 'Phím DevTools', context_menu: 'Chuột phải', finish: 'Nộp bài kết thúc',
};
const VIOLATION_COLS = [['fullscreen_exit', 'Thoát FS'], ['tab_hidden', 'Rời tab'], ['blur', 'Đổi cửa sổ'], ['paste_blocked', 'Dán'], ['second_tab', 'Tab 2'], ['multi_screen', '2 màn hình']];

const pad = (n) => String(n).padStart(2, '0');
const toLocal = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const minutes = (ms) => `${Math.round(ms / 60_000)} phút`;
const num = (x) => (x == null ? '·' : Number(Number(x).toFixed(2)));

export async function render(ctx) {
  const [, id, tab = 'monitor'] = ['contests', ...ctx.params];
  if (id) return detail(ctx, Number(id), tab);
  return list(ctx);
}

/* ---------- Danh sách ---------- */
async function list(ctx) {
  ctx.setHead({ crumb: 'Cuộc thi', title: 'Cuộc thi', actions: '<button class="btn-dark" data-new>+ Tạo cuộc thi</button>' });
  let contests = [];
  let problems = [];
  async function load() {
    [contests, problems] = await Promise.all([api('/api/admin/contests'), api('/api/admin/problems')]);
    draw();
  }
  function draw() {
    ctx.page.innerHTML = `
      <div class="panel">
        <table class="atable">
          <thead><tr><th>Cuộc thi</th><th>Trạng thái</th><th>Bắt đầu</th><th class="num">Thời gian</th><th class="num">Số bài</th><th class="num">Thí sinh</th><th style="width:56px"></th></tr></thead>
          <tbody>${contests
            .map(
              (c) => `<tr class="click" data-open="${c.id}">
                <td style="font-weight:500">${esc(c.title)}</td>
                <td>${pill(...PHASE[c.phase])}</td>
                <td class="mono muted">${fmtDateTime(c.startAt)}</td>
                <td class="num">${minutes(c.endAt - c.startAt)}</td>
                <td class="num">${c.problemCount}</td>
                <td class="num">${c.participants}</td>
                <td class="row-menu">
                  <button class="dots-btn" data-menu aria-label="Thao tác">⋯</button>
                  <div class="menu" role="menu" hidden>
                    <button data-open="${c.id}">Giám sát / kết quả</button>
                    <button data-edit="${c.id}">Sửa</button>
                    <button class="danger" data-del="${c.id}">Xóa</button>
                  </div>
                </td></tr>`,
            )
            .join('')}</tbody>
        </table>
        ${contests.length ? '' : '<div class="empty">Chưa có cuộc thi nào. Bấm <b style="color:var(--fg)">Tạo cuộc thi</b> để bắt đầu.</div>'}
      </div>
      <div class="panel pad" style="font-size:14px;line-height:1.6">
        <b>Các bước tổ chức một buổi thi</b>
        <ol style="margin:0;padding-left:20px">
          <li>Tạo đề thi ở mục <b>Bài tập</b> và <b>để ở trạng thái Nháp</b> (sinh viên không thấy). Đề đã xuất bản cũng dùng được: trong thời gian cuộc thi chưa kết thúc, bài sẽ tự ẩn khỏi phần luyện tập.</li>
          <li>Tạo cuộc thi: giờ bắt đầu/kết thúc, mã phòng thi, chọn bài và chia subtask cho từng bài.</li>
          <li>Chuyển trạng thái sang <b>Xuất bản</b>. Đến giờ, thí sinh vào <b>Cuộc thi</b>, nhập mã phòng do giám thị đọc tại lớp.</li>
          <li>Trong giờ thi theo dõi ở trang <b>Giám sát</b>; sau giờ thi xem <b>Bảng điểm</b>, <b>Code giống nhau</b>, rồi xuất Excel.</li>
        </ol>
      </div>`;
  }
  ctx.page.addEventListener('click', async (e) => {
    const t = e.target;
    const menu = t.closest('[data-menu]');
    if (menu) {
      e.stopPropagation();
      const m = menu.nextElementSibling;
      return (m.hidden = !m.hidden);
    }
    if (t.closest('[data-edit]')) return editor(ctx, contests.find((c) => c.id === Number(t.closest('[data-edit]').dataset.edit)), problems, load);
    if (t.closest('[data-del]')) {
      const c = contests.find((x) => x.id === Number(t.closest('[data-del]').dataset.del));
      if (!(await confirmDialog({ title: 'Xóa cuộc thi?', body: `“${c.title}” sẽ bị xóa. Cuộc thi đã có bài nộp thì không xóa được.`, cta: 'Xóa', danger: true }))) return;
      try {
        await api(`/api/admin/contests/${c.id}`, { method: 'DELETE' });
        toast('Đã xóa');
        load();
      } catch (err) {
        toast(err.message);
      }
      return;
    }
    const open = t.closest('[data-open]');
    if (open && !t.closest('.row-menu .dots-btn')) location.hash = `#/contests/${open.dataset.open}`;
  });
  ctx.actions().addEventListener('click', (e) => e.target.closest('[data-new]') && editor(ctx, null, problems, load));
  await load();
}

/* ---------- Tạo / sửa cuộc thi (ngăn kéo) ---------- */
async function editor(ctx, summary, problems, onSaved) {
  const full = summary ? await api(`/api/admin/contests/${summary.id}`) : null;
  const start = Date.now() + 3_600_000;
  const f = full
    ? { ...full, settings: { ...full.settings }, problems: full.problems.map((p) => ({ problemId: p.problemId, subtasks: p.subtasks.map((s) => ({ ...s })) })) }
    : { title: '', description: '', startAt: start - (start % 900_000), endAt: start - (start % 900_000) + 90 * 60_000, status: 'draft', settings: { code: Math.random().toString(36).slice(2, 8).toUpperCase(), ipPrefixes: [], allowUsers: [], publishResults: false, boardAfterFinish: true, blockMultiScreen: true, beepOnLeave: true, blockPaste: true }, problems: [] };
  let errors = {};
  const pmap = new Map(problems.map((p) => [p.id, p]));

  /* "1-5,8" → [1,2,3,4,5,8]; dùng để cảnh báo test chưa thuộc subtask nào. */
  const testsOf = (spec, max) =>
    String(spec || '').split(',').flatMap((part) => {
      const [a, b = a] = part.trim().split('-').map(Number);
      if (!a || !b || b < a) return [];
      return Array.from({ length: Math.min(b, max) - a + 1 }, (_, k) => a + k).filter((x) => x >= 1 && x <= max);
    });
  const scoringNote = (cp, p) => {
    const n = p?.tests ?? 0;
    const used = new Set(cp.subtasks.flatMap((s) => testsOf(s.tests, n)));
    const free = Array.from({ length: n }, (_, k) => k + 1).filter((x) => !used.has(x));
    const one = cp.subtasks.length === 1 && n > 1 && used.size === n;
    return `<div class="st-rule">
        <span><b>Cách tính điểm:</b> mỗi subtask chỉ được điểm khi <b>đúng tất cả</b> test trong subtask đó; sai dù 1 test thì subtask đó được 0 điểm.
        Điểm bài = tổng điểm các subtask đạt được; thí sinh nộp nhiều lần thì lấy lần cao điểm nhất.</span>
        ${one ? `<span class="st-warn">Bài này đang có 1 subtask gồm cả ${n} test: đúng ${n - 1}/${n} test vẫn được 0 điểm. Muốn cho điểm từng phần, bấm "Chấm theo từng test" hoặc chia nhóm.</span>` : ''}
        ${free.length ? `<span class="st-warn">Test ${free.join(', ')} chưa thuộc subtask nào nên không được tính điểm.</span>` : ''}
      </div>`;
  };

  const problemCard = (cp, i) => {
    const p = pmap.get(cp.problemId);
    const total = cp.subtasks.reduce((s, x) => s + (Number(x.points) || 0), 0);
    return `
      <div class="panel pad" style="gap:10px" data-pi="${i}">
        <div style="display:flex;align-items:center;gap:10px">
          <b class="mono" style="font-size:16px">${String.fromCharCode(65 + i)}</b>
          <span style="font-weight:500">${esc(p?.title ?? cp.problemId)}</span>
          <span class="mono faint" style="font-size:12.5px">${esc(cp.problemId)} · ${p?.tests ?? '?'} test · ${p?.status === 'pub' ? 'đã xuất bản' : 'nháp'}</span>
          <div style="flex:1"></div>
          <b class="mono">${total} điểm</b>
          <button class="btn-line" style="height:30px" data-up="${i}" title="Lên">↑</button>
          <button class="btn-line" style="height:30px" data-rm="${i}" title="Bỏ bài">×</button>
        </div>
        <table class="atable" style="font-size:13.5px">
          <thead><tr><th>Subtask</th><th>Các test (vd 1-5,8)</th><th class="num" style="width:90px">Điểm</th><th style="width:40px"></th></tr></thead>
          <tbody>${cp.subtasks
            .map(
              (s, k) => `<tr>
                <td><input class="input" style="height:32px" data-st="${i}:${k}:name" value="${esc(s.name)}" /></td>
                <td><input class="input mono" style="height:32px" data-st="${i}:${k}:tests" value="${esc(s.tests)}" /></td>
                <td><input class="input mono" style="height:32px;text-align:right" type="number" min="0" step="any" data-st="${i}:${k}:points" value="${esc(s.points)}" /></td>
                <td><button class="link-btn" data-strm="${i}:${k}" title="Xóa subtask">×</button></td></tr>`,
            )
            .join('')}</tbody>
        </table>
        <div style="display:flex;gap:8px;align-items:center"><button class="btn-line" style="height:30px" data-stadd="${i}">+ Subtask</button>
          <button class="btn-line" style="height:30px" data-steven="${i}" title="Chia đều 100 điểm cho từng nhóm test">Chia 100 điểm đều theo ${Math.min(5, p?.tests ?? 1)} nhóm</button>
          <button class="btn-line" style="height:30px" data-steach="${i}" title="Mỗi test là một subtask, đúng bao nhiêu test được bấy nhiêu phần điểm">Chấm theo từng test</button>
          ${errors[`p${i}`] ? `<span class="err-text" style="color:var(--wa);font-size:13px">${esc(errors[`p${i}`])}</span>` : ''}</div>
        ${scoringNote(cp, p)}
      </div>`;
  };

  const body = () => `
    <label class="afield"><span>Tên cuộc thi</span><input class="input ${errors.title ? 'err' : ''}" data-f="title" value="${esc(f.title)}" placeholder="vd. Kiểm tra giữa kỳ KTLT" />${errors.title ? `<span class="err-text">${esc(errors.title)}</span>` : ''}</label>
    <label class="afield"><span>Mô tả / lời dặn (Markdown)</span><textarea class="input" data-f="description" style="height:80px;padding:8px">${esc(f.description)}</textarea></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <label class="afield"><span>Bắt đầu</span><input class="input" type="datetime-local" data-time="startAt" value="${toLocal(f.startAt)}" /></label>
      <label class="afield"><span>Kết thúc</span><input class="input ${errors.endAt ? 'err' : ''}" type="datetime-local" data-time="endAt" value="${toLocal(f.endAt)}" /></label>
    </div>
    ${errors.endAt ? `<span class="err-text" style="color:var(--wa);font-size:13px">${esc(errors.endAt)}</span>` : ''}
    <span class="help faint" style="font-size:13px">Thời gian làm bài: ${minutes(f.endAt - f.startAt)}</span>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <label class="afield"><span>Mã phòng thi</span><input class="input mono" data-s="code" value="${esc(f.settings.code)}" /><span class="help">Giám thị đọc mã này tại lớp. Để trống = không cần mã.</span></label>
      <label class="afield"><span>Chỉ nhận mạng (đầu IP)</span><input class="input mono" data-s="ipPrefixes" value="${esc(f.settings.ipPrefixes.join(', '))}" placeholder="vd. 113.161." /><span class="help">Để trống = mọi mạng. Sau Cloudflare đây là IP công khai của trường.</span></label>
    </div>
    <label class="afield"><span>Danh sách thí sinh (tài khoản, cách nhau dấu phẩy/xuống dòng)</span><textarea class="input mono" data-s="allowUsers" style="height:64px;padding:8px" placeholder="Để trống = mọi tài khoản đã đăng ký">${esc(f.settings.allowUsers.join('\n'))}</textarea></label>
    <div style="display:flex;flex-wrap:wrap;gap:18px;font-size:14.5px">
      <label style="display:flex;gap:7px;align-items:center"><input type="checkbox" data-b="blockMultiScreen" ${f.settings.blockMultiScreen !== false ? 'checked' : ''} />Chặn máy nối nhiều màn hình</label>
      <label style="display:flex;gap:7px;align-items:center"><input type="checkbox" data-b="beepOnLeave" ${f.settings.beepOnLeave !== false ? 'checked' : ''} />Phát 3 tiếng bíp khi thí sinh rời bài thi</label>
      <label style="display:flex;gap:7px;align-items:center"><input type="checkbox" data-b="blockPaste" ${f.settings.blockPaste !== false ? 'checked' : ''} />Chặn dán code từ bên ngoài phòng thi (copy/paste trong phòng thi vẫn dùng được)</label>
      <label style="display:flex;gap:7px;align-items:center"><input type="checkbox" data-b="boardAfterFinish" ${f.settings.boardAfterFinish !== false ? 'checked' : ''} />Thí sinh hoàn tất bài làm được xem bảng xếp hạng trực tiếp</label>
      <label style="display:flex;gap:7px;align-items:center"><input type="checkbox" data-b="publishResults" ${f.settings.publishResults ? 'checked' : ''} />Công bố bảng kết quả cho mọi người (sau giờ thi)</label>
    </div>
    <div class="afield"><span>Trạng thái</span><div class="seg" style="max-width:320px">${[['draft', 'Nháp'], ['published', 'Xuất bản']].map(([k, l]) => `<button type="button" class="${f.status === k ? 'on' : ''}" data-status="${k}">${l}</button>`).join('')}</div>
      <span class="help">Nháp: thí sinh chưa thấy. Xuất bản: hiện trong mục Cuộc thi, vào được khi đến giờ.</span></div>
    <div class="afield">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:14px;font-weight:500">Bài thi</span><span class="faint" style="font-size:13px">${f.problems.length} bài · tổng ${f.problems.reduce((s, p) => s + p.subtasks.reduce((a, x) => a + (Number(x.points) || 0), 0), 0)} điểm</span></div>
      <div style="position:relative"><input class="input" data-addq placeholder="Bấm để chọn bài, gõ mã (vd. P01) hoặc tên để lọc" autocomplete="off" /><div class="suggest" data-suggest hidden></div></div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">${f.problems.map(problemCard).join('') || '<span class="faint" style="font-size:13.5px">Chưa có bài nào.</span>'}</div>
      ${errors.problems ? `<span class="err-text" style="color:var(--wa);font-size:13px">${esc(errors.problems)}</span>` : ''}
    </div>`;

  const { el, close } = openDrawer({
    title: full ? 'Sửa cuộc thi' : 'Tạo cuộc thi',
    wide: true,
    html: '<div data-body style="display:flex;flex-direction:column;gap:16px"></div>',
    footer: '<button class="btn-line" data-close>Hủy</button><button class="btn-dark" data-save>Lưu</button>',
  });
  const host = el.querySelector('[data-body]');
  const redraw = () => {
    const y = el.querySelector('.drawer-body').scrollTop;
    host.innerHTML = body();
    el.querySelector('.drawer-body').scrollTop = y;
  };
  redraw();

  host.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.f) f[t.dataset.f] = t.value;
    if (t.dataset.time) f[t.dataset.time] = t.value ? new Date(t.value).getTime() : 0;
    if (t.dataset.s) f.settings[t.dataset.s] = t.dataset.s === 'code' ? t.value : t.value.split(/[\s,;]+/).filter(Boolean);
    if (t.dataset.st) {
      const [i, k, key] = t.dataset.st.split(':');
      f.problems[i].subtasks[k][key] = key === 'points' ? Number(t.value) : t.value;
    }
    if (t.dataset.addq !== undefined) suggest(t);
  });
  /* Bấm vào ô là hiện ngay danh sách bài (chưa gõ gì), gõ để lọc theo mã hoặc tên. */
  function suggest(input) {
    const qv = input.value.trim().toLowerCase();
    const box = host.querySelector('[data-suggest]');
    const hits = problems
      .filter((p) => !f.problems.some((x) => x.problemId === p.id) && (!qv || p.id.toLowerCase().includes(qv) || p.title.toLowerCase().includes(qv)))
      .slice(0, 12);
    box.hidden = !hits.length;
    box.innerHTML = hits.map((p) => `<button type="button" data-add="${esc(p.id)}"><span class="mono">${esc(p.id)}</span> ${esc(p.title)} <span class="faint">· ${p.tests} test${p.status === 'pub' ? '' : ' · nháp'}</span></button>`).join('');
  }
  host.addEventListener('focusin', (e) => {
    if (e.target.dataset.addq !== undefined) suggest(e.target);
  });
  host.addEventListener('focusout', (e) => {
    if (e.target.dataset.addq === undefined) return;
    setTimeout(() => {
      const box = host.querySelector('[data-suggest]');
      if (box && !box.contains(document.activeElement)) box.hidden = true;
    }, 150);
  });
  host.addEventListener('change', (e) => {
    if (e.target.dataset.b) f.settings[e.target.dataset.b] = e.target.checked;
    if (e.target.dataset.time || e.target.dataset.st) redraw();
  });
  host.addEventListener('click', (e) => {
    const t = e.target;
    const d = (k) => t.closest(`[data-${k}]`)?.dataset[k];
    if (d('status')) f.status = d('status');
    else if (d('add')) {
      const p = pmap.get(d('add'));
      f.problems.push({ problemId: p.id, subtasks: [{ name: 'Toàn bộ test', tests: `1-${Math.max(1, p.tests)}`, points: 100 }] });
    } else if (d('rm') != null) f.problems.splice(Number(d('rm')), 1);
    else if (d('up') != null) {
      const i = Number(d('up'));
      if (i > 0) [f.problems[i - 1], f.problems[i]] = [f.problems[i], f.problems[i - 1]];
    } else if (d('stadd') != null) {
      const cp = f.problems[Number(d('stadd'))];
      cp.subtasks.push({ name: `Subtask ${cp.subtasks.length + 1}`, tests: '', points: 0 });
    } else if (d('strm')) {
      const [i, k] = d('strm').split(':').map(Number);
      f.problems[i].subtasks.splice(k, 1);
    } else if (d('steach') != null) {
      const cp = f.problems[Number(d('steach'))];
      const n = Math.max(1, pmap.get(cp.problemId)?.tests ?? 1);
      const base = Math.floor((100 / n) * 100) / 100;
      cp.subtasks = Array.from({ length: n }, (_, k) => ({
        name: `Test ${k + 1}`,
        tests: `${k + 1}`,
        points: k === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base,
      }));
    } else if (d('steven') != null) {
      const cp = f.problems[Number(d('steven'))];
      const n = pmap.get(cp.problemId)?.tests ?? 1;
      const g = Math.min(5, n);
      cp.subtasks = Array.from({ length: g }, (_, k) => {
        const a = Math.floor((k * n) / g) + 1;
        const b = Math.floor(((k + 1) * n) / g);
        return { name: `Subtask ${k + 1}`, tests: a === b ? `${a}` : `${a}-${b}`, points: Math.round((100 / g) * 100) / 100 };
      });
    } else return;
    redraw();
  });

  /* Lưu theo 3 bước: thông tin (giữ nguyên trạng thái) → danh sách bài + subtask → đổi trạng thái nếu cần.
   * Cuộc thi đang chạy không bị chuyển về nháp giữa chừng khi Admin chỉ sửa điểm. */
  let contestId = full?.id ?? null;
  el.querySelector('[data-save]').addEventListener('click', async () => {
    errors = {};
    if (f.status === 'published' && !f.problems.length) {
      errors.problems = 'Cuộc thi cần ít nhất 1 bài mới xuất bản được. Thêm bài ở ô phía trên, hoặc chọn "Nháp" để lưu trước.';
      redraw();
      host.querySelector('[data-addq]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const payload = { title: f.title, description: f.description, startAt: f.startAt, endAt: f.endAt, settings: f.settings };
    try {
      let saved = contestId
        ? await api(`/api/admin/contests/${contestId}`, { method: 'PUT', body: payload })
        : await api('/api/admin/contests', { method: 'POST', body: payload });
      contestId = saved.id;
      try {
        await api(`/api/admin/contests/${saved.id}/problems`, { method: 'PUT', body: { problems: f.problems } });
      } catch (err) {
        for (const [i, msg] of Object.entries(err.fields || {})) errors[`p${i}`] = msg;
        errors.problems = err.message;
        throw err;
      }
      if (saved.status !== f.status) saved = await api(`/api/admin/contests/${saved.id}`, { method: 'PUT', body: { ...payload, status: f.status } });
      toast(saved.status === 'published' ? 'Đã lưu, cuộc thi đang xuất bản' : 'Đã lưu nháp cuộc thi');
      close();
      onSaved();
    } catch (err) {
      if (!errors.problems && err.fields) Object.assign(errors, err.fields);
      toast(err.message);
      redraw();
    }
  });
}

/* ---------- Giám sát / bảng điểm / code giống nhau ---------- */
async function detail(ctx, id, tab) {
  let c = await api(`/api/admin/contests/${id}`);
  const TABS = [['monitor', 'Giám sát'], ['board', 'Bảng điểm'], ['similar', 'Code giống nhau']];
  ctx.setHead({
    crumb: 'Cuộc thi',
    title: c.title,
    actions: `<a class="btn-line" style="display:inline-flex;align-items:center" href="#/contests">‹ Danh sách</a><a class="btn-line" style="display:inline-flex;align-items:center" href="/api/admin/contests/${id}/export.csv">Xuất Excel (CSV)</a>`,
  });
  let timer = null;
  let threshold = 80;
  /* Lọc nhật ký theo thí sinh: gõ MSSV hoặc tên (không cần dấu). Khớp đúng 1 người thì tải toàn bộ nhật ký của người đó. */
  let logQ = '';
  let lastM = null;
  let fullLog = null;
  const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const matchPs = (ps) => {
    const q = fold(logQ.trim());
    return q ? ps.filter((p) => fold(`${p.username} ${p.fullName}`).includes(q)) : ps;
  };
  const evRow = (e) =>
    `<tr><td class="mono faint" style="width:110px">${fmtDateTime(e.at).slice(0, 5)}</td><td style="width:240px"><span style="font-weight:550">${esc(e.fullName || e.username)}</span>${e.fullName ? `<br /><span class="mono faint" style="font-size:12px">${esc(e.username)}</span>` : ''}</td><td style="color:${['join', 'rejoin', 'fullscreen_enter', 'tab_visible', 'finish', 'context_menu'].includes(e.type) ? 'var(--fg2)' : 'var(--wa)'}">${esc(EVENT_TEXT[e.type] || e.type)}</td><td class="faint">${esc(e.detail)}</td></tr>`;
  async function loadFullLog() {
    const hits = lastM && logQ.trim() ? matchPs(lastM.participants) : [];
    if (hits.length !== 1) return (fullLog = null);
    const p = hits[0];
    if (fullLog?.userId === p.userId && fullLog.at > Date.now() - 4000) return;
    const ev = await api(`/api/admin/contests/${id}/events?user=${p.userId}`);
    fullLog = { userId: p.userId, at: Date.now(), events: ev.map((x) => ({ ...x, username: p.username, fullName: p.fullName })).reverse() };
  }
  function logHtml() {
    if (!lastM) return '';
    const hits = matchPs(lastM.participants);
    const q = logQ.trim();
    let list = lastM.events;
    let note = 'tự cập nhật mỗi 5 giây';
    if (q && fullLog && hits.length === 1 && fullLog.userId === hits[0].userId) {
      list = fullLog.events;
      const bad = list.filter((e) => !['join', 'rejoin', 'fullscreen_enter', 'tab_visible', 'finish', 'context_menu'].includes(e.type)).length;
      note = `Toàn bộ nhật ký của <b>${esc(hits[0].fullName || hits[0].username)}</b> · ${list.length} sự kiện, ${bad} vi phạm`;
    } else if (q) {
      const names = new Set(hits.map((p) => p.username));
      list = lastM.events.filter((e) => names.has(e.username));
      note = hits.length ? `${hits.length} thí sinh khớp · gõ cụ thể hơn để xem toàn bộ nhật ký của một người` : 'Không có thí sinh nào khớp';
    }
    return `
      <div class="panel-head log-head"><b style="font-weight:600">Nhật ký${q ? '' : ' gần đây'}</b><span class="faint" style="font-size:13px">${note}</span>
        <div style="flex:1"></div>
        <input class="input log-search" data-logq value="${esc(logQ)}" placeholder="Lọc theo MSSV hoặc tên thí sinh" autocomplete="off" />
        ${q ? '<button class="btn-line" style="height:34px" data-logclear>Bỏ lọc</button>' : ''}
      </div>
      <table class="atable" style="font-size:13.5px"><tbody>${list.map(evRow).join('') || '<tr><td class="faint" style="padding:18px">Chưa có sự kiện.</td></tr>'}</tbody></table>`;
  }
  function drawLog() {
    const box = ctx.page.querySelector('[data-logbox]');
    if (!box) return;
    const had = document.activeElement?.dataset?.logq !== undefined;
    const caret = had ? document.activeElement.selectionStart : null;
    box.innerHTML = logHtml();
    if (had) {
      const inp = box.querySelector('[data-logq]');
      inp.focus();
      inp.setSelectionRange(caret, caret);
    }
  }

  const shell = (inner) => `
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
      ${pill(...PHASE[c.phase])}
      <span class="muted mono" style="font-size:13.5px">${fmtDateTime(c.startAt)} – ${fmtDateTime(c.endAt)}</span>
      <span class="muted" style="font-size:13.5px">· Mã phòng: <b class="mono" style="color:var(--fg)">${esc(c.settings.code || '(không)')}</b></span>
      <div style="flex:1"></div>
      <div class="seg">${TABS.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    </div>
    ${inner}`;

  async function monitor() {
    const m = await api(`/api/admin/contests/${id}/monitor`);
    lastM = m;
    await loadFullLog().catch(() => (fullLog = null));
    const focused = document.activeElement?.dataset?.logq !== undefined;
    const caret = focused ? document.activeElement.selectionStart : null;
    c.phase = m.phase;
    const ps = m.participants;
    const online = ps.filter((p) => p.online).length;
    const warn = ps.filter((p) => p.online && (!p.fullscreen || !p.visible)).length;
    ctx.page.innerHTML = shell(`
      <div class="kpis">
        <div class="kpi"><span class="label">Đã vào phòng</span><span class="value">${ps.length}</span></div>
        <div class="kpi"><span class="label">Đang online</span><span class="value" style="color:var(--ac)">${online}</span></div>
        <div class="kpi"><span class="label">Đang rời bài thi</span><span class="value" style="color:${warn ? 'var(--wa)' : 'var(--fg)'}">${warn}</span></div>
        <div class="kpi"><span class="label">Đã nộp kết thúc</span><span class="value">${ps.filter((p) => p.finishedAt).length}</span></div>
      </div>
      <div class="panel" style="overflow-x:auto">
        <table class="atable">
          <thead><tr><th>Thí sinh</th><th>Trạng thái</th>${VIOLATION_COLS.map(([, l]) => `<th class="num">${l}</th>`).join('')}<th class="num">Điểm</th><th>IP</th><th></th></tr></thead>
          <tbody>${ps
            .sort((a, b) => b.violations - a.violations || a.username.localeCompare(b.username))
            .map((p) => {
              const st = p.finishedAt ? pill('Đã nộp', 'var(--fg3)') : !p.online ? pill('Mất kết nối', 'var(--tle)') : !p.fullscreen || !p.visible ? pill('Rời bài thi', 'var(--wa)') : pill('Đang làm', 'var(--ac)');
              return `<tr>
                <td class="mono"><button class="link-btn" style="color:var(--fg)" data-log="${esc(p.username)}" title="Lọc nhật ký của thí sinh này">${esc(p.username)}</button>${p.fullName ? `<div class="faint" style="font-size:12.5px;font-family:var(--font-ui)">${esc(p.fullName)}</div>` : ''}</td>
                <td>${st}${p.extended ? ' ' + pill('2 màn hình', 'var(--wa)') : ''}</td>
                ${VIOLATION_COLS.map(([k]) => `<td class="num" style="color:${p.events[k] ? 'var(--wa)' : 'var(--fg3)'}">${p.events[k] || 0}</td>`).join('')}
                <td class="num">${num(p.total)}</td>
                <td class="mono faint" style="font-size:12.5px">${esc(p.ip || '')}</td>
                <td><button class="btn-line" style="height:28px;font-size:12.5px" data-unlock="${p.userId}" data-name="${esc(p.username)}" title="Cho vào lại từ máy/tab khác">Mở khóa</button></td>
              </tr>`;
            })
            .join('')}</tbody>
        </table>
        ${ps.length ? '' : '<div class="empty">Chưa có thí sinh nào vào phòng.</div>'}
      </div>
      <div class="panel" data-logbox>${logHtml()}</div>`);
    if (focused) {
      const inp = ctx.page.querySelector('[data-logq]');
      inp.focus();
      inp.setSelectionRange(caret, caret);
    }
  }

  async function board() {
    const b = await api(`/api/admin/contests/${id}/scoreboard`);
    ctx.page.innerHTML = shell(`
      <div class="panel" style="overflow-x:auto">
        <table class="atable">
          <thead><tr><th class="num" style="width:50px">#</th><th>Thí sinh</th>${b.problems.map((p) => `<th class="num" title="${esc(p.title)}">${esc(p.label)} <span class="faint">/${p.points}</span></th>`).join('')}<th class="num">Tổng</th></tr></thead>
          <tbody>${b.rows.map((r) => `<tr><td class="num">${r.rank}</td><td class="mono">${esc(r.username)}${r.fullName ? ` <span class="faint" style="font-family:var(--font-ui)">${esc(r.fullName)}</span>` : ''}</td>${r.cells.map((x) => `<td class="num" title="${x.tries} lần nộp">${num(x.score)}</td>`).join('')}<td class="num" style="font-weight:600">${num(r.total)}</td></tr>`).join('')}</tbody>
        </table>
        ${b.rows.length ? '' : '<div class="empty">Chưa có thí sinh.</div>'}
      </div>
      <div class="panel pad" style="font-size:14px">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span>Công bố bảng kết quả cho thí sinh:</span><b>${c.settings.publishResults ? 'Đang công bố' : 'Chưa công bố'}</b>
          <button class="btn-line" data-publish>${c.settings.publishResults ? 'Ẩn kết quả' : 'Công bố kết quả'}</button></div>
        <span class="faint">${c.settings.boardAfterFinish !== false ? 'Thí sinh đã bấm kết thúc (hoặc hết giờ) thấy bảng xếp hạng trực tiếp.' : 'Thí sinh không xem được bảng xếp hạng trong giờ thi.'} Sau giờ thi, công bố kết quả để mọi người cùng xem.</span>
      </div>`);
  }

  async function similar() {
    const s = await api(`/api/admin/contests/${id}/similarity?threshold=${threshold / 100}`);
    ctx.page.innerHTML = shell(`
      <div class="panel pad" style="font-size:14px">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span>Hiện các cặp giống từ</span>
          <select class="input" style="width:auto;height:32px" data-threshold>${[60, 70, 80, 90].map((v) => `<option value="${v}" ${v === threshold ? 'selected' : ''}>${v}%</option>`).join('')}</select>
          <span class="faint">So bài có điểm cao nhất của mỗi thí sinh ở từng bài; đã bỏ qua tên biến, khoảng trắng, chú thích.</span></div>
      </div>
      <div class="panel">
        <table class="atable">
          <thead><tr><th>Bài</th><th class="num">Giống</th><th>Thí sinh 1</th><th>Thí sinh 2</th><th></th></tr></thead>
          <tbody>${s.pairs
            .map((p) => `<tr><td class="mono">${esc(p.label)}</td><td class="num" style="color:${p.similarity >= 90 ? 'var(--wa)' : 'var(--tle)'};font-weight:600">${p.similarity}%</td><td class="mono">${esc(p.a.username)} <span class="faint">(${num(p.a.score)}đ)</span></td><td class="mono">${esc(p.b.username)} <span class="faint">(${num(p.b.score)}đ)</span></td><td><button class="btn-line" style="height:28px;font-size:12.5px" data-compare="${p.a.submissionId}:${p.b.submissionId}">So sánh code</button></td></tr>`)
            .join('')}</tbody>
        </table>
        ${s.pairs.length ? '' : `<div class="empty">Không có cặp bài nào giống từ ${threshold}% trở lên.</div>`}
      </div>`);
  }

  const views = { monitor, board, similar };
  async function draw() {
    clearTimeout(timer);
    try {
      await views[tab]();
    } catch (err) {
      ctx.page.innerHTML = `<div class="panel pad"><b>Có lỗi</b><span class="muted">${esc(err.message)}</span></div>`;
    }
    if (tab === 'monitor') timer = setTimeout(draw, 5000);
  }

  let logTimer = null;
  ctx.page.addEventListener('input', (e) => {
    if (e.target.dataset.logq === undefined) return;
    logQ = e.target.value;
    drawLog();
    clearTimeout(logTimer);
    logTimer = setTimeout(async () => {
      await loadFullLog().catch(() => (fullLog = null));
      drawLog();
    }, 250);
  });
  ctx.page.addEventListener('click', async (e) => {
    const t = e.target;
    const g = (k) => t.closest(`[data-${k}]`);
    if (g('tab')) {
      tab = g('tab').dataset.tab;
      history.replaceState(null, '', `#/contests/${id}/${tab}`);
      return draw();
    }
    if (g('unlock')) {
      const name = g('unlock').dataset.name;
      if (!(await confirmDialog({ title: `Mở khóa cho ${name}?`, body: 'Thí sinh sẽ vào lại được từ máy/tab khác (dùng khi máy hỏng hoặc trình duyệt bị treo). Nếu thí sinh đã nộp kết thúc, mở khóa sẽ cho làm tiếp.', cta: 'Mở khóa' }))) return;
      await api(`/api/admin/contests/${id}/participants/${g('unlock').dataset.unlock}/unlock`, { method: 'POST' });
      toast(`Đã mở khóa cho ${name}`);
      return draw();
    }
    if (g('log')) {
      logQ = g('log').dataset.log;
      await loadFullLog().catch(() => (fullLog = null));
      drawLog();
      ctx.page.querySelector('[data-logbox]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (g('logclear')) {
      logQ = '';
      fullLog = null;
      return drawLog();
    }
    if (g('publish')) {
      c = await api(`/api/admin/contests/${id}`, { method: 'PUT', body: { settings: { ...c.settings, publishResults: !c.settings.publishResults } } });
      toast(c.settings.publishResults ? 'Đã công bố kết quả' : 'Đã ẩn kết quả');
      return draw();
    }
    if (g('compare')) {
      const [a, b] = await Promise.all(g('compare').dataset.compare.split(':').map((sid) => api(`/api/admin/contests/${id}/submissions/${sid}`)));
      openDrawer({
        title: 'So sánh hai bài nộp',
        wide: true,
        html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${[a, b]
          .map((x) => `<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><b class="mono">${esc(x.username)} · ${num(x.score)} điểm</b><pre class="mono" style="margin:0;padding:10px;border-radius:8px;background:var(--bg3);font-size:12.5px;overflow:auto;max-height:70vh">${esc(x.source)}</pre></div>`)
          .join('')}</div>`,
      });
    }
  });
  ctx.page.addEventListener('change', (e) => {
    if (e.target.dataset.threshold !== undefined) {
      threshold = Number(e.target.value);
      draw();
    }
  });
  await draw();
  return () => clearTimeout(timer);
}
