import { api } from '../api.js';
import { diffColor, esc, go, toast } from '../ui.js';
import { pill, promptDialog } from './kit.js';
import { renderEditor } from './prob-editor.js';

const statusPill = (s) => (s === 'pub' ? pill('Đã xuất bản', 'var(--ac)') : s === 'deleted' ? pill('Thùng rác', 'var(--wa)') : pill('Nháp', 'var(--pd)'));
const sourceText = (p) => (p.origin === 'repo' ? 'Repo (git)' : p.overridesRepo ? 'Repo · đã sửa trên web' : 'Tạo trên web');

export async function render(ctx) {
  if (ctx.params[0]) return renderEditor(ctx, ctx.params[0]);

  ctx.setHead({ crumb: 'Bài tập', title: 'Bài tập', actions: '<button class="btn-dark" data-new>+ Tạo bài mới</button>' });
  const [problems, sets] = await Promise.all([api('/api/admin/problems'), api('/api/admin/sets')]);
  const f = { q: '', set: 'all', status: 'all' };

  ctx.page.innerHTML = `
    <div class="filters">
      <input class="ctl" data-q placeholder="Tìm theo mã hoặc tên bài" style="flex:1 1 240px;max-width:340px" />
      <select class="ctl" data-set aria-label="Lọc theo khối"><option value="all">Tất cả khối</option><option value="none">Chưa thuộc khối nào</option>${sets.map((s) => `<option value="${esc(s.id)}">${esc(s.short)}</option>`).join('')}</select>
      <select class="ctl" data-status aria-label="Lọc trạng thái"><option value="all">Mọi trạng thái</option><option value="pub">Đã xuất bản</option><option value="draft">Nháp</option><option value="deleted">Thùng rác</option></select>
      <span class="count" data-count></span>
    </div>
    <div class="panel" style="overflow:auto"><table class="atable" style="min-width:980px">
      <thead><tr>
        <th style="width:70px;white-space:nowrap">Mã</th>
        <th style="min-width:180px">Tên bài</th>
        <th style="min-width:200px;white-space:nowrap">Khối</th>
        <th style="width:130px;white-space:nowrap">Nguồn</th>
        <th style="width:90px;white-space:nowrap">Độ khó</th>
        <th class="num" style="width:60px;white-space:nowrap">Test</th>
        <th class="num" style="width:75px;white-space:nowrap">Bài nộp</th>
        <th class="num" style="width:80px;white-space:nowrap">Tỉ lệ AC</th>
        <th style="width:120px;white-space:nowrap">Trạng thái</th>
      </tr></thead>
      <tbody data-rows></tbody></table><div data-empty></div></div>`;

  function draw() {
    const q = f.q.trim().toLowerCase();
    const rows = problems.filter(
      (p) =>
        (f.status === 'all' ? p.status !== 'deleted' : p.status === f.status) &&
        (f.set === 'all' || (f.set === 'none' ? !p.sets.length : p.sets.some((s) => s.id === f.set))) &&
        (!q || `${p.id} ${p.title}`.toLowerCase().includes(q)),
    );
    ctx.page.querySelector('[data-count]').textContent = `${rows.length} bài`;
    ctx.page.querySelector('[data-rows]').innerHTML = rows
      .map(
        (p) => `<tr class="click" data-open="${esc(p.id)}">
          <td class="mono muted" style="white-space:nowrap">${esc(p.id)}</td>
          <td style="font-weight:500">${esc(p.title)}</td>
          <td class="muted" style="white-space:nowrap">${p.sets.map((s) => esc(s.short)).join(', ') || '—'}</td>
          <td class="muted" style="font-size:13px;white-space:nowrap">${sourceText(p)}</td>
          <td style="color:${diffColor(p.difficulty)};white-space:nowrap">${esc(p.difficulty)}</td>
          <td class="num" style="white-space:nowrap">${p.tests}</td>
          <td class="num" style="white-space:nowrap">${p.submissions}</td>
          <td class="num" style="white-space:nowrap">${p.acRate}%</td>
          <td style="white-space:nowrap">${statusPill(p.status)}</td></tr>`,
      )
      .join('');
    ctx.page.querySelector('[data-empty]').innerHTML = rows.length
      ? ''
      : '<div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:10px">Không có bài nào khớp bộ lọc.<button class="btn-line" data-clear>Xóa bộ lọc</button></div>';
  }

  ctx.page.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) (f.q = e.target.value), draw();
  });
  ctx.page.addEventListener('change', (e) => {
    if (e.target.matches('[data-set]')) (f.set = e.target.value), draw();
    if (e.target.matches('[data-status]')) (f.status = e.target.value), draw();
  });
  ctx.page.addEventListener('click', (e) => {
    const row = e.target.closest('[data-open]');
    if (row) return go(`#/probs/${encodeURIComponent(row.dataset.open)}`);
    if (e.target.closest('[data-clear]')) {
      Object.assign(f, { q: '', set: 'all', status: 'all' });
      ctx.page.querySelector('[data-q]').value = '';
      ctx.page.querySelector('[data-set]').value = 'all';
      ctx.page.querySelector('[data-status]').value = 'all';
      draw();
    }
  });
  ctx.actions().addEventListener('click', async (e) => {
    if (!e.target.closest('[data-new]')) return;
    const nums = problems.map((p) => Number(/^P(\d+)$/.exec(p.id)?.[1] || 0));
    const suggestion = `P${String(Math.max(0, ...nums) + 1).padStart(2, '0')}`;
    const id = await promptDialog({
      title: 'Tạo bài mới',
      body: 'Bài mới được lưu dạng nháp. Sau khi soạn đề, thêm test và kiểm tra lời giải thì bấm Xuất bản.',
      label: 'Mã bài (chữ in hoa, số, dấu _)',
      value: suggestion,
      mono: true,
    });
    if (!id) return;
    try {
      const p = await api('/api/admin/problems', { method: 'POST', body: { id } });
      toast(`Đã tạo ${p.id} (nháp)`);
      go(`#/probs/${encodeURIComponent(p.id)}`);
    } catch (err) {
      toast(err.message);
    }
  });
  draw();
}
