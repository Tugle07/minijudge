import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { confirmDialog } from './kit.js';

const randomCode = () => `K67-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export async function render(ctx) {
  ctx.setHead({ crumb: 'Cài đặt', title: 'Cài đặt', actions: '<button class="btn-dark" data-save>Lưu thay đổi</button>' });
  const s = await api('/api/admin/settings');
  let reveal = false;

  function draw() {
    const shown = reveal || !s.registerCode ? s.registerCode || '(không yêu cầu mã)' : `${s.registerCode.slice(0, 4)}••••`;
    ctx.page.innerHTML = `
      <div style="max-width:760px;display:flex;flex-direction:column;gap:16px">
        <div class="panel pad" style="padding:20px;gap:14px">
          <div style="display:flex;flex-direction:column;gap:2px"><b style="font-weight:600;font-size:16px">Mã lớp đăng ký</b><span class="muted" style="font-size:14px">Sinh viên nhập mã này khi tạo tài khoản. Đổi mã không ảnh hưởng tài khoản đã có. Để trống = không cần mã.</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <span style="flex:1 1 200px;height:40px;display:flex;align-items:center;padding:0 14px;border-radius:var(--r-sm);border:1px solid var(--line2);background:var(--bg);font:600 16px var(--font-code);letter-spacing:.12em">${esc(shown)}</span>
            <button class="btn-line" style="height:40px" data-reveal>${reveal ? 'Ẩn' : 'Hiện'}</button>
            <button class="btn-line" style="height:40px" data-copy>Sao chép</button>
            <button class="btn-line" style="height:40px" data-regen>↻ Tạo mã mới</button>
          </div>
        </div>
        <div class="panel pad" style="padding:20px;flex-direction:row;align-items:center;gap:16px">
          <div style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-weight:600;font-size:16px">Cho phép đăng ký mới</b><span class="muted" style="font-size:14px">Khi tắt, trang đăng nhập ẩn tab Tạo tài khoản.</span></div>
          <button role="switch" aria-checked="${s.allowRegister}" aria-label="Cho phép đăng ký mới" class="switch ${s.allowRegister ? 'on' : ''}" data-toggle><span></span></button>
        </div>
        <div class="panel pad" style="padding:20px">
          <div style="display:flex;flex-direction:column;gap:2px"><b style="font-weight:600;font-size:16px">Thông báo trang chủ</b><span class="muted" style="font-size:14px">Hiện dạng banner phía trên lưới khối bài tập. Để trống để ẩn.</span></div>
          <textarea class="input" data-banner rows="3" maxlength="200" style="height:auto;padding:10px 12px;resize:vertical">${esc(s.banner)}</textarea>
          <span class="faint" style="font-size:12.5px;text-align:right" data-bcount>${s.banner.length}/200</span>
          <span style="font-size:12.5px;font-weight:600;color:var(--fg3);text-transform:uppercase;letter-spacing:.04em">Xem trước</span>
          <div data-bpreview></div>
        </div>
      </div>`;
    drawPreview();
  }
  function drawPreview() {
    ctx.page.querySelector('[data-bpreview]').innerHTML = s.banner.trim()
      ? `<div class="banner-preview"><b>i</b><span style="text-wrap:pretty">${esc(s.banner)}</span></div>`
      : '<span class="faint" style="font-size:14px">Banner đang ẩn.</span>';
  }

  ctx.page.addEventListener('input', (e) => {
    if (!e.target.matches('[data-banner]')) return;
    s.banner = e.target.value;
    ctx.page.querySelector('[data-bcount]').textContent = `${s.banner.length}/200`;
    drawPreview();
  });
  ctx.page.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('[data-reveal]')) return (reveal = !reveal), draw();
    if (t.closest('[data-toggle]')) return (s.allowRegister = !s.allowRegister), draw();
    if (t.closest('[data-copy]')) {
      try {
        await navigator.clipboard.writeText(s.registerCode);
      } catch {}
      return toast('Đã sao chép mã lớp');
    }
    if (t.closest('[data-regen]')) {
      const ok = await confirmDialog({
        title: 'Tạo mã lớp mới?',
        body: 'Mã cũ sẽ ngừng hoạt động ngay sau khi bạn bấm Lưu thay đổi. Sinh viên chưa đăng ký cần mã mới từ lớp trưởng.',
        cta: 'Tạo mã mới',
      });
      if (ok) Object.assign(s, { registerCode: randomCode() }), (reveal = true), draw();
    }
  });
  ctx.actions().addEventListener('click', async (e) => {
    if (!e.target.closest('[data-save]')) return;
    Object.assign(s, await api('/api/admin/settings', { method: 'PUT', body: s }));
    toast('Đã lưu cài đặt');
    draw();
  });
  draw();
}
