import { api } from '../api.js';
import { diffMeter, esc, fmtWhen, pillStyle, renderAvatar, setStatus } from '../ui.js';

const MY = {
  ac: ['✓', 'ac', 'Đã Accepted'],
  tried: ['✗', 'tried', 'Đã thử, chưa đúng'],
  '': ['', '', 'Chưa thử'],
};

function rankBadge(rank) {
  if (rank === 1) return `<span class="rank-medal gold" title="Hạng 1" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#fef08a;color:#854d0e;font-weight:700;font-size:14px;box-shadow:0 2px 6px rgba(234,179,8,0.3);">🥇</span>`;
  if (rank === 2) return `<span class="rank-medal silver" title="Hạng 2" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#e2e8f0;color:#334155;font-weight:700;font-size:14px;box-shadow:0 2px 6px rgba(148,163,184,0.3);">🥈</span>`;
  if (rank === 3) return `<span class="rank-medal bronze" title="Hạng 3" style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#ffedd5;color:#9a3412;font-weight:700;font-size:14px;box-shadow:0 2px 6px rgba(249,115,22,0.3);">🥉</span>`;
  return `<span class="mono muted" style="font-weight:600;font-size:14px;display:inline-block;width:28px;text-align:center;">${rank}</span>`;
}

function renderPodium(topUsers) {
  if (!topUsers.length) return '';
  return `
    <div class="set-podium" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:20px;">
      ${topUsers.map((u) => {
        const medal = u.rank === 1 ? '🥇 Quán quân' : u.rank === 2 ? '🥈 Á quân 1' : '🥉 Á quân 2';
        const borderColor = u.rank === 1 ? '#eab308' : u.rank === 2 ? '#94a3b8' : '#f97316';
        return `
          <a class="card-box" href="#/profile/${encodeURIComponent(u.username)}" style="padding:16px;text-decoration:none;color:inherit;border-top:3px solid ${borderColor};display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12.5px;font-weight:700;color:${borderColor};display:inline-flex;align-items:center;gap:4px;">${medal}</span>
              ${u.isMe ? '<span style="background:var(--accent);color:#fff;font-size:11px;padding:1px 6px;border-radius:4px;font-weight:600;">Bạn</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              ${renderAvatar(u.username, u.avatar, 42)}
              <div style="display:flex;flex-direction:column;min-width:0;">
                <b class="ellipsis" style="font-size:14.5px;">${esc(u.fullName || u.username)}</b>
                <span class="mono faint" style="font-size:12.5px;">${esc(u.username)}</span>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding-top:6px;border-top:1px solid var(--line);">
              <span class="muted">Điểm:</span>
              <b class="num" style="color:var(--accent);font-size:15px;">${u.score} <small class="faint" style="font-size:12px;font-weight:normal;">/ ${u.maxScore}</small></b>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;">
              <span class="muted">Đã giải:</span>
              <span class="num" style="color:var(--ac);font-weight:600;">${u.solved} / ${u.total} AC</span>
            </div>
          </a>`;
      }).join('')}
    </div>`;
}

function rankHtml(board) {
  if (!board.length) {
    return `<div class="card-box" style="padding:48px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;">
      <span style="font-size:42px;">🏆</span>
      <b style="font-size:17px;">Chưa có bạn nào ghi tên lên bảng xếp hạng</b>
      <p class="muted" style="margin:0;max-width:440px;font-size:13.5px;">Hãy nộp bài AC đầu tiên trong khối này để trở thành người dẫn đầu!</p>
      <button class="btn-primary" data-tab-btn="probs" style="margin-top:8px;">Bắt đầu làm bài ngay</button>
    </div>`;
  }
  const top3 = board.slice(0, Math.min(3, board.length));
  return `
    <!-- Top 3 Podium -->
    ${renderPodium(top3)}

    <!-- Bảng xếp hạng toàn khối -->
    <div class="table" role="table">
      <div class="trow thead" style="grid-template-columns: 52px minmax(160px, 1.4fr) 110px minmax(130px, 1.2fr) 75px 125px; font-weight:600;" role="row">
        <span style="text-align:center;">Hạng</span>
        <span>Sinh viên</span>
        <span class="right" style="padding-right:8px;">Điểm</span>
        <span>Tiến độ bài</span>
        <span class="right wide-only">Lần nộp</span>
        <span class="right">Gần nhất</span>
      </div>
      ${board
        .map((u) => {
          const isMeStyle = u.isMe ? 'background:color-mix(in oklch, var(--accent) 9%, transparent);' : '';
          return `
            <div class="trow" style="grid-template-columns: 52px minmax(160px, 1.4fr) 110px minmax(130px, 1.2fr) 75px 125px; align-items:center; ${isMeStyle}">
              <span style="display:flex;justify-content:center;">${rankBadge(u.rank)}</span>
              <a href="#/profile/${encodeURIComponent(u.username)}" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;min-width:0;" title="Xem hồ sơ ${esc(u.username)}">
                ${renderAvatar(u.username, u.avatar, 32)}
                <div style="display:flex;flex-direction:column;min-width:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <b class="ellipsis" style="font-size:14px;color:var(--accent);">${esc(u.fullName || u.username)}</b>
                    ${u.isMe ? '<span style="font-size:11px;padding:1px 5px;border-radius:4px;background:var(--accent);color:#fff;font-weight:600;">Bạn</span>' : ''}
                  </div>
                  <span class="mono faint" style="font-size:12px;">${esc(u.username)}</span>
                </div>
              </a>
              <div class="right" style="padding-right:8px;">
                <b class="num" style="color:var(--accent);font-size:15px;">${u.score}</b>
                <span class="faint" style="font-size:12px;"> / ${u.maxScore}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;padding-right:12px;">
                <div style="display:flex;justify-content:space-between;font-size:12.5px;">
                  <b class="num" style="color:var(--ac);">${u.solved} / ${u.total}</b>
                  <span class="muted">${u.pct}%</span>
                </div>
                <div class="progress ${u.solved === u.total ? 'done' : ''}" style="height:5px;">
                  <div style="width:${u.pct}%;"></div>
                </div>
              </div>
              <span class="right mono muted wide-only">${u.submissions}</span>
              <span class="right faint" style="font-size:12.5px;">${fmtWhen(u.lastScoreAt || u.lastAcAt)}</span>
            </div>`;
        })
        .join('')}
    </div>
    <p class="faint" style="margin:14px 0 0;font-size:13px;">Thứ hạng xếp theo tổng điểm subtest giảm dần, ưu tiên số bài AC và người đạt điểm sớm hơn khi bằng điểm.</p>
  `;
}

export async function render(ctx) {
  const parts = (ctx.arg || '').split('/');
  const setId = parts[0];
  const initialTab = ctx.extra === 'rank' || parts[1] === 'rank' ? 'rank' : 'probs';

  const { set, problems, leaderboard = [], myRank } = await api(`/api/sets/${encodeURIComponent(setId)}`);
  const [label, color] = setStatus(set);
  const pct = set.count ? Math.round((set.ac / set.count) * 100) : 0;
  let activeTab = initialTab;

  const problemRow = (p) => {
    const [icon, cls, title] = MY[p.my] || MY[''];
    return `
      <button class="trow set-cols" data-go="#/problem/${encodeURIComponent(p.id)}">
        <span class="my-icon ${cls}" title="${title}">${icon}</span>
        <span class="mono muted">${esc(p.id)}</span>
        <span class="ellipsis" style="font-weight:500">${esc(p.title)}</span>
        <span>${diffMeter(p.difficulty)}</span>
        <span class="ac-rate wide-only"><span class="bar"><span style="width:${p.acRate}%"></span></span>${p.acRate}%</span>
        <span class="right mono muted wide-only">${p.solved}</span>
      </button>`;
  };

  const top3 = leaderboard.slice(0, Math.min(3, leaderboard.length));

  ctx.view.innerHTML = `
    <main class="page" style="max-width:1100px;padding-top:28px;gap:24px">
      <nav class="crumbs" aria-label="breadcrumb">
        <button class="link-btn" data-go="#/home">Bài tập</button><span>›</span><span class="current">${esc(set.title)}</span>
      </nav>

      <div class="set-head" style="align-items:flex-start;">
        <div style="display:flex;flex-direction:column;gap:10px;max-width:640px;flex:1 1 360px;">
          <div style="display:flex;gap:14px;align-items:center">
            <span class="pill" style="${pillStyle(color)}">${esc(label)}</span>
            ${diffMeter(set.difficulty)}
          </div>
          <h1 class="page-title" style="margin:0;">${esc(set.title)}</h1>
          <p class="muted" style="margin:0">${esc(set.desc)}</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;flex:0 0 280px;width:100%;max-width:320px;">
          <div class="set-progress" style="flex:none;width:100%;">
            <div style="display:flex;justify-content:space-between;font-size:14px"><span class="muted">Tiến độ của tôi</span><b class="num" style="font-weight:650">${set.ac}/${set.count} bài</b></div>
            <div class="progress ${set.count && set.ac === set.count ? 'done' : ''}"><div style="width:${pct}%"></div></div>
          </div>
          <div data-my-rank-box>
            ${
              myRank
                ? `<div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;padding:6px 12px;background:var(--bg3);border-radius:var(--r-sm);">
                    <span class="muted">Hạng của bạn:</span>
                    <b class="mono" style="color:var(--accent);">#${myRank.rank} / ${leaderboard.length} bạn (${myRank.score}/${myRank.maxScore} điểm)</b>
                  </div>`
                : `<div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;padding:6px 12px;background:var(--bg3);border-radius:var(--r-sm);">
                    <span class="muted">Bảng xếp hạng:</span>
                    <span class="faint">${leaderboard.length} bạn đã tham gia</span>
                  </div>`
            }
          </div>
        </div>
      </div>

      <!-- Tab bar chuyển đổi Danh sách bài / Bảng xếp hạng -->
      <div class="set-tabs-bar" style="display:flex;gap:10px;border-bottom:1px solid var(--line2);padding-bottom:10px;margin-top:4px;">
        <button class="btn ${activeTab === 'probs' ? 'btn-primary' : 'btn-ghost'}" data-tab-btn="probs" style="font-weight:600;display:inline-flex;align-items:center;gap:8px;">
          <span>📚 Danh sách bài</span>
          <span style="font-size:12px;padding:2px 7px;border-radius:999px;background:color-mix(in oklch, currentColor 18%, transparent);">${problems.length}</span>
        </button>
        <button class="btn ${activeTab === 'rank' ? 'btn-primary' : 'btn-ghost'}" data-tab-btn="rank" style="font-weight:600;display:inline-flex;align-items:center;gap:8px;">
          <span>🏆 Bảng xếp hạng khối</span>
          <span data-rank-count style="font-size:12px;padding:2px 7px;border-radius:999px;background:color-mix(in oklch, currentColor 18%, transparent);">${leaderboard.length}</span>
        </button>
      </div>

      <!-- Tab 1: Danh sách bài tập -->
      <div data-tab-pane="probs" style="${activeTab === 'probs' ? '' : 'display:none;'}">
        <div class="table" role="table">
          <div class="trow thead set-cols" role="row">
            <span></span><span>Mã</span><span>Tên bài</span><span>Độ khó</span>
            <span class="right wide-only">Tỉ lệ AC</span><span class="right wide-only">Đã giải</span>
          </div>
          ${problems.map(problemRow).join('') || '<div class="empty">Khối này chưa có bài nào.</div>'}
        </div>
        <p class="faint" style="margin:14px 0 0;font-size:13px;"><span style="color:var(--ac)">✓</span> đã AC · <span style="color:var(--wa)">✗</span> đã thử, chưa đúng · Tỉ lệ AC và số bạn đã giải tính trên ${set.classSize} sinh viên</p>
      </div>

      <!-- Tab 2: Bảng xếp hạng khối -->
      <div data-tab-pane="rank" style="${activeTab === 'rank' ? '' : 'display:none;'}">
        ${rankHtml(leaderboard)}
      </div>
    </main>`;

  // Xử lý chuyển tab
  ctx.view.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab-btn]');
    if (!btn) return;
    const tab = btn.dataset.tabBtn;
    if (tab === activeTab) return;
    activeTab = tab;

    ctx.view.querySelectorAll('[data-tab-btn]').forEach((b) => {
      const match = b.dataset.tabBtn === tab;
      b.className = `btn ${match ? 'btn-primary' : 'btn-ghost'}`;
    });

    ctx.view.querySelectorAll('[data-tab-pane]').forEach((p) => {
      p.style.display = p.dataset.tabPane === tab ? '' : 'none';
    });
  });

  let alive = true;
  const pollTimer = setInterval(async () => {
    if (!alive) return;
    try {
      const fresh = await api(`/api/sets/${encodeURIComponent(setId)}`);
      if (!alive) return;
      const rankPane = ctx.view.querySelector('[data-tab-pane="rank"]');
      if (rankPane) rankPane.innerHTML = rankHtml(fresh.leaderboard || []);
      const countEl = ctx.view.querySelector('[data-rank-count]');
      if (countEl) countEl.textContent = (fresh.leaderboard || []).length;
      const rankBox = ctx.view.querySelector('[data-my-rank-box]');
      if (rankBox) {
        rankBox.innerHTML = fresh.myRank
          ? `<div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;padding:6px 12px;background:var(--bg3);border-radius:var(--r-sm);">
              <span class="muted">Hạng của bạn:</span>
              <b class="mono" style="color:var(--accent);">#${fresh.myRank.rank} / ${(fresh.leaderboard || []).length} bạn (${fresh.myRank.score}/${fresh.myRank.maxScore} điểm)</b>
            </div>`
          : `<div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;padding:6px 12px;background:var(--bg3);border-radius:var(--r-sm);">
              <span class="muted">Bảng xếp hạng:</span>
              <span class="faint">${(fresh.leaderboard || []).length} bạn đã tham gia</span>
            </div>`;
      }
    } catch {}
  }, 3000);

  return () => {
    alive = false;
    clearInterval(pollTimer);
  };
}
