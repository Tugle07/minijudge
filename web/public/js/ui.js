export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const VERDICTS = {
  AC: ['Accepted', '--ac'],
  WA: ['Wrong Answer', '--wa'],
  TLE: ['Time Limit Exceeded', '--tle'],
  MLE: ['Memory Limit Exceeded', '--mle'],
  RE: ['Runtime Error', '--re'],
  CE: ['Compilation Error', '--ce'],
  IE: ['Internal Error', '--pd'],
  PENDING: ['Đang chấm…', '--pd'],
};

export const verdictLabel = (v) => (VERDICTS[v] || VERDICTS.IE)[0];
export const verdictVar = (v) => `var(${(VERDICTS[v] || VERDICTS.IE)[1]})`;
export const verdictAbbr = (v) => (v === 'PENDING' ? '…' : v);
export const badge = (v) => `<b class="vbadge" style="--v:${verdictVar(v)}">${esc(verdictAbbr(v))}</b>`;
export const verdictText = (v, label = verdictLabel(v)) =>
  `<span class="vtext" style="--v:${verdictVar(v)}">${badge(v)}<span class="ellipsis">${esc(label)}</span></span>`;

/* Độ khó hiển thị bằng thước 3 vạch, không dùng màu verdict để tránh nhầm với kết quả chấm. */
const DIFF_LEVEL = { 'Dễ': 1, 'Trung bình': 2, 'Khó': 3 };
export const diffColor = () => 'var(--fg2)';
export const diffMeter = (d) => {
  const n = DIFF_LEVEL[d] || 0;
  return `<span class="diff" title="Độ khó: ${esc(d || '—')}"><i aria-hidden="true">${[1, 2, 3].map((k) => `<b class="${k <= n ? 'on' : ''}"></b>`).join('')}</i>${esc(d || '—')}</span>`;
};

export const SPINNER = '<span class="spinner" aria-hidden="true"></span>';

export const LANGS = {
  c: { name: 'C', badge: 'C11 · gcc', color: 'var(--fg2)' },
  cpp: { name: 'C++', badge: 'C++17 · g++', color: '#3b82f6' },
  py: { name: 'Python', badge: 'Python 3', color: '#eab308' },
};
export const langName = (l = 'c') => LANGS[l]?.name || (l === 'python' ? 'Python' : l === 'c++' ? 'C++' : 'C');
export const langBadge = (l = 'c') => {
  const norm = l === 'python' ? 'py' : l === 'c++' ? 'cpp' : (l || 'c');
  const info = LANGS[norm] || LANGS.c;
  return `<span class="pill mono" style="font-size:11px;padding:1px 6px;border-radius:4px;background:color-mix(in oklch, ${info.color} 15%, transparent);color:${info.color};font-weight:600;">${esc(info.name)}</span>`;
};
export const SHIMMER = '<div class="shimmer-track"><div></div></div>';

const NEW_FOR_MS = 3 * 86_400_000;
export function setStatus(set) {
  if (set.status === 'closed') return ['Đã đóng', 'var(--pd)'];
  if (set.deadline) {
    const d = set.deadline;
    if (Date.parse(d) < Date.now()) return ['Hết hạn', 'var(--pd)'];
    return [`Hạn nộp ${d.slice(8, 10)}/${d.slice(5, 7)}`, 'var(--tle)'];
  }
  if (set.openAt && Date.now() - Date.parse(set.openAt) < NEW_FOR_MS) return ['Mới', 'var(--ce)'];
  return ['Đang mở', 'var(--ac)'];
}
export const pillStyle = (color) => `color:${color}`;

const pad = (n) => String(n).padStart(2, '0');
/* "Vừa xong", "Hôm nay 21:40", "Hôm qua 20:58", "21:20, 08/10" */
export function fmtWhen(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const now = new Date();
  if (now - d < 60_000) return 'Vừa xong';
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ms >= startOfToday) return `Hôm nay ${hm}`;
  if (ms >= startOfToday - 86_400_000) return `Hôm qua ${hm}`;
  return `${hm}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/* Định dạng thời lượng làm bài: "24p 15s", "1h 10p" */
export function fmtWorkTime(ms) {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}p`;
  }
  return `${m}p ${pad(s)}s`;
}

