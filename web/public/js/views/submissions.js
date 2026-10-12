import { api } from '../api.js';
import { badge, esc, fmtWhen, statLine, verdictLabel, verdictVar } from '../ui.js';

const FILTERS = [
  ['all', 'Tất cả'],
  ['AC', 'AC'],
  ['WA', 'WA'],
  ['TLE', 'TLE'],
  ['MLE', 'MLE'],
  ['RE', 'RE'],
  ['CE', 'CE'],
];

export async function render(ctx) {
  const subs = await api('/api/submissions');
  const counts = { all: subs.length };
  for (const s of subs) counts[s.verdict] = (counts[s.verdict] || 0) + 1;
  let filter = 'all';

  ctx.view.innerHTML = `
    <main class="page" style="max-width:1100px">
      <div style="display:flex;flex-direction:column;gap:6px">
        <h1 class="page-title">Bài nộp của tôi</h1>
        <p class="muted" style="margin:0">${subs.length} bài nộp · ${counts.AC || 0} Accepted</p>
      </div>
      <div class="chip-row" role="group" aria-label="Lọc theo kết quả" data-chips></div>
      <div class="table" role="table" data-table></div>
    </main>`;

  const row = (s) => `
    <button class="trow sub-cols" data-go="#/problem/${encodeURIComponent(s.problem_id)}/history">
      <span class="mono faint">#${s.id}</span>
      <span class="muted wide-only" style="white-space:nowrap">${fmtWhen(s.created_at)}</span>
      <span class="ellipsis"><span class="mono muted" style="margin-right:8px">${esc(s.problem_id)}</span>${esc(s.title)}</span>
      <span class="vtext wide-only" style="--v:${verdictVar(s.verdict)}">${badge(s.verdict)}<span class="ellipsis">${esc(verdictLabel(s.verdict))}</span></span>
      <span class="right mono muted wide-only" style="font-size:13px;white-space:nowrap">${statLine(s)}</span>
      <span class="narrow-only" style="justify-self:end" title="${esc(verdictLabel(s.verdict))}">${badge(s.verdict)}</span>
    </button>`;

  function draw() {
    ctx.view.querySelector('[data-chips]').innerHTML = FILTERS.map(
      ([k, label]) =>
        `<button class="chip ${k === filter ? 'on' : ''}" aria-pressed="${k === filter}" data-filter="${k}">${label}<span class="count">${counts[k] || 0}</span></button>`,
    ).join('');
    const list = subs.filter((s) => filter === 'all' || s.verdict === filter);
    ctx.view.querySelector('[data-table]').innerHTML = `
      <div class="trow thead sub-cols" role="row">
        <span>ID</span><span class="wide-only">Thời điểm</span><span>Bài</span>
        <span class="wide-only">Kết quả</span><span class="right wide-only">Thời gian · Bộ nhớ</span>
        <span class="right narrow-only">KQ</span>
      </div>
      ${list.map(row).join('') || `<div class="empty">${subs.length ? 'Không có bài nộp nào với kết quả này.' : 'Bạn chưa nộp bài nào. Vào mục Bài tập để bắt đầu nhé!'}</div>`}`;
  }

  ctx.view.querySelector('[data-chips]').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (chip) (filter = chip.dataset.filter), draw();
  });
  draw();
}
