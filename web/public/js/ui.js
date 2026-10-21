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

export const statLine = (s) =>
  s.verdict === 'CE' || s.verdict === 'PENDING' || s.verdict === 'IE'
    ? '—'
    : `${s.verdict === 'TLE' ? '> ' : ''}${s.time_ms ?? s.timeMs ?? 0} ms · ${s.memory_kb ?? s.memoryKb ?? 0} KB`;

/* Avatar trung tính: chữ viết tắt là đủ phân biệt, không cần mỗi người một màu. */
export const avatarColor = () => 'var(--bg3)';
export const initials = (name) => name.slice(0, 2).toUpperCase();

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
