import { api } from '../api.js';
import { diffColor, esc, go, toast } from '../ui.js';
import { confirmDialog, pill, promptDialog } from './kit.js';
import { renderEditor } from './prob-editor.js';

const statusPill = (s) => (s === 'pub' ? pill('Đã xuất bản', 'var(--ac)') : s === 'deleted' ? pill('Thùng rác', 'var(--wa)') : pill('Nháp', 'var(--pd)'));
const sourceText = (p) => (p.origin === 'repo' ? 'Repo (git)' : p.overridesRepo ? 'Repo · đã sửa trên web' : 'Tạo trên web');

export async function render(ctx) {
  if (ctx.params[0]) return renderEditor(ctx, ctx.params[0]);

  ctx.setHead({ crumb: 'Bài tập', title: 'Bài tập', actions: '<button class="btn-dark" data-new>+ Tạo bài mới</button>' });
  let [problems, sets] = await Promise.all([api('/api/admin/problems'), api('/api/admin/sets')]);
  const f = { q: '', set: 'all', status: 'all' };
  const selected = new Set();

  ctx.page.innerHTML = `
    <div class="filters">
      <input class="ctl" data-q placeholder="Tìm theo mã hoặc tên bài" style="flex:1 1 240px;max-width:340px" />
      <select class="ctl" data-set aria-label="Lọc theo khối"><option value="all">Tất cả khối</option><option value="none">Chưa thuộc khối nào</option>${sets.map((s) => `<option value="${esc(s.id)}">${esc(s.short)}</option>`).join('')}</select>
      <select class="ctl" data-status aria-label="Lọc trạng thái"><option value="all">Mọi trạng thái</option><option value="pub">Đã xuất bản</option><option value="draft">Nháp</option><option value="deleted">Thùng rác</option></select>
      <span class="count" data-count></span>
    </div>
    <div class="panel" style="overflow:auto"><table class="atable" style="min-width:1020px">
      <thead><tr>
        <th style="width:40px;text-align:center"><input type="checkbox" data-select-all title="Chọn tất cả bài hiển thị" style="cursor:pointer;width:16px;height:16px;accent-color:var(--accent);" /></th>
        <th style="width:70px;white-space:nowrap;text-align:center">Mã</th>
        <th style="min-width:180px">Tên bài</th>
        <th style="min-width:180px;white-space:nowrap">Khối</th>
        <th style="width:130px;white-space:nowrap">Nguồn</th>
        <th style="width:90px;white-space:nowrap;text-align:center">Độ khó</th>
        <th style="width:65px;white-space:nowrap;text-align:center">Test</th>
        <th style="width:75px;white-space:nowrap;text-align:center">Bài nộp</th>
        <th style="width:85px;white-space:nowrap;text-align:center">Tỉ lệ AC</th>
        <th style="width:120px;white-space:nowrap;text-align:center">Trạng thái</th>
      </tr></thead>
      <tbody data-rows></tbody></table><div data-empty></div></div>
    
    <div data-batch-bar hidden style="position:sticky;bottom:16px;z-index:90;background:var(--bg3);border:1.5px solid var(--accent);border-radius:var(--r-md);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);margin-top:14px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="pill" style="background:var(--accent);color:#fff;font-weight:700;font-size:12.5px;padding:3px 10px;" data-batch-count>Đã chọn 0 bài</span>
        <button class="link-btn" data-batch-clear style="font-size:13px;color:var(--fg2);font-weight:550;">Bỏ chọn</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <button class="btn-dark" data-batch-action="publish" style="background:#16a34a;color:#fff;border:none;padding:6px 14px;font-size:13px;font-weight:600;border-radius:var(--r-sm);cursor:pointer;display:inline-flex;align-items:center;gap:4px;">✓ Xuất bản</button>
        <button class="btn-line" data-batch-action="draft" style="padding:6px 14px;font-size:13px;font-weight:600;">Lưu nháp</button>
        <select class="ctl" data-batch-set style="height:32px;font-size:13px;padding:0 8px;">
          <option value="">+ Thêm vào khối...</option>
          ${sets.map((s) => `<option value="${esc(s.id)}">${esc(s.short)}</option>`).join('')}
        </select>
        ${f.status === 'deleted' ? '<button class="btn-line" data-batch-action="restore" style="padding:6px 14px;font-size:13px;font-weight:600;">Khôi phục</button>' : ''}
        <button class="btn-line danger" data-batch-action="delete" style="color:var(--wa);border-color:color-mix(in oklch, var(--wa) 35%, transparent);padding:6px 14px;font-size:13px;font-weight:600;">Xóa (Thùng rác)</button>
      </div>
    </div>`;

  function updateBatchBar(visibleRows) {
    const bar = ctx.page.querySelector('[data-batch-bar]');
    const countEl = ctx.page.querySelector('[data-batch-count]');
    const selectAll = ctx.page.querySelector('[data-select-all]');
    if (!bar) return;

    const n = selected.size;
    bar.hidden = n === 0;
    if (countEl) countEl.textContent = `Đã chọn ${n} bài`;

    if (selectAll) {
      const visibleIds = visibleRows.map((r) => r.id);
      selectAll.checked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
      selectAll.indeterminate = n > 0 && !selectAll.checked;
    }
  }

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
        (p) => `<tr class="click ${selected.has(p.id) ? 'selected-row' : ''}" data-open="${esc(p.id)}" style="${selected.has(p.id) ? 'background:color-mix(in oklch, var(--accent) 10%, transparent);' : ''}">
          <td style="text-align:center" data-stop-click><input type="checkbox" data-chk="${esc(p.id)}" ${selected.has(p.id) ? 'checked' : ''} style="cursor:pointer;width:16px;height:16px;accent-color:var(--accent);" /></td>
          <td class="mono muted" style="white-space:nowrap;text-align:center">${esc(p.id)}</td>
          <td style="font-weight:500">${esc(p.title)}</td>
          <td class="muted" style="white-space:nowrap">${p.sets.map((s) => esc(s.short)).join(', ') || '—'}</td>
          <td class="muted" style="font-size:13px;white-space:nowrap">${sourceText(p)}</td>
          <td style="color:${diffColor(p.difficulty)};white-space:nowrap;text-align:center">${esc(p.difficulty)}</td>
          <td class="mono" style="white-space:nowrap;text-align:center">${p.tests}</td>
          <td class="mono" style="white-space:nowrap;text-align:center">${p.submissions}</td>
          <td class="mono" style="white-space:nowrap;text-align:center">${p.acRate}%</td>
          <td style="white-space:nowrap;text-align:center">${statusPill(p.status)}</td></tr>`,
      )
      .join('');
    ctx.page.querySelector('[data-empty]').innerHTML = rows.length
      ? ''
      : '<div class="empty" style="display:flex;flex-direction:column;align-items:center;gap:10px">Không có bài nào khớp bộ lọc.<button class="btn-line" data-clear>Xóa bộ lọc</button></div>';

    updateBatchBar(rows);
  }

  ctx.page.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) (f.q = e.target.value), draw();
  });
  ctx.page.addEventListener('change', async (e) => {
    if (e.target.matches('[data-set]')) (f.set = e.target.value), draw();
    if (e.target.matches('[data-status]')) (f.status = e.target.value), draw();

    // Checkbox chọn bài đơn lẻ
    if (e.target.matches('[data-chk]')) {
      const id = e.target.dataset.chk;
      if (e.target.checked) selected.add(id);
      else selected.delete(id);
      draw();
    }

    // Checkbox chọn tất cả bài đang hiển thị
    if (e.target.matches('[data-select-all]')) {
      const q = f.q.trim().toLowerCase();
      const visible = problems.filter(
        (p) =>
          (f.status === 'all' ? p.status !== 'deleted' : p.status === f.status) &&
          (f.set === 'all' || (f.set === 'none' ? !p.sets.length : p.sets.some((s) => s.id === f.set))) &&
          (!q || `${p.id} ${p.title}`.toLowerCase().includes(q)),
      );
      if (e.target.checked) {
        visible.forEach((p) => selected.add(p.id));
      } else {
        visible.forEach((p) => selected.delete(p.id));
      }
      draw();
    }

    // Chọn Khối từ dropdown thao tác hàng loạt
    if (e.target.matches('[data-batch-set]') && e.target.value) {
      const setId = e.target.value;
      const ids = Array.from(selected);
      if (!ids.length) return;
      try {
        await api('/api/admin/problems/batch', { method: 'POST', body: { action: 'set_add', setId, ids } });
        toast(`Đã thêm ${ids.length} bài vào khối!`);
        selected.clear();
        [problems, sets] = await Promise.all([api('/api/admin/problems'), api('/api/admin/sets')]);
        draw();
      } catch (err) {
        toast(err.message);
      }
      e.target.value = '';
    }
  });

  ctx.page.addEventListener('click', async (e) => {
    // Ngăn click vào checkbox mở modal sửa bài
    if (e.target.closest('[data-stop-click]') || e.target.matches('[data-chk]') || e.target.matches('[data-select-all]')) {
      return;
    }

    // Thao tác hàng loạt (Batch actions)
    const batchBtn = e.target.closest('[data-batch-action]');
    if (batchBtn) {
      const act = batchBtn.dataset.batchAction;
      const ids = Array.from(selected);
      if (!ids.length) return;

      if (act === 'delete') {
        const ok = await confirmDialog({
          title: `Xóa ${ids.length} bài tập?`,
          body: `Các bài được chọn sẽ được chuyển vào Thùng rác và gỡ khỏi các khối bài tập.`,
          cta: 'Xóa bài',
          danger: true,
        });
        if (!ok) return;
      }

      try {
        await api('/api/admin/problems/batch', { method: 'POST', body: { action: act, ids } });
        const actLabel = act === 'publish' ? 'xuất bản' : act === 'draft' ? 'lưu nháp' : act === 'restore' ? 'khôi phục' : 'chuyển vào thùng rác';
        toast(`Đã ${actLabel} ${ids.length} bài tập!`);
        selected.clear();
        [problems, sets] = await Promise.all([api('/api/admin/problems'), api('/api/admin/sets')]);
        draw();
      } catch (err) {
        toast(err.message);
      }
      return;
    }

    // Bỏ chọn tất cả
    if (e.target.closest('[data-batch-clear]')) {
      selected.clear();
      draw();
      return;
    }

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
