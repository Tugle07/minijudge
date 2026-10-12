import { api } from '../api.js';
import { diffColor, esc, pillStyle, setStatus } from '../ui.js';

export async function render(ctx) {
  const { summary, sets, banner } = await api('/api/home');
  const topics = ['Tất cả', ...new Set(sets.flatMap((s) => s.tags))];
  const state = { query: '', topic: 'Tất cả', hideDone: false };

  ctx.view.innerHTML = `
    <main class="page home">
      <div style="display:flex;flex-direction:column;gap:10px">
        <h1 class="page-title">Chào ${esc(ctx.user.username)} 👋</h1>
        <div class="chip-row" style="gap:8px">
          <span class="stat-pill">Đã giải <b>${summary.solved}</b> bài</span>
          <span class="stat-pill">Hạng <b>${summary.rank || '—'}</b>/${summary.classSize}</span>
          <span class="stat-pill">Chuỗi <b>${summary.streak}</b> ngày</span>
        </div>
      </div>
      ${banner ? `<div class="banner-preview" role="note"><b>i</b><span style="text-wrap:pretty">${esc(banner)}</span></div>` : ''}
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
          <input class="search" data-q placeholder="Tìm khối hoặc bài theo tên (vd. Tuần 2)" aria-label="Tìm bài" />
          <label class="check"><input type="checkbox" data-hide /> Ẩn khối đã hoàn thành</label>
        </div>
        <div class="chip-row" data-topics></div>
      </div>
      <div data-grid></div>
    </main>`;

  const grid = ctx.view.querySelector('[data-grid]');
  const topicsEl = ctx.view.querySelector('[data-topics]');

  function card(s) {
    const [label, color] = setStatus(s);
    const pct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
    return `
      <button class="set-card" data-go="#/set/${encodeURIComponent(s.id)}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="set-num" style="background:oklch(0.78 0.10 ${s.hue})">${esc(s.num)}</span>
          <span class="pill" style="${pillStyle(color)}">${esc(label)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span class="title">${esc(s.title)}</span>
          <span class="muted" style="font-size:14px">${esc(s.desc)}</span>
        </div>
        <div class="chip-row">${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="foot">
          <div class="foot-line">
            <span>Đã AC <b style="color:var(--fg);font-weight:600">${s.ac}/${s.count}</b></span>
            <span style="display:flex;gap:10px"><span style="color:${diffColor(s.difficulty)}">● ${esc(s.difficulty)}</span><span>${s.count} bài</span></span>
          </div>
          <div class="progress ${s.count && s.ac === s.count ? 'done' : ''}"><div style="width:${pct}%"></div></div>
        </div>
      </button>`;
  }

  function draw() {
    topicsEl.innerHTML = topics
      .map((t) => `<button class="chip ${t === state.topic ? 'on' : ''}" aria-pressed="${t === state.topic}" data-topic="${esc(t)}">${esc(t)}</button>`)
      .join('');
    const q = state.query.trim().toLowerCase();
    const list = sets.filter((s) => {
      if (state.hideDone && s.count && s.ac === s.count) return false;
      if (state.topic !== 'Tất cả' && !s.tags.includes(state.topic)) return false;
      if (q && !`${s.title} ${s.desc} ${s.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
    grid.innerHTML = list.length
      ? `<div class="set-grid">${list.map(card).join('')}</div>`
      : `<div class="empty-box"><b style="font-size:17px;font-weight:600">Không tìm thấy khối nào</b>
          <span class="muted" style="font-size:14px">Thử từ khóa khác hoặc bỏ bớt bộ lọc.</span>
          <button class="btn" data-clear style="margin-top:6px">Xóa bộ lọc</button></div>`;
  }

  ctx.view.querySelector('[data-q]').addEventListener('input', (e) => ((state.query = e.target.value), draw()));
  ctx.view.querySelector('[data-hide]').addEventListener('change', (e) => ((state.hideDone = e.target.checked), draw()));
  ctx.view.querySelector('main').addEventListener('click', (e) => {
    const topic = e.target.closest('[data-topic]');
    if (topic) (state.topic = topic.dataset.topic), draw();
    if (e.target.closest('[data-clear]')) {
      Object.assign(state, { query: '', topic: 'Tất cả', hideDone: false });
      ctx.view.querySelector('[data-q]').value = '';
      ctx.view.querySelector('[data-hide]').checked = false;
      draw();
    }
  });
  draw();
}
