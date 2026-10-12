import { esc } from '../ui.js';

export const SWATCH_HUES = [200, 280, 160, 60, 20, 330];
export const hueColor = (h) => `oklch(0.72 0.12 ${h})`;
export const SET_STATUS = {
  draft: ['Nháp', 'var(--pd)'],
  open: ['Đang mở', 'var(--ac)'],
  closed: ['Đã đóng', 'var(--fg3)'],
  hidden: ['Ẩn', 'var(--tle)'],
};
export const pill = (label, color) =>
  `<span class="pill" style="color:${color};background:color-mix(in oklch, ${color} 14%, transparent)">${esc(label)}</span>`;

export const SKELETON = `
  <div aria-busy="true" style="display:flex;flex-direction:column;gap:16px">
    <div class="kpis">${'<div class="skel" style="height:96px"></div>'.repeat(4)}</div>
    <div class="panel pad">${[30, 85, 70, 78, 60].map((w) => `<div class="skel" style="height:14px;width:${w}%;border-radius:6px"></div>`).join('')}</div>
  </div>`;

/* Hộp thoại xác nhận, trả về Promise<boolean>. */
export function confirmDialog({ title, body, cta, danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'dialog-wrap';
    wrap.innerHTML = `
      <div class="dialog" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
        <b style="font-weight:600;font-size:17px">${esc(title)}</b>
        <p>${esc(body)}</p>
        <div class="actions"><button class="btn-line" data-no>Hủy</button><button class="${danger ? 'btn-danger' : 'btn-dark'}" data-yes>${esc(cta)}</button></div>
      </div>`;
    const close = (v) => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => e.key === 'Escape' && close(false);
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-yes]')) close(true);
      else if (e.target.closest('[data-no]') || e.target === wrap) close(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(wrap);
    wrap.querySelector('[data-yes]').focus();
  });
}

/* Hộp thoại nhập 1 giá trị, trả về Promise<string|null>. */
export function promptDialog({ title, body, label, value = '', cta = 'Tạo', mono = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'dialog-wrap';
    wrap.innerHTML = `
      <form class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <b style="font-weight:600;font-size:17px">${esc(title)}</b>
        ${body ? `<p>${esc(body)}</p>` : ''}
        <label class="afield"><span>${esc(label)}</span><input class="input" value="${esc(value)}" style="${mono ? 'font-family:var(--font-code)' : ''}" /></label>
        <div class="actions"><button type="button" class="btn-line" data-no>Hủy</button><button type="submit" class="btn-dark">${esc(cta)}</button></div>
      </form>`;
    const input = wrap.querySelector('input');
    const close = (v) => {
      wrap.remove();
      resolve(v);
    };
    wrap.addEventListener('click', (e) => (e.target.closest('[data-no]') || e.target === wrap) && close(null));
    wrap.addEventListener('keydown', (e) => e.key === 'Escape' && close(null));
    wrap.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      close(input.value.trim() || null);
    });
    document.body.append(wrap);
    input.focus();
    input.select();
  });
}

/* Ngăn kéo bên phải. Trả về { el, close }. */
export function openDrawer({ title, html, wide = false, footer = '', onClose }) {
  const host = document.createElement('div');
  host.innerHTML = `
    <div class="overlay" data-close></div>
    <aside class="drawer ${wide ? 'wide' : ''}" role="dialog" aria-label="${esc(title)}">
      <div class="drawer-head">${title.startsWith('<') ? title : `<b style="font-weight:600;font-size:17px">${esc(title)}</b>`}<button class="x" data-close aria-label="Đóng">×</button></div>
      <div class="drawer-body">${html}</div>
      ${footer ? `<div class="drawer-foot">${footer}</div>` : ''}
    </aside>`;
  const close = () => {
    host.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  host.addEventListener('click', (e) => e.target.closest('[data-close]') && close());
  document.addEventListener('keydown', onKey);
  document.body.append(host);
  return { el: host.querySelector('.drawer'), close };
}

/* Danh sách kéo thả để sắp thứ tự (chuột) + Alt+↑/↓ (bàn phím). Mỗi hàng có data-idx = vị trí
 * ban đầu. Khi kéo chỉ di chuyển DOM; thả chuột mới gọi onChange(mảng theo thứ tự mới). */
export function makeSortable(container, getItems, onChange) {
  let dragged = null;
  container.addEventListener('dragstart', (e) => {
    dragged = e.target.closest('[data-idx]');
    if (!dragged) return;
    dragged.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', dragged.dataset.idx);
    } catch {}
  });
  container.addEventListener('dragover', (e) => {
    const row = e.target.closest('[data-idx]');
    if (!dragged || !row || row === dragged) return;
    e.preventDefault();
    const rect = row.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    row.parentNode.insertBefore(dragged, after ? row.nextSibling : row);
  });
  container.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('dragging');
    dragged = null;
    const items = getItems();
    const order = [...container.querySelectorAll('[data-idx]')].map((r) => items[Number(r.dataset.idx)]);
    if (order.some((x, i) => x !== items[i])) onChange(order);
  });
  container.addEventListener('keydown', (e) => {
    const row = e.target.closest('[data-idx]');
    if (!row || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const i = Number(row.dataset.idx);
    const j = i + (e.key === 'ArrowUp' ? -1 : 1);
    const list = [...getItems()];
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    onChange(list);
    container.querySelector(`[data-idx="${j}"] .grip`)?.focus();
  });
}

export const pad = (n) => String(n).padStart(2, '0');
export function fmtDateTime(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
export function fmtAgo(ms) {
  if (!ms) return 'Chưa đăng nhập';
  const s = (Date.now() - ms) / 1000;
  if (s < 300) return 'Đang hoạt động';
  if (s < 3600) return `${Math.round(s / 60)} phút trước`;
  if (s < 86400) return `${Math.round(s / 3600)} giờ trước`;
  if (s < 86400 * 14) return `${Math.round(s / 86400)} ngày trước`;
  return fmtDateTime(ms);
}
