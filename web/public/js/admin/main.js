import { api } from '../api.js';
import { avatarColor, currentTheme, esc, initials } from '../ui.js';
import { SKELETON } from './kit.js';
import * as contestsPage from './contests.js';
import * as dashPage from './dash.js';
import * as probsPage from './probs.js';
import * as setsPage from './sets.js';
import * as settingsPage from './settings.js';
import * as subsPage from './subs.js';
import * as usersPage from './users.js';

const PAGES = [
  ['dash', 'Dashboard', '⌂', dashPage],
  ['sets', 'Khối bài tập', '▦', setsPage],
  ['probs', 'Bài tập', '≡', probsPage],
  ['contests', 'Cuộc thi', '⚑', contestsPage],
  ['subs', 'Bài nộp', '↗', subsPage],
  ['users', 'Người dùng', '◎', usersPage],
  ['settings', 'Cài đặt', '⚙', settingsPage],
];
const root = document.getElementById('admin');
const state = { me: null, cleanup: null, judgeDown: false };
const isWide = () => window.matchMedia('(min-width: 900px)').matches;
const themeLabel = () => (currentTheme() === 'dark' ? 'Tối' : 'Sáng');

function shell(active) {
  const me = state.me.username;
  root.innerHTML = `
    <aside class="side" data-wide-only>
      <div class="side-brand"><span class="logo-mark">mj</span><span style="font-weight:600;font-size:16px">MiniJudge</span><span class="tag-admin">Admin</span></div>
      ${PAGES.map(
        ([k, label, key]) =>
          `<a class="side-nav ${k === active ? 'on' : ''}" href="#/${k}" ${k === active ? 'aria-current="page"' : ''}><span class="key">${key}</span>${label}${
            k === 'dash' && state.judgeDown ? '<span class="badge">!</span>' : ''
          }</a>`,
      ).join('')}
      <div style="flex:1"></div>
      <a class="side-nav" href="/#/home">← Về trang sinh viên</a>
      <button class="side-nav" data-theme-toggle>◐ Giao diện: <span data-theme-label>${themeLabel()}</span></button>
      <div class="side-user">
        <span class="avatar" style="background:${avatarColor(me)}">${esc(initials(me))}</span>
        <div style="display:flex;flex-direction:column;min-width:0"><span class="mono" style="font-weight:500;font-size:13.5px">${esc(me)}</span><span class="faint" style="font-size:12.5px">Admin</span></div>
      </div>
    </aside>
    <div class="admin-body">
      <header class="admin-mobile-head" data-narrow-only>
        <div style="display:flex;align-items:center;gap:10px"><span class="logo-mark" style="width:24px;height:24px;font-size:10px">mj</span><b style="font-weight:600">MiniJudge Admin</b>
          <button class="btn-ghost" style="margin-left:auto" data-theme-toggle>◐ <span data-theme-label>${themeLabel()}</span></button></div>
        <p class="faint" style="margin:0;font-size:13px">Trên điện thoại chỉ xem Dashboard. Mở trên máy tính để quản lý khối, bài và người dùng.</p>
      </header>
      <div data-alert></div>
      <main class="admin-main">
        <div class="admin-head"><div style="display:flex;flex-direction:column;gap:4px"><div class="crumb" data-crumb></div><h1 data-title></h1></div><div data-actions style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"></div></div>
        <div data-page style="display:flex;flex-direction:column;gap:22px">${SKELETON}</div>
      </main>
    </div>`;
  root.querySelectorAll('[data-wide-only]').forEach((el) => (el.hidden = !isWide()));
  root.querySelectorAll('[data-narrow-only]').forEach((el) => (el.hidden = isWide()));
}

function setJudgeDown(down, queued = 0) {
  state.judgeDown = down;
  const el = root.querySelector('[data-alert]');
  if (el) {
    el.innerHTML = down
      ? `<div class="alert-bar" role="alert"><span class="dot">!</span><b style="font-weight:600">Judge mất kết nối — bài nộp đang xếp hàng</b><span class="muted" style="font-size:14px">${queued} bài đang chờ</span></div>`
      : '';
  }
}

async function route() {
  state.cleanup?.();
  state.cleanup = null;
  const [, page = 'dash', ...rest] = location.hash.split('?')[0].split('/');
  const found = PAGES.find(([k]) => k === page) || PAGES[0];
  const key = isWide() ? found[0] : 'dash';
  shell(key);
  const ctx = {
    page: root.querySelector('[data-page]'),
    me: state.me,
    params: rest.map(decodeURIComponent),
    setHead({ crumb, title, actions = '' }) {
      root.querySelector('[data-crumb]').textContent = `Quản trị › ${crumb}`;
      root.querySelector('[data-title]').textContent = title;
      root.querySelector('[data-actions]').innerHTML = actions;
    },
    actions: () => root.querySelector('[data-actions]'),
    setJudgeDown,
  };
  try {
    state.cleanup = (await (PAGES.find(([k]) => k === key)[3]).render(ctx)) || null;
  } catch (err) {
    ctx.page.innerHTML = `<div class="panel pad"><b>Có lỗi xảy ra</b><span class="muted">${esc(err.message)}</span></div>`;
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-theme-toggle]')) return;
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('mj-theme', next);
  } catch {}
  document.querySelectorAll('[data-theme-label]').forEach((el) => (el.textContent = themeLabel()));
});

/* Đóng mọi menu ⋯ khi bấm ra ngoài. */
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.row-menu')) return;
  document.querySelectorAll('.row-menu .menu').forEach((m) => (m.hidden = true));
});

let lastWide = isWide();
window.addEventListener('resize', () => {
  if (isWide() !== lastWide) {
    lastWide = isWide();
    route();
  }
});
window.addEventListener('hashchange', route);

const { user } = await api('/api/me');
if (!user) location.replace('/#/login');
else if (user.role !== 'admin') location.replace('/#/home');
else {
  state.me = user;
  route();
}
