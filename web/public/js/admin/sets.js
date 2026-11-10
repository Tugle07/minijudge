import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { confirmDialog, hueColor, makeSortable, openDrawer, pill, SET_STATUS, SWATCH_HUES } from './kit.js';

const DIFFS = ['Dễ', 'Trung bình', 'Khó'];
const VIS = [
  ['public', '🌐 Công khai'],
  ['unlisted', '🔗 Có link'],
  ['restricted', '🔒 Chỉ định'],
  ['draft', '📝 Nháp'],
];

function setVisBadge(s) {
  const v = s.visibility || (s.status === 'draft' ? 'draft' : s.status === 'hidden' ? 'unlisted' : 'public');
  if (v === 'public') return pill('Công khai', 'var(--ac)');
  if (v === 'unlisted') return pill('Có link', '#0284c7');
  if (v === 'restricted') {
    const n = Array.isArray(s.allowUsers) ? s.allowUsers.length : 0;
    return pill(`Chỉ định (${n})`, '#ea580c');
  }
  return pill('Nháp', 'var(--pd)');
}
/* datetime-local cần dạng YYYY-MM-DDTHH:mm; ngày không kèm giờ (từ sets.json) hiểu là 23:59 ngày đó. */
const toLocal = (v) => (!v ? '' : String(v).length === 10 ? `${v}T23:59` : String(v).slice(0, 16));
const deadlineLabel = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}${d.length > 10 ? ` ${d.slice(11, 16)}` : ''}` : '—');

export async function render(ctx) {
  ctx.setHead({ crumb: 'Khối bài tập', title: 'Khối bài tập', actions: '<button class="btn-dark" data-new>+ Tạo khối mới</button>' });
  let sets = [];
  let problems = [];
  let selectedIds = new Set();
  let query = '';
  let groupFilter = 'all';
  let statusFilter = 'all';

  async function load() {
    [sets, problems] = await Promise.all([api('/api/admin/sets'), api('/api/admin/problems')]);
    problems = problems.filter((p) => p.status !== 'deleted');
    // prune selectedIds that no longer exist
    const setIds = new Set(sets.map((s) => s.id));
    selectedIds = new Set([...selectedIds].filter((id) => setIds.has(id)));
    draw();
  }

  function draw() {
    const knownCourses = [...new Set(sets.map((s) => (s.group || '').trim()).filter(Boolean))].sort();

    const q = query.trim().toLowerCase();
    const filtered = sets.filter((s) => {
      if (q && !`${s.title} ${s.id} ${s.group || ''} ${(s.tags || []).join(' ')}`.toLowerCase().includes(q)) return false;
      if (groupFilter === '__unassigned__' && (s.group || '').trim()) return false;
      if (groupFilter !== 'all' && groupFilter !== '__unassigned__' && (s.group || '').trim() !== groupFilter) return false;
      if (statusFilter !== 'all') {
        const v = s.visibility || (s.status === 'draft' ? 'draft' : s.status === 'hidden' ? 'unlisted' : 'public');
        if (statusFilter === 'public' && v !== 'public' && s.status !== 'open') return false;
        if (statusFilter === 'unlisted' && v !== 'unlisted' && s.status !== 'hidden') return false;
        if (statusFilter === 'restricted' && v !== 'restricted') return false;
        if (statusFilter === 'draft' && v !== 'draft' && s.status !== 'draft') return false;
        if (statusFilter === 'open' && (s.status !== 'open' && s.status !== 'closed')) return false;
        if (statusFilter === 'hidden' && s.status !== 'hidden') return false;
      }
      return true;
    });

    const allChecked = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

    ctx.page.innerHTML = `
      <!-- Thanh tìm kiếm & lọc khối bài tập -->
      <div class="filters" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <input class="ctl" data-q placeholder="Tìm khối (tên, mã, tag)…" value="${esc(query)}" style="flex:1 1 200px;max-width:280px" />
        <select class="ctl" data-group-filter style="max-width:230px">
          <option value="all" ${groupFilter === 'all' ? 'selected' : ''}>Tất cả khóa học</option>
          <option value="__unassigned__" ${groupFilter === '__unassigned__' ? 'selected' : ''}>⚡ Khối tự do (chưa gán)</option>
          ${knownCourses.map((c) => `<option value="${esc(c)}" ${groupFilter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <select class="ctl" data-status-filter style="max-width:160px">
          <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Mọi trạng thái</option>
          <option value="public" ${statusFilter === 'public' ? 'selected' : ''}>🌐 Công khai</option>
          <option value="unlisted" ${statusFilter === 'unlisted' ? 'selected' : ''}>🔗 Có link</option>
          <option value="restricted" ${statusFilter === 'restricted' ? 'selected' : ''}>🔒 Chỉ định</option>
          <option value="draft" ${statusFilter === 'draft' ? 'selected' : ''}>📝 Nháp</option>
        </select>
        <span class="count" style="margin-left:auto">${filtered.length}/${sets.length} khối</span>
      </div>

      <!-- Thanh thao tác nhanh khi chọn nhiều (Bulk Action Bar) -->
      ${
        selectedIds.size > 0
          ? `
        <div class="bulk-bar" style="display:flex;align-items:center;gap:12px;padding:9px 16px;background:color-mix(in oklch, var(--accent) 12%, var(--bg3));border:1.5px solid var(--accent);border-radius:var(--r-md);margin-bottom:12px;flex-wrap:wrap">
          <span style="font-weight:600;font-size:13.5px;color:var(--fg)">Đã chọn <b>${selectedIds.size}</b> khối bài tập</span>
          <div style="display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap">
            <select class="ctl" data-bulk-course style="font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg)">
              <option value="">⚡ Gán nhanh vào khóa học…</option>
              ${knownCourses.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
              <option value="__unassigned__">— Gỡ khỏi khóa (Khối tự do) —</option>
            </select>
            <select class="ctl" data-bulk-status style="font-size:13px;padding:4px 10px;border-radius:6px;background:var(--bg)">
              <option value="">⚡ Đổi chế độ hiển thị…</option>
              <option value="public">🌐 Công khai</option>
              <option value="unlisted">🔗 Chỉ xem khi có link</option>
              <option value="restricted">🔒 Chỉ định tài khoản</option>
              <option value="draft">📝 Bản nháp</option>
            </select>
            <button type="button" class="btn-ghost" data-bulk-clear style="font-size:13px;padding:4px 10px;border:1px solid var(--line2)">✕ Bỏ chọn</button>
          </div>
        </div>`
          : ''
      }

      <div class="panel">
        <table class="atable">
          <thead>
            <tr>
              <th style="width:38px;text-align:center">
                <input type="checkbox" data-check-all ${allChecked ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer" title="Chọn tất cả khối đang hiển thị" />
              </th>
              <th>Tên khối</th>
              <th>Khóa học</th>
              <th class="num">Số bài</th>
              <th>Trạng thái</th>
              <th>Hạn nộp</th>
              <th style="width:180px">Lớp hoàn thành</th>
              <th style="width:56px"></th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map((s) => {
                const isChecked = selectedIds.has(s.id);
                return `
              <tr style="${isChecked ? 'background:color-mix(in oklch, var(--accent) 8%, transparent)' : ''}">
                <td style="text-align:center">
                  <input type="checkbox" data-set-check="${esc(s.id)}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer" />
                </td>
                <td>
                  <button class="link-btn" data-edit="${esc(s.id)}" style="display:flex;align-items:center;gap:10px;color:var(--fg);font-weight:500;text-align:left">
                    <span class="swatch-dot" style="background:${hueColor(s.hue)}"></span>${esc(s.title)}
                  </button>
                </td>
                <td>
                  ${
                    s.group
                      ? `<span class="chip-sm" style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;background:var(--bg3);font-size:12px;color:var(--fg2);border:1px solid var(--line2)">${esc(s.group)}</span>`
                      : '<span class="faint" style="font-size:12px;color:var(--wa)">Tự do (chưa gán)</span>'
                  }
                </td>
                <td class="num font-mono">${s.problems.length}</td>
                <td>${setVisBadge(s)}</td>
                <td class="mono muted">${deadlineLabel(s.deadline)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="progress" style="flex:1"><div style="width:${s.completion}%"></div></div>
                    <span class="mono muted" style="width:38px;text-align:right">${s.completion}%</span>
                  </div>
                </td>
                <td class="row-menu">
                  <button class="dots-btn" data-menu aria-haspopup="menu" aria-label="Thao tác">⋯</button>
                  <div class="menu" role="menu" hidden>
                    <button data-edit="${esc(s.id)}">Sửa</button>
                    <button data-dup="${esc(s.id)}">Nhân bản</button>
                    <button data-hide="${esc(s.id)}">${s.status === 'hidden' ? 'Hiện lại' : 'Ẩn'}</button>
                    <button class="danger" data-del="${esc(s.id)}">Xóa</button>
                  </div>
                </td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
        ${sets.length ? '' : '<div class="empty">Chưa có khối nào. Bấm <b style="color:var(--fg)">Tạo khối mới</b> để bắt đầu.</div>'}
      </div>`;
  }

  function openEditor(set) {
    const isNew = !set;
    const f = set
      ? {
          ...set,
          visibility: set.visibility || (set.status === 'draft' ? 'draft' : set.status === 'hidden' ? 'unlisted' : 'public'),
          allowUsers: Array.isArray(set.allowUsers) ? set.allowUsers : [],
          openAt: toLocal(set.openAt),
          deadline: toLocal(set.deadline),
        }
      : { title: '', group: '', desc: '', hue: SWATCH_HUES[4], tags: [], difficulty: 'Trung bình', visibility: 'public', allowUsers: [], openAt: '', deadline: '', status: 'draft', problems: [] };
    let errors = {};
    const titleOf = (id) => problems.find((p) => p.id === id)?.title ?? id;

    const body = () => `
      <label class="afield"><span>Tên khối</span><input class="input ${errors.title ? 'err' : ''}" data-f="title" value="${esc(f.title)}" placeholder="vd. Tuần 3 — Sắp xếp & Tìm kiếm" />${errors.title ? `<span class="err-text">${esc(errors.title)}</span>` : ''}</label>
      <label class="afield"><span>Khóa học</span>${(() => {
        const known = [...new Set(sets.map((s) => s.group).filter(Boolean))];
        const isCustom = f.group && !known.includes(f.group);
        return `
        <select class="input" data-f="group-select">
          <option value="">— Không thuộc khóa nào (Khối tự do) —</option>
          ${known.map((g) => `<option value="${esc(g)}" ${f.group === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}
          <option value="__new__" ${isCustom ? 'selected' : ''}>+ Tạo khóa mới…</option>
        </select>
        <input class="input" data-f="group-new" value="${isCustom ? esc(f.group) : ''}" placeholder="Nhập tên khóa mới" style="display:${isCustom ? 'block' : 'none'};margin-top:6px" />`;
      })()}
        <span class="help">Trang chủ gom các khối cùng khóa thành một mục. Bấm vào tên khóa để xem trang riêng.</span></label>
      <label class="afield"><span>Mô tả</span><input class="input" data-f="desc" value="${esc(f.desc)}" placeholder="Một dòng ngắn" /></label>
      <div class="afield"><span>Màu đại diện</span><div class="swatches">${SWATCH_HUES.map((h) => `<button type="button" class="${h === f.hue ? 'on' : ''}" style="background:${hueColor(h)}" data-hue="${h}" aria-label="Chọn màu" aria-pressed="${h === f.hue}"></button>`).join('')}</div></div>
      <div class="afield"><span>Nhãn chủ đề</span><div class="tag-input">${f.tags.map((t, i) => `<span class="chip-x">${esc(t)}<button type="button" data-untag="${i}" aria-label="Bỏ nhãn">×</button></span>`).join('')}<input data-tag placeholder="Nhập rồi Enter" /></div></div>
      <div class="afield"><span>Độ khó</span><div class="seg" role="radiogroup">${DIFFS.map((d) => `<button type="button" role="radio" class="${d === f.difficulty ? 'on' : ''}" data-diff="${d}">${d}</button>`).join('')}</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="afield"><span>Thời gian mở</span><input class="input" type="datetime-local" data-f="openAt" value="${esc(f.openAt)}" /></label>
        <label class="afield"><span>Hạn nộp</span><input class="input ${errors.deadline ? 'err' : ''}" type="datetime-local" data-f="deadline" value="${esc(f.deadline)}" /></label>
        ${errors.deadline ? `<span class="err-text" style="grid-column:1/-1;font-size:13px;color:var(--wa)">${esc(errors.deadline)}</span>` : ''}
      </div>
      <div class="afield"><span>Hiển thị & Quyền truy cập</span>
        <div style="display:flex;flex-wrap:wrap;gap:16px">${VIS.map(([k, l]) => `<label style="display:flex;align-items:center;gap:7px;font-size:14px;cursor:pointer"><input type="radio" name="vis" value="${k}" ${(f.visibility || 'public') === k ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent)" />${l}</label>`).join('')}</div>
        <div data-set-allow-users-box style="margin-top:10px;${f.visibility === 'restricted' ? '' : 'display:none'}">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <span style="font-weight:600;font-size:12.5px;color:var(--accent)">Danh sách tài khoản được phép truy cập (Username)</span>
            <span class="faint" style="font-size:11.5px">Mỗi tài khoản 1 dòng hoặc cách nhau bằng dấu phẩy</span>
          </div>
          <textarea class="input font-mono" data-f="allowUsers" rows="3" placeholder="sinhvien01, sinhvien02" style="font-size:12.5px;line-height:1.5">${esc(Array.isArray(f.allowUsers) ? f.allowUsers.join('\n') : f.allowUsers || '')}</textarea>
        </div>
        <span class="help">Công khai: sinh viên thấy khối từ thời gian mở. Có link: chỉ ai có link mới mở được. Chỉ định: chỉ tài khoản trong danh sách.</span></div>
      <div class="afield">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:14px;font-weight:500">Bài trong khối</span><span class="faint" style="font-size:13px">${f.problems.length} bài · kéo ⋮⋮ để sắp thứ tự</span></div>
        <div style="position:relative"><input class="input" data-addq placeholder="Tìm bài để thêm (mã hoặc tên)" autocomplete="off" /><div class="suggest" data-suggest hidden></div></div>
        <div class="order-list" data-order>${
          f.problems.length
            ? f.problems
                .map(
                  (p, i) => `<div class="order-row" draggable="true" data-idx="${i}"><button type="button" class="grip" aria-label="Kéo để sắp xếp (Alt + ↑/↓)">⋮⋮</button><span class="mono faint" style="width:22px;font-size:13px">${i + 1}</span><span class="mono muted" style="font-weight:500;font-size:13.5px">${esc(p)}</span><span class="ellipsis" style="flex:1;font-size:14px">${esc(titleOf(p))}</span><button type="button" class="icon-x" data-rm="${i}" aria-label="Gỡ khỏi khối">×</button></div>`,
                )
                .join('')
            : '<div class="faint" style="padding:20px;text-align:center;font-size:14px">Chưa có bài nào. Tìm bài ở ô phía trên để thêm.</div>'
        }</div>
      </div>`;

    const drawer = openDrawer({
      title: isNew ? 'Tạo khối mới' : 'Sửa khối',
      html: body(),
      footer: '<button class="btn-line" data-close>Hủy</button><button class="btn-dark" data-save>Lưu khối</button>',
    });
    const el = drawer.el;
    const redraw = () => {
      el.querySelector('.drawer-body').innerHTML = body();
      bindSortable();
    };
    const bindSortable = () =>
      makeSortable(el.querySelector('[data-order]'), () => f.problems, (list) => {
        f.problems = list;
        redraw();
      });
    bindSortable();

    el.addEventListener('input', (e) => {
      const k = e.target.dataset.f;
      if (k === 'group-new') { f.group = e.target.value; return; }
      if (k && k !== 'group-select') f[k] = e.target.value;
      if (e.target.matches('[data-addq]')) {
        const q = e.target.value.trim().toLowerCase();
        const box = el.querySelector('[data-suggest]');
        const hits = q ? problems.filter((p) => !f.problems.includes(p.id) && `${p.id} ${p.title}`.toLowerCase().includes(q)).slice(0, 6) : [];
        box.hidden = !hits.length;
        box.innerHTML = hits.map((p) => `<button type="button" data-add="${esc(p.id)}"><span class="mono muted">${esc(p.id)}</span>${esc(p.title)}<span class="faint" style="margin-left:auto">+ Thêm</span></button>`).join('');
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.name === 'vis') {
        f.visibility = e.target.value;
        if (f.visibility === 'draft') f.status = 'draft';
        else if (f.visibility === 'unlisted') f.status = 'hidden';
        else f.status = 'open';
        const box = el.querySelector('[data-set-allow-users-box]');
        if (box) box.style.display = f.visibility === 'restricted' ? 'block' : 'none';
        return;
      }
      if (e.target.dataset.f === 'group-select') {
        const v = e.target.value;
        const newInput = el.querySelector('[data-f="group-new"]');
        if (v === '__new__') {
          newInput.style.display = 'block';
          newInput.value = '';
          f.group = '';
          newInput.focus();
        } else {
          newInput.style.display = 'none';
          f.group = v;
        }
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.target.matches('[data-tag]') && e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        f.tags = [...new Set([...f.tags, e.target.value.trim()])];
        redraw();
        el.querySelector('[data-tag]').focus();
      }
    });
    el.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('[data-hue]')) return (f.hue = Number(t.closest('[data-hue]').dataset.hue)), redraw();
      if (t.closest('[data-diff]')) return (f.difficulty = t.closest('[data-diff]').dataset.diff), redraw();
      if (t.closest('[data-untag]')) return f.tags.splice(Number(t.closest('[data-untag]').dataset.untag), 1), redraw();
      if (t.closest('[data-rm]')) return f.problems.splice(Number(t.closest('[data-rm]').dataset.rm), 1), redraw();
      if (t.closest('[data-add]')) return f.problems.push(t.closest('[data-add]').dataset.add), redraw();
      if (t.closest('[data-save]')) {
        try {
          const ausersInput = el.querySelector('[data-f="allowUsers"]');
          const allowUsers = ausersInput
            ? ausersInput.value.split(/[\r\n,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
            : (Array.isArray(f.allowUsers) ? f.allowUsers : []);
          await api(`/api/admin/sets/${isNew ? 'new' : encodeURIComponent(set.id)}`, {
            method: 'PUT',
            body: {
              ...f,
              visibility: f.visibility || 'public',
              allowUsers,
              openAt: f.openAt || null,
              deadline: f.deadline || null,
            },
          });
          drawer.close();
          toast('Đã lưu khối');
          load();
        } catch (err) {
          errors = err.fields || {};
          if (!Object.keys(errors).length) toast(err.message);
          redraw();
        }
      }
    });
  }

  // Filter input listeners
  ctx.page.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) {
      query = e.target.value;
      draw();
    }
  });

  ctx.page.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.matches('[data-group-filter]')) {
      groupFilter = t.value;
      draw();
      return;
    }
    if (t.matches('[data-status-filter]')) {
      statusFilter = t.value;
      draw();
      return;
    }
    if (t.matches('[data-check-all]')) {
      const q = query.trim().toLowerCase();
      const filtered = sets.filter((s) => {
        if (q && !`${s.title} ${s.id} ${s.group || ''} ${(s.tags || []).join(' ')}`.toLowerCase().includes(q)) return false;
        if (groupFilter === '__unassigned__' && (s.group || '').trim()) return false;
        if (groupFilter !== 'all' && groupFilter !== '__unassigned__' && (s.group || '').trim() !== groupFilter) return false;
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        return true;
      });

      if (t.checked) {
        filtered.forEach((s) => selectedIds.add(s.id));
      } else {
        filtered.forEach((s) => selectedIds.delete(s.id));
      }
      draw();
      return;
    }
    if (t.matches('[data-set-check]')) {
      const id = t.dataset.setCheck;
      if (t.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      draw();
      return;
    }
    if (t.matches('[data-bulk-course]')) {
      const val = t.value;
      if (!val) return;
      const targetGroup = val === '__unassigned__' ? '' : val;
      const count = selectedIds.size;
      try {
        await api('/api/admin/sets-batch', {
          method: 'POST',
          body: { ids: Array.from(selectedIds), group: targetGroup },
        });
        toast(targetGroup ? `Đã gán ${count} khối vào khóa học "${targetGroup}"` : `Đã chuyển ${count} khối thành khối tự do`);
        selectedIds.clear();
        await load();
      } catch (err) {
        toast(err.message || 'Lỗi khi cập nhật khóa học');
      }
      return;
    }
    if (t.matches('[data-bulk-status]')) {
      const val = t.value;
      if (!val) return;
      const count = selectedIds.size;
      try {
        await api('/api/admin/sets-batch', {
          method: 'POST',
          body: { ids: Array.from(selectedIds), visibility: val, status: val },
        });
        toast(`Đã cập nhật trạng thái cho ${count} khối bài`);
        selectedIds.clear();
        await load();
      } catch (err) {
        toast(err.message || 'Lỗi khi cập nhật trạng thái');
      }
      return;
    }
  });

  const onClick = async (e) => {
    const t = e.target;
    if (t.closest('[data-bulk-clear]')) {
      selectedIds.clear();
      draw();
      return;
    }

    const menuBtn = t.closest('[data-menu]');
    if (menuBtn) {
      const m = menuBtn.nextElementSibling;
      ctx.page.querySelectorAll('.row-menu .menu').forEach((x) => x !== m && (x.hidden = true));
      m.hidden = !m.hidden;
      return;
    }
    const id = (k) => t.closest(`[data-${k}]`)?.dataset[k];
    if (t.closest('[data-new]')) return openEditor(null);
    if (id('edit')) return openEditor(sets.find((s) => s.id === id('edit')));
    if (id('dup')) {
      const s = sets.find((x) => x.id === id('dup'));
      await api('/api/admin/sets/new', { method: 'PUT', body: { ...s, id: undefined, title: `${s.title} (bản sao)`, status: 'draft' } });
      toast('Đã nhân bản khối');
      return load();
    }
    if (id('hide')) {
      const s = sets.find((x) => x.id === id('hide'));
      await api(`/api/admin/sets/${encodeURIComponent(s.id)}/status`, { method: 'PATCH', body: { status: s.status === 'hidden' ? 'open' : 'hidden' } });
      toast(s.status === 'hidden' ? 'Đã hiện lại khối' : 'Đã ẩn khối khỏi sinh viên');
      return load();
    }
    if (id('del')) {
      const s = sets.find((x) => x.id === id('del'));
      const ok = await confirmDialog({
        title: `Xóa khối '${s.title.split(' — ')[0]}'?`,
        body: `Khối có ${s.problems.length} bài và ${s.submissions} bài nộp. Bài tập không bị xóa, chỉ gỡ khỏi khối.`,
        cta: 'Xóa khối',
        danger: true,
      });
      if (!ok) return;
      await api(`/api/admin/sets/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
      toast('Đã xóa khối');
      load();
    }
  };
  ctx.page.addEventListener('click', onClick);
  ctx.actions().addEventListener('click', onClick);
  await load();
}
