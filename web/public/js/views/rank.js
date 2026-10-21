import { api } from '../api.js';
import { avatarColor, esc, fmtWhen, initials } from '../ui.js';

const GROUP_SHORT = { 'Bài tập theo tuần': 'Theo tuần', 'Lộ trình Kỹ thuật lập trình': 'Lộ trình KTLT' };
const groupLabel = (g) => GROUP_SHORT[g] || g.replace(/\s*—.*$/, '') || 'Khác';

export async function render(ctx) {
  let setId = null;
  ctx.view.innerHTML = `<main class="page" style="max-width:1100px" data-rank></main>`;
  const root = ctx.view.querySelector('[data-rank]');

  async function draw() {
    const data = await api(`/api/leaderboard${setId ? `?set=${encodeURIComponent(setId)}` : ''}`);
    const set = data.sets.find((s) => s.id === setId) || null;
    const groups = [...new Set(data.sets.map((s) => s.group))].map((g) => ({
      name: g,
      sets: data.sets.filter((s) => s.group === g),
    }));
    groups.forEach((g) => { g.count = g.sets.reduce((n, s) => n + s.count, 0); });
    const groupScore = (r, g) => g.sets.reduce((n, s) => n + (r.perSet[s.id] || 0), 0);
    const score = (r) => (set ? r.perSet[set.id] || 0 : r.total);

    let rank = 0;
    const ranks = data.rows.map((r) => (score(r) > 0 ? ++rank : null));
    const meIdx = data.rows.findIndex((r) => r.username === ctx.user.username);
    const me = data.rows[meIdx];
    const cols = set ? data.problems.length : groups.length;
    const tabs = [{ id: null, label: 'Tổng' }, ...data.sets.map((s) => ({ id: s.id, label: s.short, open: s.status === 'open' }))];

    const head = set
      ? data.problems.map((p) => `<span class="center wide-only" title="${esc(p.title)}">${esc(p.id)}</span>`).join('')
      : groups.map((g) => `<span class="right wide-only" title="${esc(g.name)}">${esc(groupLabel(g.name))}<small class="faint">/${g.count}</small></span>`).join('');

    const cells = (r) => {
      if (set) {
        const ok = new Set(r.solved);
        return data.problems
          .map((p) => `<span class="center wide-only">${ok.has(p.id) ? '<span class="rank-ok" aria-label="Đã AC">✓</span>' : '<span class="faint">·</span>'}</span>`)
          .join('');
      }
      return groups.map((g) => `<span class="right mono muted wide-only">${groupScore(r, g)}</span>`).join('');
    };

    const row = (r, i) => `
      <div class="trow rank-cols ${r.username === ctx.user.username ? 'me' : ''}" role="row">
        <span class="mono" style="font-weight:600;color:${ranks[i] && ranks[i] <= 3 ? 'var(--fg)' : 'var(--fg3)'}">${ranks[i] ?? '—'}</span>
        <span class="rank-user">
          <span class="avatar" style="width:28px;height:28px;font-size:11.5px;background:${avatarColor(r.username)}">${esc(initials(r.username))}</span>
          <span class="mono ellipsis" style="font-weight:500">${esc(r.username)}</span>
          ${r.username === ctx.user.username ? '<span class="me-tag">Bạn</span>' : ''}
        </span>
        <b class="right mono" style="font-size:15px">${score(r)}</b>
        ${cells(r)}
        <span class="right faint wide-only" style="font-size:13.5px;white-space:nowrap">${r.lastAcAt ? fmtWhen(r.lastAcAt) : '—'}</span>
      </div>`;

    root.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:16px">
        <div style="display:flex;flex-direction:column;gap:6px">
          <h1 class="page-title">Bảng xếp hạng</h1>
          <p class="muted" style="margin:0">${data.rows.length} thành viên · ${set ? `khối ${esc(set.short)}, ${set.count} bài` : 'tính trên toàn bộ đề'} · bằng điểm thì ai AC trước xếp trên</p>
        </div>
        <div class="me-card">Hạng của bạn <b>${me && ranks[meIdx] ? ranks[meIdx] : '—'}<span style="font-size:14px;color:var(--fg3)">/${data.rows.length}</span></b> · ${me ? score(me) : 0} bài</div>
      </div>
      <div class="underline-tabs" role="tablist">
        ${tabs.map((t) => `<button role="tab" class="${t.id === setId ? 'on' : ''}" data-set="${t.id ?? ''}">${t.open ? '<span class="tab-dot" title="Đang mở"></span>' : ''}${esc(t.label)}</button>`).join('')}
      </div>
      <div class="rank-scroll">
        <div class="table rank-table" role="table" style="--cols:${Math.max(1, cols)}">
          <div class="trow thead rank-cols" role="row">
            <span>#</span><span>Người dùng</span><span class="right">${set ? 'Đã giải' : 'Tổng'}</span>
            ${head}
            <span class="right wide-only">AC gần nhất</span>
          </div>
          ${data.rows.map(row).join('') || '<div class="empty">Chưa có thành viên nào.</div>'}
        </div>
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
