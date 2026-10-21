import { api } from '../api.js';
import { diffMeter, esc, pillStyle, setStatus } from '../ui.js';

const ROADMAP_GROUP = /lộ trình/i;
const DAY = 86_400_000;

/* "còn 3 ngày" / "còn 5 giờ" / "đã hết hạn" cho khối có hạn nộp. */
function dueLabel(deadline) {
  if (!deadline) return '';
  const left = new Date(deadline).getTime() - Date.now();
  if (left <= 0) return 'Đã hết hạn';
  if (left < DAY) return `Còn ${Math.max(1, Math.round(left / 3_600_000))} giờ`;
  return `Còn ${Math.ceil(left / DAY)} ngày`;
}

/* Thanh lộ trình: mỗi đoạn là một khối, rộng theo số bài, phần tô = số bài đã AC. */
function roadBar(roadmap) {
  return `<div class="roadbar" role="list" aria-label="Tiến độ từng khối trong lộ trình">${roadmap
    .map((s) => {
      const pct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
      const done = s.count && s.ac === s.count;
      return `<button role="listitem" class="road-seg ${done ? 'done' : ''}" style="flex-grow:${Math.max(1, s.count)}" data-go="#/set/${encodeURIComponent(s.id)}" title="${esc(s.title)}: ${s.ac}/${s.count} bài">
        <span class="road-track"><span style="width:${pct}%"></span></span><span class="road-label mono">${esc(s.num)}</span></button>`;
    })
    .join('')}</div>`;
}

