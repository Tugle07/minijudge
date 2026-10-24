import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { confirmDialog } from './kit.js';

const randomCode = () => `K67-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export async function render(ctx) {
  ctx.setHead({ crumb: 'Cài đặt', title: 'Cài đặt', actions: '<button class="btn-dark" data-save>Lưu thay đổi</button>' });
  const s = await api('/api/admin/settings');
  if (!Array.isArray(s.allowedLangs)) s.allowedLangs = ['c'];
  let reveal = false;

  function draw() {
    const shown = reveal || !s.registerCode ? s.registerCode || '(không yêu cầu mã)' : `${s.registerCode.slice(0, 4)}••••`;
    ctx.page.innerHTML = `
      <div style="max-width:760px;display:flex;flex-direction:column;gap:16px">
        <div class="panel pad" style="padding:20px;gap:14px">
          <div style="display:flex;flex-direction:column;gap:2px">
            <b style="font-weight:600;font-size:16px">Ngôn ngữ lập trình được phép sử dụng</b>
            <span class="muted" style="font-size:14px">Chọn các ngôn ngữ cho phép sinh viên nộp bài và chạy thử. Nếu chỉ chọn C, trình soạn thảo của sinh viên sẽ tự động khóa về chuẩn C11 và ẩn menu chọn ngôn ngữ (phù hợp tập trung cho môn KTLT).</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px">
              <input type="checkbox" data-lang-opt="c" ${s.allowedLangs.includes('c') ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--brand);cursor:pointer">
              <span style="font-weight:600">C (C11)</span>
              <span class="muted" style="font-size:13px">· gcc -std=c11 -O2</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px">
              <input type="checkbox" data-lang-opt="cpp" ${s.allowedLangs.includes('cpp') ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--brand);cursor:pointer">
              <span style="font-weight:600">C++ (C++17)</span>
              <span class="muted" style="font-size:13px">· g++ -std=c++17 -O2</span>
            </label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px">
              <input type="checkbox" data-lang-opt="py" ${s.allowedLangs.includes('py') ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--brand);cursor:pointer">
              <span style="font-weight:600">Python (Python 3)</span>
              <span class="muted" style="font-size:13px">· python 3.11</span>
            </label>
          </div>
        </div>
        <div class="panel pad" style="padding:20px;gap:14px">
          <div style="display:flex;flex-direction:column;gap:2px"><b style="font-weight:600;font-size:16px">Mã lớp đăng ký</b><span class="muted" style="font-size:14px">Sinh viên nhập mã này khi tạo tài khoản. Đổi mã không ảnh hưởng tài khoản đã có. Để trống = không cần mã.</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <span style="flex:1 1 200px;height:40px;display:flex;align-items:center;padding:0 14px;border-radius:var(--r-sm);border:1px solid var(--line2);background:var(--bg);font:600 16px var(--font-code);letter-spacing:.12em">${esc(shown)}</span>
            <button class="btn-line" style="height:40px" data-reveal>${reveal ? 'Ẩn' : 'Hiện'}</button>
            <button class="btn-line" style="height:40px" data-copy>Sao chép</button>
            <button class="btn-line" style="height:40px" data-regen> Tạo mã mới</button>
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

  ctx.page.addEventListener('change', (e) => {
    const opt = e.target.closest('[data-lang-opt]');
    if (!opt) return;
    const lang = opt.getAttribute('data-lang-opt');
    const checked = opt.checked;
    if (checked) {
      if (!s.allowedLangs.includes(lang)) s.allowedLangs.push(lang);
    } else {
      if (s.allowedLangs.length <= 1) {
        opt.checked = true;
        return toast('Cần cho phép ít nhất một ngôn ngữ lập trình');
      }
      s.allowedLangs = s.allowedLangs.filter((l) => l !== lang);
    }
  });

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
