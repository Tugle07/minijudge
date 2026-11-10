import { api } from '../api.js';
import { esc } from '../ui.js';

const pad = (n) => String(n).padStart(2, '0');
export const fmtTime = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const fmtDuration = (ms) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}` : `${m} phút`;
};
export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:` : ''}${pad(m)}:${pad(s % 60)}`;
}

const PHASE = {
  upcoming: ['Sắp diễn ra', 'var(--ce)'],
  running: ['Đang diễn ra', 'var(--ac)'],
  ended: ['Đã kết thúc', 'var(--pd)'],
  draft: ['Nháp (chỉ Admin thấy)', 'var(--tle)'],
};

export async function render(ctx) {
  ctx.view.innerHTML = '<main class="page" style="max-width:900px" data-list></main>';
  const root = ctx.view.querySelector('[data-list]');
  let data;
  let offset = 0;

  function draw() {
    const now = Date.now() + offset;
    const card = (c) => {
      const [label, color] = PHASE[c.phase] || PHASE.ended;
      const when =
        c.phase === 'upcoming'
          ? `Bắt đầu sau <b class="mono">${fmtCountdown(c.startAt - now)}</b>`
          : c.phase === 'running'
            ? `Còn <b class="mono">${fmtCountdown(c.endAt - now)}</b>`
            : `Kết thúc lúc ${fmtTime(c.endAt)}`;
      const isAdmin = ctx.user?.role === 'admin';
      const cta = c.phase === 'running'
        ? (c.finished ? (c.canSeeBoard ? 'Xem bảng xếp hạng' : 'Xem bài đã nộp') : c.joined ? 'Tiếp tục làm bài' : 'Vào phòng thi')
        : c.phase === 'ended'
          ? (c.canSeeBoard ? 'Xem bảng xếp hạng' : 'Xem kết quả')
          : (c.phase === 'draft' && isAdmin ? 'Xem trước (Admin)' : 'Xem thông tin');
      const targetUrl = (c.phase === 'draft' && isAdmin) ? `#/contest/${c.id}?preview=1` : `#/contest/${c.id}`;
      return `
        <button class="contest-card ${c.phase}" data-go="${targetUrl}">
          <div class="contest-card-top">
            <span class="pill" style="color:${color}">${label}</span>
            ${c.visibility === 'restricted' ? '<span class="pill" style="background:color-mix(in oklch, #ea580c 15%, transparent);color:#ea580c;border:1px solid color-mix(in oklch, #ea580c 35%, transparent);font-size:11px;padding:2px 7px;font-weight:600">🔒 Chỉ định</span>' : ''}
            <span class="faint" style="font-size:13px">${c.problemCount} bài · ${fmtDuration(c.endAt - c.startAt)}</span>
          </div>
          <b class="contest-card-title">${esc(c.title)}</b>
          <span class="muted" style="font-size:14px">${fmtTime(c.startAt)} – ${fmtTime(c.endAt)}</span>
          <div class="contest-card-foot"><span style="font-size:14px">${when}</span><span class="btn ${c.phase === 'running' && !c.finished ? 'btn-go' : ''}">${cta}</span></div>
          ${c.allowed ? '' : '<span class="faint" style="font-size:13px">Bạn không có trong danh sách thí sinh của cuộc thi này.</span>'}
        </button>`;
    };
    const groups = [
      ['Đang diễn ra', data.contests.filter((c) => c.phase === 'running')],
      ['Sắp diễn ra', data.contests.filter((c) => c.phase === 'upcoming' || c.phase === 'draft')],
      ['Đã kết thúc', data.contests.filter((c) => c.phase === 'ended')],
    ].filter(([, list]) => list.length);
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px">
        <h1 class="page-title">Cuộc thi</h1>
        <p class="muted" style="margin:0">Làm bài trong phòng thi: toàn màn hình, một tab, chấm điểm theo subtask.</p>
      </div>
      ${groups.length ? groups.map(([title, list]) => `<section class="contest-group"><h2 class="section-title">${title}</h2>${list.map(card).join('')}</section>`).join('') : '<div class="empty-box"><b>Chưa có cuộc thi nào</b><span class="muted">Khi giáo viên mở cuộc thi, nó sẽ hiện ở đây.</span></div>'}`;
  }

  async function load() {
    data = await api('/api/contests');
    offset = data.now - Date.now();
    draw();
  }
  await load();
  const tick = setInterval(draw, 1000);
  const refresh = setInterval(() => load().catch(() => {}), 3000);
  return () => {
    clearInterval(tick);
    clearInterval(refresh);
  };
}