export async function render(ctx) {
  const { summary, sets, banner } = await api('/api/home');
  const topics = [...new Set(sets.flatMap((s) => s.tags))].sort((a, b) => a.localeCompare(b, 'vi'));
  const state = { query: '', topic: '', hideDone: false };
  const roadmap = sets.filter((s) => ROADMAP_GROUP.test(s.group));
  const rmAc = roadmap.reduce((t, s) => t + s.ac, 0);
  const rmCount = roadmap.reduce((t, s) => t + s.count, 0);
  const total = sets.reduce((t, s) => t + s.count, 0);
  const next = roadmap.find((s) => s.count && s.ac < s.count) || sets.find((s) => s.count && s.ac < s.count);
  const stat = (label, value, unit) => `<div class="ov-stat"><span>${label}</span><b class="num">${value}</b><small>${unit}</small></div>`;

  ctx.view.innerHTML = `
    <main class="page home">
      <section class="overview">
        <div class="ov-head">
          <h1 class="page-title">Luyện tập</h1>
          ${
            next
              ? `<button class="btn-primary ov-next" data-go="#/set/${encodeURIComponent(next.id)}"><span>Làm tiếp: ${esc(next.title)}</span><span class="num ov-next-n">${next.ac}/${next.count}</span></button>`
              : '<span class="muted">Đã AC toàn bộ bài hiện có.</span>'
          }
        </div>
        <div class="ov-stats">
          ${stat('Đã giải', summary.solved, `/ ${total} bài`)}
          ${stat('Hạng', summary.rank || '—', `/ ${summary.classSize}`)}
          ${stat('Chuỗi nộp bài', summary.streak, 'ngày liên tiếp')}
          ${rmCount ? stat('Lộ trình', `${Math.round((rmAc / rmCount) * 100)}%`, `${rmAc}/${rmCount} bài`) : ''}
        </div>
        ${roadmap.length ? roadBar(roadmap) : ''}
      </section>
      ${banner ? `<div class="banner-preview" role="note"><span style="text-wrap:pretty">${esc(banner)}</span></div>` : ''}
      <div class="home-filters">
        <input class="search" data-q placeholder="Tìm khối hoặc chủ đề (vd. con trỏ, mảng)" aria-label="Tìm khối" />
        <select class="ctl" data-topic aria-label="Lọc theo chủ đề"><option value="">Mọi chủ đề</option>${topics.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
        <label class="check"><input type="checkbox" data-hide /> Ẩn khối đã xong</label>
      </div>
      <div data-grid></div>
    </main>`;

  const grid = ctx.view.querySelector('[data-grid]');

  function card(s) {
    const [label, color] = setStatus(s);
    const pct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
    const done = s.count && s.ac === s.count;
    const due = s.deadline && !done ? dueLabel(s.deadline) : '';
    return `
      <button class="set-card ${done ? 'done' : ''}" data-go="#/set/${encodeURIComponent(s.id)}">
        <div class="set-card-top">
          <span class="set-num mono">${esc(s.num)}</span>
          <span class="pill" style="${pillStyle(due && due !== 'Đã hết hạn' ? 'var(--tle)' : due ? 'var(--pd)' : color)}">${esc(due || label)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span class="title">${esc(s.title)}</span>
          <span class="muted" style="font-size:14px">${esc(s.desc)}</span>
        </div>
        <div class="foot">
          <div class="foot-line">${diffMeter(s.difficulty)}<span><b class="num">${s.ac}</b>/${s.count} bài</span></div>
          <div class="progress ${done ? 'done' : ''}"><div style="width:${pct}%"></div></div>
        </div>
      </button>`;
  }

  /* Lộ trình: các khối xếp thành đường học theo thứ tự, đánh dấu đã xong / đang học / chưa bắt đầu. */
  function step(s, i, list) {
    const done = s.count && s.ac === s.count;
    const current = !done && list.findIndex((x) => !(x.count && x.ac === x.count)) === i;
    const pct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
    const cls = done ? 'done' : current ? 'current' : s.ac ? 'started' : '';
    return `
      <li class="step ${cls}">
        <span class="step-dot" aria-hidden="true">${done ? '✓' : esc(s.num)}</span>
        <button class="step-card" data-go="#/set/${encodeURIComponent(s.id)}">
          <span class="step-text">
            <span class="step-title">${esc(s.title)}${current ? '<span class="step-now">đang học</span>' : ''}</span>
            <span class="muted">${esc(s.desc)}</span>
          </span>
          <span class="step-meta">
            <span><b class="num">${s.ac}</b>/${s.count} bài</span>
            <span class="progress ${done ? 'done' : ''}"><span style="width:${pct}%"></span></span>
          </span>
        </button>
      </li>`;
  }

  function section(name, list) {
    const ac = list.reduce((t, s) => t + s.ac, 0);
    const count = list.reduce((t, s) => t + s.count, 0);
    const isRoad = ROADMAP_GROUP.test(name);
    return `
      <section class="set-group">
        <div class="set-group-head">
          <h2>${esc(name)}</h2>
          <span class="muted">${list.length} khối · ${ac}/${count} bài</span>
        </div>
        ${isRoad ? `<ol class="roadmap">${list.map(step).join('')}</ol>` : `<div class="set-grid">${list.map(card).join('')}</div>`}
      </section>`;
  }

  function draw() {
    const q = state.query.trim().toLowerCase();
    const list = sets.filter((s) => {
      if (state.hideDone && s.count && s.ac === s.count) return false;
      if (state.topic && !s.tags.includes(state.topic)) return false;
      if (q && !`${s.title} ${s.desc} ${s.group} ${s.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const groups = new Map();
    for (const s of list) groups.set(s.group || 'Khác', [...(groups.get(s.group || 'Khác') || []), s]);
    grid.innerHTML = list.length
      ? [...groups].map(([name, items]) => section(name, items)).join('')
      : `<div class="empty-box"><b style="font-size:17px;font-weight:600">Không tìm thấy khối nào</b>
          <span class="muted" style="font-size:14px">Thử từ khóa khác hoặc bỏ bớt bộ lọc.</span>
          <button class="btn" data-clear style="margin-top:6px">Xóa bộ lọc</button></div>`;
  }

  const $ = (sel) => ctx.view.querySelector(sel);
  $('[data-q]').addEventListener('input', (e) => ((state.query = e.target.value), draw()));
  $('[data-topic]').addEventListener('change', (e) => ((state.topic = e.target.value), draw()));
  $('[data-hide]').addEventListener('change', (e) => ((state.hideDone = e.target.checked), draw()));
  $('main').addEventListener('click', (e) => {
    if (!e.target.closest('[data-clear]')) return;
    Object.assign(state, { query: '', topic: '', hideDone: false });
    $('[data-q]').value = '';
    $('[data-topic]').value = '';
    $('[data-hide]').checked = false;
    draw();
  });
  draw();
}
