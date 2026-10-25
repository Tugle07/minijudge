import { api } from '../api.js';
import { avatarColor, esc, go, initials, renderAvatar, toast } from '../ui.js';
import { confirmDialog, fmtAgo } from './kit.js';

const COLS = [
  { key: 'username', label: 'Tên đăng nhập', defaultDir: 'asc', align: 'left', minWidth: '220px' },
  { key: 'role', label: 'Vai trò', defaultDir: 'desc', align: 'center', width: '130px' },
  { key: 'solved', label: 'Đã giải', defaultDir: 'desc', align: 'center', width: '110px' },
  { key: 'last_seen', label: 'Hoạt động cuối', defaultDir: 'desc', align: 'center', width: '160px' },
  { key: 'locked', label: 'Trạng thái', defaultDir: 'desc', align: 'center', width: '140px' },
];

export async function render(ctx) {
  ctx.setHead({ crumb: 'Người dùng', title: 'Người dùng' });
  let users = await api('/api/admin/users');
  let q = '';
  let roleFilter = 'all';
  let sortKey = 'username';
  let sortDir = 'asc';

  ctx.page.innerHTML = `
    <div class="filters" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <input class="ctl" data-q placeholder="Tìm người dùng (MSSV, tên)" style="flex:1 1 220px;max-width:300px" />
      <select class="ctl" data-role-filter aria-label="Lọc theo vai trò" style="flex:0 0 auto">
        <option value="all">Tất cả vai trò</option>
        <option value="admin">Admin</option>
        <option value="student">Sinh viên</option>
      </select>
      <select class="ctl" data-sort-select aria-label="Sắp xếp danh sách" style="flex:0 0 auto">
        <option value="username:asc">Tên đăng nhập (A → Z)</option>
        <option value="username:desc">Tên đăng nhập (Z → A)</option>
        <option value="solved:desc">Đã giải (Nhiều nhất ↓)</option>
        <option value="solved:asc">Đã giải (Ít nhất ↑)</option>
        <option value="last_seen:desc">Hoạt động cuối (Mới nhất ↓)</option>
        <option value="last_seen:asc">Hoạt động cuối (Cũ nhất ↑)</option>
        <option value="role:desc">Vai trò (Admin trước)</option>
        <option value="role:asc">Vai trò (Sinh viên trước)</option>
        <option value="locked:desc">Trạng thái (Bị khóa trước)</option>
        <option value="locked:asc">Trạng thái (Hoạt động trước)</option>
      </select>
      <span class="count" data-count style="margin-left:auto"></span>
    </div>
    <div class="panel" style="overflow:auto">
      <table class="atable" style="min-width:820px">
        <thead data-head></thead>
        <tbody data-rows></tbody>
      </table>
      <div data-empty></div>
    </div>`;

  function draw() {
    let list = users.filter((u) => {
      const matchQ = !q || u.username.toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchQ && matchRole;
    });

    // Sắp xếp
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'username') {
        cmp = a.username.localeCompare(b.username, 'vi');
      } else if (sortKey === 'role') {
        const weight = (r) => (r === 'admin' ? 2 : 1);
        cmp = weight(a.role) - weight(b.role);
      } else if (sortKey === 'solved') {
        cmp = (a.solved || 0) - (b.solved || 0);
      } else if (sortKey === 'last_seen') {
        cmp = (a.last_seen || 0) - (b.last_seen || 0);
      } else if (sortKey === 'locked') {
        cmp = (a.locked || 0) - (b.locked || 0);
      }
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      return a.username.localeCompare(b.username, 'vi');
    });

    ctx.page.querySelector('[data-count]').textContent = `${list.length} người dùng`;

    // Cập nhật giá trị select sắp xếp
    const sortSel = ctx.page.querySelector('[data-sort-select]');
    if (sortSel) sortSel.value = `${sortKey}:${sortDir}`;

    // Render thead
    ctx.page.querySelector('[data-head]').innerHTML = `<tr>
      ${COLS.map((col) => {
        const isCurrent = sortKey === col.key;
        const arrow = isCurrent ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
        const color = isCurrent ? 'var(--accent, #2563eb)' : 'inherit';
        const weight = isCurrent ? '700' : '600';
        const isCenter = col.align === 'center';
        const thStyle = [
          col.width ? `width:${col.width}` : '',
          col.minWidth ? `min-width:${col.minWidth}` : '',
          isCenter ? 'text-align:center' : 'text-align:left',
          'white-space:nowrap',
        ].filter(Boolean).join(';');
        const btnJustify = isCenter ? 'justify-content:center;margin:0 auto;' : 'justify-content:flex-start;';
        return `<th style="${thStyle}" aria-sort="${isCurrent ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}">
          <button class="sort" data-sort="${col.key}" style="cursor:pointer;color:${color};font-weight:${weight};display:inline-flex;align-items:center;${btnJustify};gap:4px;border:none;background:none;font:inherit;width:100%;">
            <span>${col.label}</span><span style="font-size:12px;opacity:${isCurrent ? '1' : '0.4'}">${arrow || ' ↕'}</span>
          </button>
        </th>`;
      }).join('')}
      <th style="width:56px;text-align:center"></th>
    </tr>`;

    // Render tbody
    ctx.page.querySelector('[data-rows]').innerHTML = list
      .map((u) => {
        const admin = u.role === 'admin';
        const me = u.username === ctx.me.username;
        const stColor = u.locked ? 'var(--wa)' : 'var(--ac)';
        return `<tr>
          <td>
            <a href="/#/profile/${encodeURIComponent(u.username)}" target="_blank" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit" title="Xem hồ sơ ${esc(u.fullName || u.username)}">
              ${renderAvatar(u.username, u.avatar, 30, u.fullName)}
              <span style="display:flex;flex-direction:column">
                <span style="font-weight:600;font-size:13.5px;color:var(--accent,#2563eb)">${esc(u.fullName || u.username)}</span>
                <span class="mono faint" style="font-size:11.5px">MSSV: ${esc(u.username)}</span>
              </span>
              ${me ? '<span class="me-tag">Bạn</span>' : ''}
            </a>
          </td>
          <td style="text-align:center">
            <span style="display:inline-block;padding:2px 9px;border-radius:6px;border:1px solid ${admin ? 'color-mix(in oklch, var(--re) 45%, transparent)' : 'var(--line2)'};color:${admin ? 'var(--re)' : 'var(--fg2)'};font-size:12.5px;font-weight:600">${admin ? 'Admin' : 'Sinh viên'}</span>
          </td>
          <td style="text-align:center">
            <b class="mono" style="font-size:14.5px">${u.solved}</b>
          </td>
          <td class="muted" style="text-align:center;white-space:nowrap">
            ${fmtAgo(u.last_seen)}
          </td>
          <td style="text-align:center;white-space:nowrap">
            <span style="display:inline-flex;align-items:center;justify-content:center;gap:6px;color:${stColor};font-size:13.5px;font-weight:500">
              <span style="width:7px;height:7px;border-radius:50%;background:currentColor"></span>${u.locked ? 'Bị khóa' : 'Hoạt động'}
            </span>
          </td>
          <td class="row-menu" style="text-align:center">
            <button class="dots-btn" data-menu aria-haspopup="menu" aria-label="Thao tác">⋯</button>
            <div class="menu" role="menu" hidden>
              <button data-profile="${esc(u.username)}">Xem hồ sơ</button>
              ${me ? '' : `<button data-role="${u.id}">${admin ? 'Đổi thành Sinh viên' : 'Đổi thành Admin'}</button>`}
              <button data-reset="${u.id}">Đặt lại mật khẩu</button>
              <button data-subs="${esc(u.username)}">Xem bài nộp</button>
              ${me ? '' : `<button class="danger" data-lock="${u.id}">${u.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}</button>`}
            </div>
          </td></tr>`;
      })
      .join('');
    ctx.page.querySelector('[data-empty]').innerHTML = list.length ? '' : '<div class="empty">Không tìm thấy người dùng nào.</div>';
  }

  const reload = async () => {
    users = await api('/api/admin/users');
    draw();
  };
  const userById = (id) => users.find((u) => u.id === Number(id));

  ctx.page.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) {
      q = e.target.value.trim().toLowerCase();
      draw();
    }
  });

  ctx.page.addEventListener('change', (e) => {
    if (e.target.matches('[data-role-filter]')) {
      roleFilter = e.target.value;
      draw();
    }
    if (e.target.matches('[data-sort-select]')) {
      const [k, dir] = e.target.value.split(':');
      sortKey = k;
      sortDir = dir;
      draw();
    }
  });

  ctx.page.addEventListener('click', async (e) => {
    const t = e.target;

    // Click sắp xếp cột bảng
    const sortBtn = t.closest('[data-sort]');
    if (sortBtn) {
      const k = sortBtn.dataset.sort;
      if (sortKey === k) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = k;
        const col = COLS.find((c) => c.key === k);
        sortDir = col?.defaultDir || 'desc';
      }
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
    if (!t.closest('.row-menu')) {
      ctx.page.querySelectorAll('.row-menu .menu').forEach((x) => (x.hidden = true));
    }

    const pickId = (k) => t.closest(`[data-${k}]`)?.dataset[k];
    try {
      if (pickId('profile')) {
        return window.open(`/#/profile/${encodeURIComponent(pickId('profile'))}`, '_blank');
      }
      if (pickId('role')) {
        const u = userById(pickId('role'));
        await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { role: u.role === 'admin' ? 'student' : 'admin' } });
        toast(`Đã đổi vai trò của ${u.username}`);
        return reload();
      }
      if (pickId('reset')) {
        const u = userById(pickId('reset'));
        const ok = await confirmDialog({
          title: `Đặt lại mật khẩu của ${u.username}?`,
          body: 'Mật khẩu cũ ngừng hoạt động ngay và người dùng bị đăng xuất. Hệ thống tạo một mật khẩu tạm để bạn gửi riêng cho họ.',
          cta: 'Đặt lại',
        });
        if (!ok) return;
        const { tempPassword } = await api(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' });
        await confirmDialog({
          title: 'Mật khẩu tạm',
          body: `Gửi riêng cho ${u.username}: ${tempPassword} — mật khẩu này chỉ hiện một lần.`,
          cta: 'Đã ghi lại',
        });
        return;
      }
      if (pickId('subs')) return go(`#/subs?user=${encodeURIComponent(pickId('subs'))}`);
      if (pickId('lock')) {
        const u = userById(pickId('lock'));
        if (!u.locked) {
          const ok = await confirmDialog({
            title: `Khóa tài khoản ${u.username}?`,
            body: 'Người dùng sẽ bị đăng xuất và không thể đăng nhập hay nộp bài cho tới khi được mở khóa.',
            cta: 'Khóa tài khoản',
            danger: true,
          });
          if (!ok) return;
        }
        await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { locked: !u.locked } });
        toast(u.locked ? `Đã mở khóa ${u.username}` : `Đã khóa ${u.username}`);
        return reload();
      }
    } catch (err) {
      toast(err.message);
    }
  });

  draw();

  const POLL_MS = 5000;
  let alive = true;
  const timer = setInterval(async () => {
    if (!alive) return;
    const menuOpen = ctx.page.querySelector('.row-menu .menu:not([hidden])');
    const modalOpen = document.querySelector('.modal-overlay:not([hidden]), dialog[open]');
    if (menuOpen || modalOpen) return;
    try {
      const fresh = await api('/api/admin/users');
      if (!alive) return;
      users = fresh;
      draw();
    } catch {}
  }, POLL_MS);

  return () => {
    alive = false;
    clearInterval(timer);
  };
}