/* Định dạng giờ đồng hồ chính xác: "14:28:15" */
export function fmtClock(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const statLine = (s) =>
  s.verdict === 'CE' || s.verdict === 'PENDING' || s.verdict === 'IE'
    ? '—'
    : `${s.verdict === 'TLE' ? '> ' : ''}${s.time_ms ?? s.timeMs ?? 0} ms · ${s.memory_kb ?? s.memoryKb ?? 0} KB`;

/* Avatar trung tính: chữ viết tắt là đủ phân biệt, không cần mỗi người một màu. */
export const avatarColor = () => 'var(--bg3)';
export const initials = (name = '', fullName = '') => {
  const target = String(fullName || '').trim() || String(name || '').trim();
  if (!target) return '?';
  const words = target.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const w1 = words[words.length - 2];
    const w2 = words[words.length - 1];
    return ((w1[0] || '') + (w2[0] || '')).toUpperCase();
  }
  if (words.length === 1) {
    const w = words[0];
    return w.slice(0, 2).toUpperCase();
  }
  return String(name).slice(0, 2).toUpperCase() || '?';
};

export function renderAvatar(nameOrUser = '', avatar = '', size = 26, fullName = '') {
  let name = '';
  let av = avatar;
  let fn = fullName;
  let sz = size;
  if (typeof nameOrUser === 'object' && nameOrUser !== null) {
    name = nameOrUser.username || nameOrUser.name || '';
    av = nameOrUser.avatar || (typeof avatar === 'string' ? avatar : '') || '';
    fn = nameOrUser.fullName || nameOrUser.full_name || fullName || '';
    if (typeof avatar === 'number') sz = avatar;
  } else {
    name = String(nameOrUser || '');
    if (typeof avatar === 'number') {
      sz = avatar;
      av = '';
    }
  }
  const safeName = fn || name;
  if (av && (av.startsWith('data:image/') || av.startsWith('http://') || av.startsWith('https://'))) {
    return `<img class="avatar" src="${esc(av)}" alt="${esc(safeName)}" style="width:${sz}px;height:${sz}px;object-fit:cover;border-radius:50%;display:inline-block;vertical-align:middle;flex-shrink:0;" />`;
  }
  return `<span class="avatar" style="width:${sz}px;height:${sz}px;font-size:${Math.max(9, Math.round(sz * 0.42))}px;background:${avatarColor()};display:inline-grid;place-items:center;border-radius:50%;vertical-align:middle;font-weight:600;flex-shrink:0;">${esc(initials(name, fn))}</span>`;
}

/* Markdown + công thức $...$ (KaTeX). Tách công thức ra trước để marked không phá dấu _ và \. */
export function renderMarkdown(md) {
  if (!md) return '';
  if (!window.marked) return `<p>${esc(md)}</p>`;
  const formulas = [];
  const guarded = md.replace(/\$([^$\n]+)\$/g, (_, tex) => `@@MATH${formulas.push(tex) - 1}@@`);
  return marked.parse(guarded).replace(/@@MATH(\d+)@@/g, (_, i) => {
    const tex = formulas[Number(i)];
    return window.katex ? katex.renderToString(tex, { throwOnError: false }) : `<code>${esc(tex)}</code>`;
  });
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2400);
}

export const isWide = () => window.matchMedia('(min-width: 820px)').matches;

export function go(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

export const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
export const themeButton = () =>
  `<button class="btn-ghost" data-act="theme" aria-label="Đổi nền sáng/tối">${themeText()}</button>`;
export const themeText = () => (currentTheme() === 'dark' ? 'Nền tối' : 'Nền sáng');
