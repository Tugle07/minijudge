import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { confirmDialog, hueColor, makeSortable, openDrawer, pill, SET_STATUS, SWATCH_HUES } from './kit.js';

const DIFFS = ['Dễ', 'Trung bình', 'Khó'];
const VIS = [
  ['open', 'Công khai'],
  ['hidden', 'Ẩn'],
  ['draft', 'Nháp'],
];
/* datetime-local cần dạng YYYY-MM-DDTHH:mm; ngày không kèm giờ (từ sets.json) hiểu là 23:59 ngày đó. */
const toLocal = (v) => (!v ? '' : String(v).length === 10 ? `${v}T23:59` : String(v).slice(0, 16));
const deadlineLabel = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}${d.length > 10 ? ` ${d.slice(11, 16)}` : ''}` : '—');

export async function render(ctx) {
  ctx.setHead({ crumb: 'Khối bài tập', title: 'Khối bài tập', actions: '<button class="btn-dark" data-new>+ Tạo khối mới</button>' });
  let sets = [];
  let problems = [];

  async function load() {
    [sets, problems] = await Promise.all([api('/api/admin/sets'), api('/api/admin/problems')]);
    draw();
  }

  function draw() {
    ctx.page.innerHTML = `
      <div class="panel">
        <table class="atable">
          <thead><tr><th>Tên khối</th><th class="num">Số bài</th><th>Trạng thái</th><th>Hạn nộp</th><th style="width:200px">Lớp hoàn thành</th><th style="width:56px"></th></tr></thead>
          <tbody>${sets
            .map(
              (s) => `
            <tr>
              <td><button class="link-btn" data-edit="${esc(s.id)}" style="display:flex;align-items:center;gap:10px;color:var(--fg);font-weight:500;text-align:left"><span class="swatch-dot" style="background:${hueColor(s.hue)}"></span>${esc(s.title)}</button></td>
              <td class="num">${s.problems.length}</td>
              <td>${pill(...SET_STATUS[s.status])}</td>
              <td class="mono muted">${deadlineLabel(s.deadline)}</td>
              <td><div style="display:flex;align-items:center;gap:10px"><div class="progress" style="flex:1"><div style="width:${s.completion}%"></div></div><span class="mono muted" style="width:38px;text-align:right">${s.completion}%</span></div></td>
              <td class="row-menu">
                <button class="dots-btn" data-menu aria-haspopup="menu" aria-label="Thao tác">⋯</button>
                <div class="menu" role="menu" hidden>
                  <button data-edit="${esc(s.id)}">Sửa</button>
                  <button data-dup="${esc(s.id)}">Nhân bản</button>
                  <button data-hide="${esc(s.id)}">${s.status === 'hidden' ? 'Hiện lại' : 'Ẩn'}</button>
                  <button class="danger" data-del="${esc(s.id)}">Xóa</button>
                </div>
              </td>
            </tr>`,
            )
            .join('')}</tbody>
        </table>
        ${sets.length ? '' : '<div class="empty">Chưa có khối nào. Bấm <b style="color:var(--fg)">Tạo khối mới</b> để bắt đầu.</div>'}
      </div>`;
  }

  function openEditor(set) {
    const isNew = !set;
    const f = set
      ? { ...set, openAt: toLocal(set.openAt), deadline: toLocal(set.deadline) }
      : { title: '', group: '', desc: '', hue: SWATCH_HUES[4], tags: [], difficulty: 'Trung bình', openAt: '', deadline: '', status: 'draft', problems: [] };
    let errors = {};
    const titleOf = (id) => problems.find((p) => p.id === id)?.title ?? id;

    const body = () => `
      <label class="afield"><span>Tên khối</span><input class="input ${errors.title ? 'err' : ''}" data-f="title" value="${esc(f.title)}" placeholder="vd. Tuần 3 — Sắp xếp & Tìm kiếm" />${errors.title ? `<span class="err-text">${esc(errors.title)}</span>` : ''}</label>
      <label class="afield"><span>Nhóm</span><input class="input" data-f="group" value="${esc(f.group || '')}" list="set-groups" placeholder="vd. Lộ trình KTLT" /><datalist id="set-groups">${[...new Set(sets.map((s) => s.group).filter(Boolean))].map((g) => `<option value="${esc(g)}"></option>`).join('')}</datalist><span class="help">Trang chủ gom các khối cùng nhóm thành một mục, theo thứ tự khối.</span></label>
      <label class="afield"><span>Mô tả</span><input class="input" data-f="desc" value="${esc(f.desc)}" placeholder="Một dòng ngắn" /></label>
      <div class="afield"><span>Màu đại diện</span><div class="swatches">${SWATCH_HUES.map((h) => `<button type="button" class="${h === f.hue ? 'on' : ''}" style="background:${hueColor(h)}" data-hue="${h}" aria-label="Chọn màu" aria-pressed="${h === f.hue}"></button>`).join('')}</div></div>
      <div class="afield"><span>Nhãn chủ đề</span><div class="tag-input">${f.tags.map((t, i) => `<span class="chip-x">${esc(t)}<button type="button" data-untag="${i}" aria-label="Bỏ nhãn">×</button></span>`).join('')}<input data-tag placeholder="Nhập rồi Enter" /></div></div>
      <div class="afield"><span>Độ khó</span><div class="seg" role="radiogroup">${DIFFS.map((d) => `<button type="button" role="radio" class="${d === f.difficulty ? 'on' : ''}" data-diff="${d}">${d}</button>`).join('')}</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="afield"><span>Thời gian mở</span><input class="input" type="datetime-local" data-f="openAt" value="${esc(f.openAt)}" /></label>
        <label class="afield"><span>Hạn nộp</span><input class="input ${errors.deadline ? 'err' : ''}" type="datetime-local" data-f="deadline" value="${esc(f.deadline)}" /></label>
        ${errors.deadline ? `<span class="err-text" style="grid-column:1/-1;font-size:13px;color:var(--wa)">${esc(errors.deadline)}</span>` : ''}
      </div>
      <div class="afield"><span>Hiển thị</span><div style="display:flex;flex-wrap:wrap;gap:16px">${VIS.map(([k, l]) => `<label style="display:flex;align-items:center;gap:7px;font-size:14.5px;cursor:pointer"><input type="radio" name="vis" value="${k}" ${f.status === k || (k === 'open' && f.status === 'closed') ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--fg)" />${l}</label>`).join('')}</div>
        <span class="help">Công khai: sinh viên thấy khối từ thời gian mở. Khối đã qua hạn vẫn hiện, ghi "Đã đóng" nếu bạn đóng nó trong menu ⋯.</span></div>
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
      if (k) f[k] = e.target.value;
      if (e.target.matches('[data-addq]')) {
        const q = e.target.value.trim().toLowerCase();
        const box = el.querySelector('[data-suggest]');
        const hits = q ? problems.filter((p) => !f.problems.includes(p.id) && `${p.id} ${p.title}`.toLowerCase().includes(q)).slice(0, 6) : [];
        box.hidden = !hits.length;
        box.innerHTML = hits.map((p) => `<button type="button" data-add="${esc(p.id)}"><span class="mono muted">${esc(p.id)}</span>${esc(p.title)}<span class="faint" style="margin-left:auto">+ Thêm</span></button>`).join('');
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.name === 'vis') f.status = e.target.value;
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
          await api(`/api/admin/sets/${isNew ? 'new' : encodeURIComponent(set.id)}`, { method: 'PUT', body: { ...f, openAt: f.openAt || null, deadline: f.deadline || null } });
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

  const onClick = async (e) => {
    const t = e.target;
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
