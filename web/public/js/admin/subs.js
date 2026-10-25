import { api } from '../api.js';
import { highlightC } from '../highlight.js';
import { badge, esc, toast, verdictLabel, verdictVar } from '../ui.js';
import { confirmDialog, fmtDateTime, openDrawer } from './kit.js';

const VERDICTS = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PENDING'];
const HEADS = [
  ['id', 'ID', true],
  [null, 'Thời gian', false],
  [null, 'Người nộp', false],
  [null, 'Bài', false],
  [null, 'Kết quả', false],
  ['time', 'Thời gian chạy', true],
  ['memory', 'Bộ nhớ', true],
];

const vText = (v) => `<span class="vtext" style="--v:${verdictVar(v)}">${badge(v)}<span style="white-space:nowrap">${esc(verdictLabel(v))}</span></span>`;

export async function render(ctx) {
  const [problems, sets] = await Promise.all([api('/api/admin/problems'), api('/api/admin/sets')]);
  const userFromHash = new URLSearchParams(location.hash.split('?')[1] || '').get('user') || '';
  const f = { user: userFromHash, problem: 'all', set: 'all', verdict: 'all', date: 'all', sort: 'id', dir: 'desc', page: 0 };
  let data = { rows: [], total: 0, page: 0, pageSize: 20 };
  const sel = new Set();
  let timer;

  const head = () =>
    ctx.setHead({ crumb: 'Bài nộp', title: 'Bài nộp', actions: `<button class="btn-dark" data-rejudge ${sel.size ? '' : 'disabled'}>Chấm lại ${sel.size ? `(${sel.size})` : ''}</button>` });

  ctx.page.innerHTML = `
    <div class="filters">
      <input class="ctl mono" data-f="user" value="${esc(f.user)}" placeholder="Người dùng" aria-label="Lọc người dùng" style="flex:0 1 180px;font-size:13.5px" />
      <select class="ctl" data-f="problem" aria-label="Lọc bài"><option value="all">Mọi bài</option>${problems.map((p) => `<option value="${esc(p.id)}">${esc(p.id)} · ${esc(p.title)}</option>`).join('')}</select>
      <select class="ctl" data-f="set" aria-label="Lọc khối"><option value="all">Mọi khối</option>${sets.map((s) => `<option value="${esc(s.id)}">${esc(s.short)}</option>`).join('')}</select>
      <select class="ctl" data-f="verdict" aria-label="Lọc kết quả"><option value="all">Mọi kết quả</option>${VERDICTS.map((v) => `<option value="${v}">${v === 'PENDING' ? 'Đang chấm' : v}</option>`).join('')}</select>
      <select class="ctl" data-f="date" aria-label="Lọc thời gian"><option value="all">Mọi lúc</option><option value="today">Hôm nay</option><option value="yday">Hôm qua</option></select>
      <span class="count" data-count></span>
    </div>
    <div class="panel" style="overflow:auto"><table class="atable" style="min-width:880px">
      <thead data-head></thead><tbody data-rows></tbody></table>
      <div data-empty></div>
      <div class="pager"><span data-pagelabel></span><div style="display:flex;gap:6px"><button class="btn-line" style="height:32px" data-prev>‹ Trước</button><button class="btn-line" style="height:32px" data-next>Sau ›</button></div></div>
    </div>`;
  const $ = (s) => ctx.page.querySelector(s);

  let alive = true;
  async function load() {
    clearTimeout(timer);
    try {
      const qs = new URLSearchParams({ ...f, page: String(f.page) });
      const fresh = await api(`/api/admin/submissions?${qs}`);
      if (!alive) return;
      data = fresh;
      draw();
    } catch {}
    if (alive) {
      const drawerOpen = document.querySelector('.drawer:not([hidden]), dialog[open], .modal-overlay:not([hidden])');
      timer = setTimeout(load, drawerOpen ? 6000 : 3000);
    }
  }

  function draw() {
    head();
    const allSel = data.rows.length && data.rows.every((r) => sel.has(r.id));
    $('[data-head]').innerHTML = `<tr><th style="width:44px"><input type="checkbox" data-all ${allSel ? 'checked' : ''} aria-label="Chọn tất cả trên trang" /></th>${HEADS.map(
      ([k, l, sortable], i) =>
        `<th class="${i >= 5 ? 'num' : ''}" ${k ? `aria-sort="${f.sort === k ? (f.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''}>${
          sortable ? `<button class="sort" data-sort="${k}" style="color:${f.sort === k ? 'var(--fg)' : 'inherit'}">${l} ${f.sort === k ? (f.dir === 'asc' ? '↑' : '↓') : ''}</button>` : l
        }</th>`,
    ).join('')}</tr>`;
    $('[data-rows]').innerHTML = data.rows
      .map(
        (r) => `<tr class="${sel.has(r.id) ? 'sel' : ''}">
          <td><input type="checkbox" data-sel="${r.id}" ${sel.has(r.id) ? 'checked' : ''} aria-label="Chọn bài nộp" /></td>
          <td><button class="link-btn mono" data-open="${r.id}" style="color:var(--fg);font-weight:500;text-decoration:underline;text-decoration-color:var(--line2);text-underline-offset:3px">#${r.id}</button></td>
          <td class="mono muted" style="white-space:nowrap">${fmtDateTime(r.created_at)}</td>
          <td class="mono">${esc(r.username)}</td>
          <td><span class="mono muted" style="margin-right:6px">${esc(r.problem_id)}</span>${esc(r.title)}</td>
          <td>${vText(r.verdict)}</td>
          <td class="num muted">${r.verdict === 'CE' || r.time_ms == null ? '—' : `${r.verdict === 'TLE' ? '> ' : ''}${r.time_ms} ms`}</td>
          <td class="num muted">${r.verdict === 'CE' || r.memory_kb == null ? '—' : `${r.memory_kb} KB`}</td></tr>`,
      )
      .join('');
    $('[data-empty]').innerHTML = data.rows.length
      ? ''
      : '<div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:10px">Không có bài nộp nào khớp bộ lọc.<button class="btn-line" data-clear>Xóa bộ lọc</button></div>';
    const from = data.page * data.pageSize;
    $('[data-count]').textContent = `${data.total} bài nộp`;
    $('[data-pagelabel]').textContent = data.total ? `${from + 1}–${Math.min(data.total, from + data.pageSize)} trên ${data.total}` : '0 kết quả';
    $('[data-prev]').disabled = data.page === 0;
    $('[data-next]').disabled = from + data.pageSize >= data.total;
  }

  async function openDetail(id) {
    const s = await api(`/api/admin/submissions/${id}`);
    const tests = s.tests.length
      ? s.tests
          .map(
            (t, i) => `<div style="display:grid;grid-template-columns:44px 1fr 80px 84px;gap:10px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line);font-size:14px">
              <span class="mono muted">#${i + 1}</span>${vText(t.verdict)}<span class="mono muted" style="text-align:right">${t.time_ms} ms</span><span class="mono muted" style="text-align:right">${t.memory_kb} KB</span></div>`,
          )
          .join('')
      : '';
    const drawer = openDrawer({
      wide: true,
      title: `<b class="mono" style="font-weight:600;font-size:16px">#${s.id}</b>${vText(s.verdict)}`,
      html: `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:14px">
          <div style="display:flex;flex-direction:column"><span class="faint" style="font-size:12.5px">Người nộp</span><span class="mono">${esc(s.username)}</span></div>
          <div style="display:flex;flex-direction:column"><span class="faint" style="font-size:12.5px">Bài</span><span>${esc(s.problemId)} · ${esc(s.title)}</span></div>
          <div style="display:flex;flex-direction:column"><span class="faint" style="font-size:12.5px">Thời điểm</span><span class="mono">${fmtDateTime(s.createdAt)}</span></div>
        </div>
        ${tests || s.compileLog ? `<div style="border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden">${tests}${s.compileLog ? `<pre class="celog" style="border:0;border-radius:0;max-height:160px">${esc(s.compileLog)}</pre>` : ''}</div>` : ''}
        <span style="font-size:12.5px;font-weight:600;color:var(--fg3);text-transform:uppercase;letter-spacing:.04em">Mã nguồn</span>
        <pre class="sub-code" tabindex="0" style="background:var(--bg2);max-height:none">${highlightC(s.source).html}</pre>`,
      footer: '<button class="btn-dark" data-rejudge-one>Chấm lại</button>',
    });
    drawer.el.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-rejudge-one]')) return;
      await api('/api/admin/rejudge', { method: 'POST', body: { ids: [s.id] } });
      toast('Đã đưa bài vào hàng đợi chấm lại');
      drawer.close();
      load();
    });
  }

  ctx.page.addEventListener('input', (e) => {
    if (e.target.dataset.f !== 'user') return;
    f.user = e.target.value;
    f.page = 0;
    clearTimeout(timer);
    timer = setTimeout(load, 300);
  });
  ctx.page.addEventListener('change', (e) => {
    const k = e.target.dataset.f;
    if (k && k !== 'user') {
      f[k] = e.target.value;
      f.page = 0;
      return load();
    }
    if (e.target.matches('[data-all]')) {
      data.rows.forEach((r) => (e.target.checked ? sel.add(r.id) : sel.delete(r.id)));
      return draw();
    }
    if (e.target.matches('[data-sel]')) {
      const id = Number(e.target.dataset.sel);
      e.target.checked ? sel.add(id) : sel.delete(id);
      draw();
    }
  });
  ctx.page.addEventListener('click', (e) => {
    const t = e.target;
    const sort = t.closest('[data-sort]');
    if (sort) {
      f.dir = f.sort === sort.dataset.sort && f.dir === 'desc' ? 'asc' : 'desc';
      f.sort = sort.dataset.sort;
      f.page = 0;
      return load();
    }
    if (t.closest('[data-open]')) return openDetail(Number(t.closest('[data-open]').dataset.open));
    if (t.closest('[data-prev]')) return (f.page -= 1), load();
    if (t.closest('[data-next]')) return (f.page += 1), load();
    if (t.closest('[data-clear]')) {
      Object.assign(f, { user: '', problem: 'all', set: 'all', verdict: 'all', date: 'all', page: 0 });
      ctx.page.querySelectorAll('[data-f]').forEach((el) => (el.value = el.dataset.f === 'user' ? '' : 'all'));
      load();
    }
  });
  ctx.actions().addEventListener('click', async (e) => {
    if (!e.target.closest('[data-rejudge]') || !sel.size) return;
    const ok = await confirmDialog({
      title: `Chấm lại ${sel.size} bài nộp?`,
      body: 'Kết quả cũ sẽ được thay bằng kết quả chấm mới với bộ test hiện tại.',
      cta: 'Chấm lại',
    });
    if (!ok) return;
    const { queued } = await api('/api/admin/rejudge', { method: 'POST', body: { ids: [...sel] } });
    sel.clear();
    toast(`Đã đưa ${queued} bài vào hàng đợi chấm lại`);
    load();
  });

  await load();
  return () => {
    alive = false;
    clearTimeout(timer);
  };
}
