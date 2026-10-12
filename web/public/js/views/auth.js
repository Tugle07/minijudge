import { api } from '../api.js';
import { esc, SPINNER, themeButton } from '../ui.js';

const HERO_CODE = `<span style="color:var(--sp)">#include &lt;stdio.h&gt;</span>

<span style="color:var(--sty)">int</span> <span style="color:var(--sfn)">main</span>(<span style="color:var(--sty)">void</span>) {
    <span style="color:var(--sty)">long long</span> a, b;
    <span style="color:var(--sfn)">scanf</span>(<span style="color:var(--sst)">"%lld %lld"</span>, &amp;a, &amp;b);
    <span style="color:var(--sfn)">printf</span>(<span style="color:var(--sst)">"%lld\\n"</span>, a + b);
    <span style="color:var(--skw)">return</span> <span style="color:var(--snu)">0</span>;
}`;

const hero = `
  <aside class="auth-hero wide-only">
    <div style="display:flex;align-items:center;gap:10px"><span class="logo-mark lg">mj</span><span class="logo-text" style="font-size:17px">MiniJudge</span></div>
    <div class="hero-body">
      <h1>Luyện C mỗi ngày, chấm bài trong 1 giây</h1>
      <div class="code-card">
        <div class="code-card-head"><span>p01_tong_hai_so.c</span><b class="vbadge" style="--v:var(--ac);font-size:13px">✓ Accepted</b></div>
        <pre>${HERO_CODE}</pre>
        <div class="code-card-foot"><span>3/3 test</span><span>15 ms</span><span>1212 KB</span></div>
      </div>
    </div>
    <div class="faint" style="font-size:13px">Kỹ thuật Lập trình C · K67 · Nhóm ICPC/OLP</div>
  </aside>`;

export async function render(ctx) {
  const { registerCodeRequired, allowRegister } = await api('/api/config');
  const state = { tab: 'login', showPw: false, loading: false, errors: {}, general: '', form: { user: '', pw: '', pw2: '', code: '' } };

  const field = (key, label, input, help) => `
    <label class="field"><span>${label}</span>${input}
      ${state.errors[key] ? `<span class="err-text">${esc(state.errors[key])}</span>` : help ? `<span class="help">${help}</span>` : ''}
    </label>`;
  const input = (key, attrs) =>
    `<input class="input ${state.errors[key] ? 'err' : ''} ${attrs.cls || ''}" name="${key}" value="${esc(state.form[key])}" ${attrs.html || ''} />`;

  function draw() {
    const isLogin = state.tab === 'login';
    const pwType = state.showPw ? 'text' : 'password';
    ctx.view.innerHTML = `
      <div class="auth">${hero}
        <main class="auth-main">
          <div class="auth-top">
            <span class="narrow-only" style="display:flex;align-items:center;gap:10px"><span class="logo-mark">mj</span><b style="font-weight:600">MiniJudge</b></span>
            <span></span>${themeButton()}
          </div>
          <div class="auth-center"><div class="auth-box">
            <div style="display:flex;flex-direction:column;gap:6px">
              <h2>${isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</h2>
              <p class="muted" style="margin:0">${isLogin ? 'Đăng nhập để tiếp tục luyện bài.' : 'Dùng mã lớp để tham gia lớp K67.'}</p>
            </div>
            ${
              allowRegister
                ? `<div class="segmented" role="tablist">
              <button role="tab" type="button" data-tab="login" class="${isLogin ? 'on' : ''}" aria-selected="${isLogin}">Đăng nhập</button>
              <button role="tab" type="button" data-tab="register" class="${isLogin ? '' : 'on'}" aria-selected="${!isLogin}">Tạo tài khoản</button>
            </div>`
                : ''
            }
            ${state.general ? `<div class="alert" role="alert"><b>!</b><span>${esc(state.general)}</span></div>` : ''}
            <form class="form" novalidate>
              ${field('user', 'Tên đăng nhập', input('user', { html: 'autocomplete="username" placeholder="vd. congtuan07" autofocus' }), isLogin ? '' : '3–24 ký tự: chữ, số hoặc dấu _')}
              ${field('pw', 'Mật khẩu', `<div class="pw-wrap">${input('pw', { html: `type="${pwType}" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="${isLogin ? '' : 'Ít nhất 6 ký tự'}"` })}<button type="button" class="pw-toggle" data-pw aria-label="Ẩn/hiện mật khẩu">${state.showPw ? 'Ẩn' : 'Hiện'}</button></div>`)}
              ${isLogin ? '' : field('pw2', 'Nhập lại mật khẩu', input('pw2', { html: `type="${pwType}" autocomplete="new-password"` }))}
              ${isLogin || !registerCodeRequired ? '' : field('code', 'Mã lớp', input('code', { cls: 'code', html: 'placeholder="vd. K67-XXXX" autocomplete="off"' }), 'Lấy mã từ lớp trưởng')}
              <button class="btn-primary" type="submit" ${state.loading ? 'disabled' : ''} style="margin-top:4px">
                ${state.loading ? SPINNER : ''}<span>${state.loading ? (isLogin ? 'Đang đăng nhập…' : 'Đang tạo tài khoản…') : isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
              </button>
            </form>
            ${
              allowRegister
                ? `<p class="switch-line">${isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} <button type="button" data-tab="${isLogin ? 'register' : 'login'}">${isLogin ? 'Tạo tài khoản' : 'Đăng nhập'}</button></p>`
                : '<p class="switch-line">Lớp đang tạm khóa đăng ký mới. Liên hệ lớp trưởng nếu bạn chưa có tài khoản.</p>'
            }
          </div></div>
        </main>
      </div>`;
  }

  async function submit() {
    const isLogin = state.tab === 'login';
    const { user, pw, pw2, code } = state.form;
    const errors = {};
    if (!user.trim()) errors.user = 'Nhập tên đăng nhập';
    if (!pw) errors.pw = 'Nhập mật khẩu';
    if (!isLogin && pw2 !== pw) errors.pw2 = 'Mật khẩu nhập lại không khớp';
    if (Object.keys(errors).length) return Object.assign(state, { errors }), draw();

    Object.assign(state, { loading: true, errors: {}, general: '' });
    draw();
    try {
      const body = { username: user.trim(), password: pw, code };
      const { username, role } = await api(isLogin ? '/api/login' : '/api/register', { method: 'POST', body });
      ctx.onLoggedIn(username, role);
    } catch (err) {
      Object.assign(state, { loading: false, errors: err.fields || {}, general: err.status === 429 ? err.message : '' });
      if (!Object.keys(state.errors).length && !state.general) state.general = err.message;
      draw();
    }
  }

  const onInput = (e) => {
    if (!e.target.name) return;
    state.form[e.target.name] = e.target.value;
    if (state.errors[e.target.name]) {
      delete state.errors[e.target.name];
      e.target.classList.remove('err');
    }
  };
  const onClick = (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) Object.assign(state, { tab: tab.dataset.tab, errors: {}, general: '' }), draw();
    if (e.target.closest('[data-pw]')) (state.showPw = !state.showPw), draw();
  };
  const onSubmit = (e) => {
    e.preventDefault();
    if (!state.loading) submit();
  };

  ctx.view.addEventListener('input', onInput);
  ctx.view.addEventListener('click', onClick);
  ctx.view.addEventListener('submit', onSubmit);
  draw();
  return () => {
    ctx.view.removeEventListener('input', onInput);
    ctx.view.removeEventListener('click', onClick);
    ctx.view.removeEventListener('submit', onSubmit);
  };
}
