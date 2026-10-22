import { api } from './api.js';
import { clearDrafts, setDraftOwner } from './drafts.js';
import { avatarColor, currentTheme, esc, go, initials, themeButton, themeText } from './ui.js';
import * as authView from './views/auth.js';
import * as contestView from './views/contest.js';
import * as contestsView from './views/contests.js';
import * as homeView from './views/home.js';
import * as problemView from './views/problem.js';
import * as profileView from './views/profile.js';
import * as rankView from './views/rank.js';
import * as setView from './views/set.js';
import * as submissionsView from './views/submissions.js';

const topbar = document.getElementById('topbar');
const view = document.getElementById('view');

const ROUTES = {
  login: { view: authView, nav: null, title: 'Đăng nhập' },
  home: { view: homeView, nav: 'home', title: 'Luyện tập' },
  contests: { view: contestsView, nav: 'contests', title: 'Cuộc thi' },
  contest: { view: contestView, nav: null, title: 'Phòng thi' },
  set: { view: setView, nav: 'home', title: 'Khối bài' },
  problem: { view: problemView, nav: 'home', title: 'Đề bài' },
  submissions: { view: submissionsView, nav: 'submissions', title: 'Bài nộp của tôi' },
  rank: { view: rankView, nav: 'rank', title: 'Bảng xếp hạng' },
  profile: { view: profileView, nav: 'profile', title: 'Hồ sơ' },
};
const NAV = [
  ['home', 'Luyện tập'],
  ['contests', 'Cuộc thi'],
  ['submissions', 'Bài nộp'],
  ['rank', 'Bảng xếp hạng'],
];

const app = { user: null, cleanup: null };

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('mj-theme-v2', next);
  } catch {}
  document.querySelectorAll('[data-act="theme"]').forEach((b) => (b.textContent = themeText()));
}

function renderTopbar(active) {
  const name = app.user.username;
  topbar.innerHTML = `
    <button class="brand" data-go="#/home"><span class="logo-mark" aria-hidden="true"></span><span class="logo-text">MiniJudge</span></button>
    <nav class="topnav wide-only">${NAV.map(([k, label]) => `<button class="${k === active ? 'on' : ''}" data-go="#/${k}">${label}</button>`).join('')}</nav>
    <div class="spacer"></div>
    ${themeButton()}
    <div class="user-menu">
      <button class="avatar-btn" aria-haspopup="menu" aria-expanded="false" data-act="menu">
        <span class="avatar" style="background:${avatarColor(name)}">${esc(initials(name))}</span>
        <span class="mono wide-only" style="font-size:13px">${esc(name)}</span>
      </button>
      <div class="menu" role="menu" hidden>
        <div class="menu-label">${app.user.role === 'admin' ? 'Admin' : 'Sinh viên'} · ${esc(name)}</div>
        <div class="narrow-only">${NAV.map(([k, label]) => `<button role="menuitem" style="width:100%" data-go="#/${k}">${label}</button>`).join('')}<hr /></div>
        ${app.user.role === 'admin' ? '<button role="menuitem" data-act="admin">Quản trị</button>' : ''}
        <button role="menuitem" data-act="profile">Hồ sơ</button>
        <button role="menuitem" class="danger" data-act="logout">Đăng xuất</button>
      </div>
    </div>`;
  topbar.hidden = false;
}

document.addEventListener('click', async (e) => {
  const menu = topbar.querySelector('.menu');
  const target = e.target.closest('[data-go],[data-act]');
  if (menu && !menu.hidden && !e.target.closest('.user-menu')) menu.hidden = true;
  if (!target) return;
  if (target.dataset.go) {
    if (menu) menu.hidden = true;
    return go(target.dataset.go);
  }
  const act = target.dataset.act;
  if (act === 'theme') toggleTheme();
  if (act === 'menu' && menu) {
    menu.hidden = !menu.hidden;
    target.setAttribute('aria-expanded', String(!menu.hidden));
  }
  if (act === 'admin') location.href = '/admin.html';
  if (act === 'profile') {
    menu.hidden = true;
    go('#/profile');
  }
  if (act === 'logout') {
    await api('/api/logout', { method: 'POST' });
    clearDrafts(app.user?.username);
    setDraftOwner('');
    app.user = null;
    go('#/login');
  }
});

function onLoggedIn(username, role = 'student') {
  app.user = { username, role };
  setDraftOwner(username);
  go('#/home');
}

async function router() {
  const [, page = 'home', arg, extra] = location.hash.split('/');
  const route = ROUTES[page] || ROUTES.home;
  if (!app.user && route.view !== authView) return go('#/login');
  if (app.user && route.view === authView) return go('#/home');

  app.cleanup?.();
  app.cleanup = null;
  document.body.classList.remove('editor-open');
  window.scrollTo(0, 0);
  if (route.nav) renderTopbar(route.nav);
  else topbar.hidden = true;
  document.title = `${page === 'problem' && arg ? decodeURIComponent(arg) : route.title} · MiniJudge`;

  try {
    const ctx = { view, user: app.user, arg: arg && decodeURIComponent(arg), extra, onLoggedIn };
    app.cleanup = (await route.view.render(ctx)) || null;
  } catch (err) {
    if (err.status === 401) {
      app.user = null;
      setDraftOwner('');
      return go('#/login');
    }
    /* Đang trong giờ thi: mọi trang luyện tập chuyển về phòng thi. */
    if (err.status === 423 && err.data?.contestId) return go(`#/contest/${err.data.contestId}`);
    view.innerHTML = `<main class="page" style="max-width:720px"><div class="empty-box"><b>Có lỗi xảy ra</b><span class="muted">${esc(err.message)}</span><button class="btn" data-go="#/home">Về trang chủ</button></div></main>`;
  }
}

window.addEventListener('hashchange', router);
api('/api/me')
  .then(({ user }) => {
    app.user = user;
    setDraftOwner(user?.username);
  })
  .catch(() => {})
  .finally(router);
