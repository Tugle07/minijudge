import { api } from '../api.js';
import { avatarColor, esc, go, initials, toast } from '../ui.js';
import { confirmDialog, fmtAgo } from './kit.js';

export async function render(ctx) {
  ctx.setHead({ crumb: 'Người dùng', title: 'Người dùng' });
  let users = await api('/api/admin/users');
  let q = '';

  ctx.page.innerHTML = `
    <div class="filters"><input class="ctl" data-q placeholder="Tìm người dùng" style="flex:0 1 280px" /><span class="count" data-count></span></div>
    <div class="panel"><table class="atable">
      <thead><tr><th>Tên đăng nhập</th><th>Vai trò</th><th class="num">Đã giải</th><th>Hoạt động cuối</th><th>Trạng thái</th><th style="width:56px"></th></tr></thead>
      <tbody data-rows></tbody></table><div data-empty></div></div>`;

  function draw() {
    const list = users.filter((u) => !q || u.username.toLowerCase().includes(q));
    ctx.page.querySelector('[data-count]').textContent = `${list.length} người dùng`;
    ctx.page.querySelector('[data-rows]').innerHTML = list
      .map((u) => {
        const admin = u.role === 'admin';
        const me = u.username === ctx.me.username;
        const stColor = u.locked ? 'var(--wa)' : 'var(--ac)';
        return `<tr>
          <td><span style="display:flex;align-items:center;gap:10px"><span class="avatar" style="width:28px;height:28px;font-size:11.5px;background:${avatarColor(u.username)}">${esc(initials(u.username))}</span><span class="mono" style="font-weight:500">${esc(u.username)}</span>${me ? '<span class="me-tag">Bạn</span>' : ''}</span></td>
          <td><span style="padding:2px 9px;border-radius:6px;border:1px solid ${admin ? 'color-mix(in oklch, var(--re) 45%, transparent)' : 'var(--line2)'};color:${admin ? 'var(--re)' : 'var(--fg2)'};font-size:12.5px;font-weight:600">${admin ? 'Admin' : 'Sinh viên'}</span></td>
          <td class="num">${u.solved}</td>
          <td class="muted">${fmtAgo(u.last_seen)}</td>
          <td><span style="display:inline-flex;align-items:center;gap:6px;color:${stColor};font-size:13.5px;font-weight:500"><span style="width:7px;height:7px;border-radius:50%;background:currentColor"></span>${u.locked ? 'Bị khóa' : 'Hoạt động'}</span></td>
          <td class="row-menu">
            <button class="dots-btn" data-menu aria-haspopup="menu" aria-label="Thao tác">⋯</button>
            <div class="menu" role="menu" hidden>
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
    if (e.target.matches('[data-q]')) (q = e.target.value.trim().toLowerCase()), draw();
  });
  ctx.page.addEventListener('click', async (e) => {
    const t = e.target;
    const menuBtn = t.closest('[data-menu]');
    if (menuBtn) {
      const m = menuBtn.nextElementSibling;
      ctx.page.querySelectorAll('.row-menu .menu').forEach((x) => x !== m && (x.hidden = true));
      m.hidden = !m.hidden;
      return;
    }
    const pickId = (k) => t.closest(`[data-${k}]`)?.dataset[k];
    try {
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
}
