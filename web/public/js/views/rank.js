import { api } from '../api.js';
import { avatarColor, esc, fmtWhen, initials } from '../ui.js';

const abbr = (short) => short.replace(/^Tuần\s*/i, 'T');

export async function render(ctx) {
  let setId = null;
  ctx.view.innerHTML = `<main class="page" style="max-width:1000px" data-rank></main>`;
  const root = ctx.view.querySelector('[data-rank]');

  async function draw() {
    const data = await api(`/api/leaderboard${setId ? `?set=${encodeURIComponent(setId)}` : ''}`);
    const score = (r) => (setId ? r.perSet[setId] || 0 : r.total);
    const meIdx = data.rows.findIndex((r) => r.username === ctx.user.username);
    const me = data.rows[meIdx];
    const tabs = [{ id: null, label: 'Tổng' }, ...data.sets.map((s) => ({ id: s.id, label: s.status === 'open' ? `${s.short} — đang mở` : s.short }))];

    const row = (r, i) => `
      <div class="trow rank-cols ${r.username === ctx.user.username ? 'me' : ''}" role="row">
        <span class="mono" style="font-weight:600;color:${i < 3 ? 'var(--fg)' : 'var(--fg3)'}">${i + 1}</span>
        <span style="display:flex;align-items:center;gap:10px;min-width:0">
          <span class="avatar" style="width:28px;height:28px;font-size:11.5px;background:${avatarColor(r.username)}">${esc(initials(r.username))}</span>
          <span class="mono ellipsis" style="font-weight:500">${esc(r.username)}</span>
          ${r.username === ctx.user.username ? '<span class="me-tag">Bạn</span>' : ''}
        </span>
        <b class="right mono" style="font-size:15px">${score(r)}</b>
        ${data.sets.map((s) => `<span class="right mono muted wide-only">${r.perSet[s.id] || 0}</span>`).join('')}
        <span class="right faint wide-only" style="font-size:13.5px;white-space:nowrap">${r.lastAcAt ? fmtWhen(r.lastAcAt) : '—'}</span>
      </div>`;

    root.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:16px">
        <div style="display:flex;flex-direction:column;gap:6px">
          <h1 class="page-title">Bảng xếp hạng</h1>
          <p class="muted" style="margin:0">${data.rows.length} thành viên · bằng điểm thì ai AC trước xếp trên</p>
        </div>
        <div class="me-card">Hạng của bạn <b>${meIdx >= 0 ? meIdx + 1 : '—'}<span style="font-size:14px;color:var(--fg3)">/${data.rows.length}</span></b> · ${me ? score(me) : 0} bài</div>
      </div>
      <div class="underline-tabs" role="tablist">
        ${tabs.map((t) => `<button role="tab" class="${t.id === setId ? 'on' : ''}" data-set="${t.id ?? ''}">${esc(t.label)}</button>`).join('')}
      </div>
      <div class="table" role="table" style="--sets:${Math.max(1, data.sets.length)}">
        <div class="trow thead rank-cols" role="row">
          <span>#</span><span>Người dùng</span><span class="right">${setId ? esc(abbr(data.sets.find((s) => s.id === setId).short)) : 'Đã giải'}</span>
          ${data.sets.map((s) => `<span class="right wide-only">${esc(abbr(s.short))}/${s.count}</span>`).join('')}
          <span class="right wide-only">AC gần nhất</span>
        </div>
        ${data.rows.map(row).join('') || '<div class="empty">Chưa có thành viên nào.</div>'}
      </div>`;
  }

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-set]');
    if (!tab) return;
    setId = tab.dataset.set || null;
    draw();
  });
  await draw();
}
