import { api } from '../api.js';
import { diffMeter, esc, pillStyle, renderAvatar, setStatus } from '../ui.js';

function parseRating(str) {
  if (!str) return 5.0;
  const m = String(str).match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 5.0;
  let val = parseFloat(m[1].replace(',', '.'));
  if (isNaN(val)) return 5.0;
  if (val > 5 && val <= 10) val = val / 2;
  return Math.max(0, Math.min(5, val));
}

function renderStarsHtml(ratingStr) {
  const score = parseRating(ratingStr);
  const stars = [1, 2, 3, 4, 5].map((i) => {
    const diff = score - (i - 1);
    if (diff >= 0.85) {
      return '<span style="color:#f59e0b">★</span>';
    } else if (diff >= 0.15) {
      const fillPct = Math.round(diff * 100);
      return `<span style="position:relative;display:inline-block;color:rgba(148,163,184,0.35);line-height:1">★<span style="position:absolute;top:0;left:0;width:${fillPct}%;overflow:hidden;color:#f59e0b;white-space:nowrap;line-height:1">★</span></span>`;
    } else {
      return '<span style="color:rgba(148,163,184,0.35)">★</span>';
    }
  }).join('');
  return `<span class="course-stars-flex" title="${score.toFixed(1)}/5 sao" style="display:inline-flex;gap:2px;font-size:13px;line-height:1;user-select:none">${stars}</span>`;
}

const THEME_PRESETS = {
  blue: { gradient: 'linear-gradient(135deg, #090d16 0%, #1e3a8a 50%, #0284c7 100%)', border: '#0284c7', avatar: '👨‍💻' },
  amber: { gradient: 'linear-gradient(135deg, #18181b 0%, #7c2d12 50%, #ea580c 100%)', border: '#ea580c', avatar: '⚡' },
  purple: { gradient: 'linear-gradient(135deg, #09090b 0%, #4c1d95 50%, #8b5cf6 100%)', border: '#8b5cf6', avatar: '🏆' },
  emerald: { gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)', border: '#10b981', avatar: '🚀' },
  ruby: { gradient: 'linear-gradient(135deg, #881337 0%, #be123c 50%, #f43f5e 100%)', border: '#f43f5e', avatar: '🎯' },
  cyan: { gradient: 'linear-gradient(135deg, #083344 0%, #0e7490 50%, #06b6d4 100%)', border: '#06b6d4', avatar: '💻' },
  dark: { gradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)', border: '#52525b', avatar: '⚙️' },
};

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

export async function render(ctx) {
  const courseName = ctx.arg || '';

  let courseData, lbData;
  try {
    [courseData, lbData] = await Promise.all([
      api(`/api/courses/${encodeURIComponent(courseName)}`),
      api(`/api/courses/${encodeURIComponent(courseName)}/leaderboard`).catch(() => ({ leaderboard: [], myRank: null })),
    ]);
  } catch (err) {
    const isRestricted = err.status === 403 || err.data?.code === 'restricted';
    const msg = isRestricted
      ? 'Khóa học này được đặt ở chế độ riêng tư, chỉ tài khoản được chỉ định mới có thể truy cập.'
      : (err.message || `Không tìm thấy khóa học "${courseName}"`);
    ctx.view.innerHTML = `
      <main class="page" style="max-width:720px;padding-top:48px">
        <div class="empty-box" style="padding:40px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px">
          <span style="font-size:42px">${isRestricted ? '🔒' : '🔍'}</span>
          <b style="font-size:16px">${esc(msg)}</b>
          <button class="btn" data-go="#/home" style="margin-top:8px">Về danh sách khóa học</button>
        </div>
      </main>`;
    return;
  }

  const courseSets = courseData.sets || [];
  const meta = courseData.meta || {};
  const { leaderboard = [], myRank = null } = lbData;

  if (!courseSets.length && !meta.badge) {
    ctx.view.innerHTML = `
      <main class="page" style="max-width:720px;padding-top:48px">
        <div class="empty-box">
          <b>Không tìm thấy khóa học "${esc(courseName)}"</b>
          <button class="btn" data-go="#/home">Về danh sách khóa học</button>
        </div>
      </main>`;
    return;
  }
  const theme = THEME_PRESETS[meta.theme || 'blue'] || THEME_PRESETS.blue;
  const bannerGradient = (meta.customColor && meta.customColor.trim())
    ? `linear-gradient(135deg, #090d16 0%, ${meta.customColor.trim()} 65%, color-mix(in srgb, ${meta.customColor.trim()} 75%, #ffffff) 100%)`
    : theme.gradient;

  const badge = meta.badge || 'CHÍNH QUY · UTC2';
  const tech = meta.tech || 'C11 · GCC -O2';
  const sub = meta.sub || `${courseSets.length} Khối bài học bám sát chương trình đào tạo`;

  const highlights = (meta.highlights && meta.highlights.length)
    ? meta.highlights
    : [
        `${courseSets.length} Chương bài học bám sát đề cương chuẩn UTC2`,
        'Website chấm bài tự động 24/7 với hệ thống MiniJudge',
        'Tổng hợp bài tập thực hành từ cơ bản đến nâng cao',
      ];

  const total = courseSets.reduce((t, s) => t + s.count, 0);
  const ac = courseSets.reduce((t, s) => t + s.ac, 0);
  const pct = total ? Math.round((ac / total) * 100) : 0;
  const done = total && ac === total;
  const next = courseSets.find((s) => s.count && s.ac < s.count);

  let currentTab = 'roadmap'; // 'roadmap' | 'leaderboard'
  let lbQuery = '';

  /* Bước trong lộ trình chính (Roadmap Stepper) */
  const step = (s, i, list) => {
    const isDone = s.count && s.ac === s.count;
    const isCurrent = !isDone && list.findIndex((x) => !(x.count && x.ac === x.count)) === i;
    const spct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
    const cls = isDone ? 'done' : isCurrent ? 'current' : s.ac ? 'started' : '';

    return `
      <li class="step ${cls}">
        <span class="step-dot" aria-hidden="true">${isDone ? '✓' : (i + 1)}</span>
        <button class="step-card" data-go="#/set/${encodeURIComponent(s.id)}">
          <span class="step-text">
            <span class="step-title">
              ${esc(s.title)}
              ${isCurrent ? '<span class="step-now">đang học</span>' : ''}
            </span>
            ${s.desc ? `<span class="muted">${esc(s.desc)}</span>` : ''}
          </span>
          <span class="step-meta">
            <span><b class="num">${s.ac}</b>/${s.count} bài</span>
            <span class="progress ${isDone ? 'done' : ''}"><span style="width:${spct}%"></span></span>
          </span>
        </button>
      </li>`;
  };

  function renderCoursePodium(list, totalCount) {
    if (!list || list.length < 2) return '';
    const u1 = list[0];
    const u2 = list[1];
    const u3 = list[2] || null;

    const renderPillar = (u, rank) => {
      if (!u) return '<div class="podium-pillar rank-3" style="opacity:0.35"></div>';
      const name = esc(u.fullName || u.username);
      const username = esc(u.username);
      const isRank1 = rank === 1;
      const avatarSize = isRank1 ? 72 : rank === 2 ? 62 : 56;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
      const rankLabel = rank === 1 ? 'QUÁN QUÂN' : rank === 2 ? 'Á QUÂN' : 'QUÝ QUÂN';
      const pct = u.pct != null ? u.pct : (totalCount ? Math.round((u.solved / totalCount) * 100) : 0);

      return `
        <div class="podium-pillar rank-${rank}">
          <div class="podium-person">
            ${isRank1 ? '<span class="podium-crown">👑</span>' : ''}
            <div class="podium-avatar-wrap">
              ${renderAvatar(u.username, u.avatar, avatarSize, u.fullName)}
              <span class="podium-medal-badge">${medal}</span>
            </div>
            <div class="podium-info">
              <span class="podium-name" title="${name}">${name}</span>
              <span class="podium-handle">@${username}</span>
              <span class="podium-score">${u.solved}/${totalCount} bài (${pct}%)</span>
            </div>
          </div>
          <div class="podium-step step-${rank}">
            <span class="podium-rank-num">${rank}</span>
            <span class="podium-rank-label">${rankLabel}</span>
          </div>
        </div>
      `;
    };

    return `
      <div class="podium-container">
        <div class="podium-stage">
          ${renderPillar(u2, 2)}
          ${renderPillar(u1, 1)}
          ${renderPillar(u3, 3)}
        </div>
        <div class="podium-base-bar"></div>
      </div>
    `;
  }

  function renderLeaderboardView() {
    const q = lbQuery.trim().toLowerCase();
    const filteredRows = leaderboard.filter(
      (r) => !q || (r.fullName && r.fullName.toLowerCase().includes(q)) || (r.username && r.username.toLowerCase().includes(q))
    );

    const myPct = myRank ? (myRank.pct != null ? myRank.pct : (total ? Math.round((myRank.solved / total) * 100) : 0)) : 0;

    return `
      <div style="display:flex;flex-direction:column;gap:20px;margin-top:20px">
        <!-- Vị trí của bạn (My Rank) -->
        ${
          myRank
            ? `
          <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;background:color-mix(in oklch, var(--accent) 12%, var(--bg3));border:1.5px solid var(--accent);border-radius:12px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:24px;font-weight:800;color:var(--accent)">#${myRank.rank}</span>
              <div>
                <div style="font-size:14.5px;font-weight:700;color:var(--fg)">Vị trí của bạn trên Bảng xếp hạng</div>
                <div style="font-size:12.5px;color:var(--fg2)">Đã giải <b>${myRank.solved}/${total}</b> bài (${myPct}%) · Điểm số: <b>${myRank.score}</b></div>
              </div>
            </div>
            <div style="margin-left:auto;display:flex;align-items:center;gap:16px">
              <span class="faint" style="font-size:12.5px">Thời gian: <b>${formatDuration(myRank.durationMs)}</b></span>
              <span class="chip-sm" style="background:var(--accent);color:var(--on-accent);font-size:12px;padding:3px 10px;border-radius:99px">Hạng #${myRank.rank}</span>
            </div>
          </div>`
            : ''
        }

        <!-- Top 3 Bục vinh quang (Podium Stand) -->
        ${renderCoursePodium(leaderboard, total)}

        <!-- Tìm kiếm sinh viên trong BXH -->
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <input class="ctl" data-lb-q placeholder="Tìm theo tên hoặc MSSV…" value="${esc(lbQuery)}" style="flex:1 1 240px;max-width:320px" />
          <span class="count" style="margin-left:auto">${filteredRows.length}/${leaderboard.length} sinh viên tham gia</span>
        </div>

        <!-- Bảng xếp hạng chi tiết -->
        <div class="panel" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--r-lg);">
          <table class="atable" style="min-width:680px;width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="width:70px;text-align:center">Hạng</th>
                <th style="text-align:left">Sinh viên</th>
                <th style="width:140px;text-align:center">Đã giải (AC)</th>
                <th style="width:100px;text-align:center">Điểm số</th>
                <th style="width:100px;text-align:center">Số bài nộp</th>
                <th style="width:110px;text-align:center">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              ${
                filteredRows.length
                  ? filteredRows
                      .map((u) => {
                        const isMe = Boolean(myRank && u.id === myRank.id);
                        const medal = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : null;
                        const rankDisplay = medal
                          ? `<span style="font-size:18px;line-height:1" title="Hạng ${u.rank}">${medal}</span>`
                          : `<span class="mono" style="font-size:13.5px;font-weight:600;color:var(--fg3)">#${u.rank}</span>`;
                        return `
                        <tr style="${isMe ? 'background:color-mix(in oklch, var(--accent) 12%, transparent);box-shadow:inset 4px 0 0 var(--accent);' : ''}">
                          <td style="text-align:center;font-weight:700;">${rankDisplay}</td>
                          <td style="text-align:left;">
                            <div style="display:flex;align-items:center;gap:10px">
                              ${renderAvatar(u.username, u.avatar, 30, u.fullName)}
                              <div style="display:flex;flex-direction:column;min-width:0;line-height:1.25">
                                <span class="ellipsis" style="font-weight:700;color:var(--fg);font-size:13.5px">${esc(u.fullName || u.username)}${isMe ? ' <span class="me-tag" style="background:var(--accent);color:var(--on-accent);padding:1px 5px;border-radius:4px;font-size:10px;margin-left:4px;font-weight:700;">BẠN</span>' : ''}</span>
                                <span class="mono faint" style="font-size:11.5px">@${esc(u.username)}</span>
                              </div>
                            </div>
                          </td>
                          <td style="text-align:center;">
                            <span class="mono" style="font-weight:700;color:var(--fg);font-size:13px">${u.solved}</span><span class="mono faint" style="font-size:12px">/${total}</span>
                            <span class="mono faint" style="font-size:11px;margin-left:2px">(${u.pct}%)</span>
                          </td>
                          <td style="text-align:center;">
                            <b class="mono" style="color:var(--accent);font-size:13.5px;font-weight:800;background:color-mix(in oklch, var(--accent) 14%, transparent);padding:2px 8px;border-radius:6px;border:1px solid color-mix(in oklch, var(--accent) 28%, transparent)">${u.score}</b>
                          </td>
                          <td style="text-align:center;">
                            <span class="mono muted" style="font-size:13px">${u.submissions}</span>
                          </td>
                          <td style="text-align:center;">
                            <span class="mono faint" style="font-size:12px">${formatDuration(u.durationMs)}</span>
                          </td>
                        </tr>`;
                      })
                      .join('')
                  : '<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--fg2)">Chưa có dữ liệu sinh viên phù hợp.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderRoadmapView() {
    return `
      <!-- Top 1 dẫn đầu tóm tắt -->
      ${
        leaderboard.length
          ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:var(--bg3);border-radius:10px;border:1px solid var(--line2);margin-top:20px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">🏆</span>
            <span style="font-size:13.5px;color:var(--fg2)">Dẫn đầu khóa học: <b>${esc(leaderboard[0].fullName || leaderboard[0].username)}</b> (${leaderboard[0].solved}/${total} bài)</span>
          </div>
          <button type="button" class="btn-ghost" data-go-tab="leaderboard" style="font-size:12.5px;padding:3px 10px;color:var(--accent);font-weight:600">
            Xem toàn bộ Bảng xếp hạng (${leaderboard.length} sinh viên) ➔
          </button>
        </div>`
          : ''
      }

      <!-- LỘ TRÌNH HỌC TẬP CHÍNH -->
      <section class="set-group" style="margin-top:24px">
        <div class="set-group-head">
          <h2>Lộ trình học tập chính</h2>
          <span class="muted">${courseSets.length} chặng bài học liên kết theo thứ tự</span>
        </div>
        <ol class="roadmap" style="margin-top:8px">
          ${courseSets.map((s, i) => step(s, i, courseSets)).join('')}
        </ol>
      </section>
    `;
  }

  function drawView() {
    ctx.view.innerHTML = `
      <main class="page home">
        <nav class="crumbs" aria-label="breadcrumb">
          <button class="link-btn" data-go="#/home">‹ Khóa học</button><span>/</span>
          <span class="current">${esc(courseName)}</span>
        </nav>

        <!-- BANNER HERO KHÓA HỌC: BỐ CỤC 2 CỘT HIỆN ĐẠI, CÂN ĐỐI -->
        <section class="course-hero-banner" style="background:${bannerGradient};border-radius:16px;padding:24px 28px;color:#fff;margin-bottom:20px;box-shadow:0 12px 32px rgba(0,0,0,0.25);position:relative;overflow:hidden;border:1px solid rgba(255,255,255,0.15)">
          
          <!-- Hàng trên: Badge & Ngôn ngữ -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;position:relative;z-index:2">
            <span class="course-badge">${esc(badge)}</span>
            <span class="course-tech-tag">${esc(tech)}</span>
          </div>

          <!-- Nội dung 2 cột: Trái (Thông tin + 3 dòng) & Phải (Tiến độ học tập + Thao tác) -->
          <div class="course-hero-grid" style="position:relative;z-index:2">
            
            <!-- Cột trái: Tên khóa học + Mô tả + 3 dòng nổi bật -->
            <div style="display:flex;flex-direction:column;gap:8px">
              <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;text-transform:uppercase;color:#fff;margin:0;line-height:1.25;text-shadow:0 2px 8px rgba(0,0,0,0.5)">
                ${esc(courseName)}
              </h1>
              ${sub ? `<div style="font-size:13.5px;color:rgba(255,255,255,0.92);line-height:1.3">${esc(sub)}</div>` : ''}

              ${
                highlights.length
                  ? `
                <div style="display:inline-flex;flex-direction:column;gap:6px;background:rgba(0,0,0,0.38);padding:11px 16px;border-radius:10px;font-size:12.5px;border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(6px);margin-top:2px">
                  ${highlights.slice(0, 3).map((h) => `<span style="display:flex;align-items:center;gap:8px"><b style="color:#38bdf8">•</b> ${esc(h)}</span>`).join('')}
                </div>`
                  : ''
              }
            </div>

            <!-- Cột phải: Card Tiến độ sinh viên & Nút học tiếp -->
            <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.18);border-radius:14px;padding:16px 20px;display:flex;flex-direction:column;gap:10px;backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,0.2)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.04em">Tiến độ của bạn</span>
                <span style="font-size:24px;line-height:1">${theme.avatar}</span>
              </div>

              <div>
                <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px;margin-bottom:6px">
                  <span style="color:rgba(255,255,255,0.9)">Đã giải thành công:</span>
                  <b style="font-size:14.5px;color:#fff">${ac}/${total} bài (${pct}%)</b>
                </div>
                <div style="height:7px;border-radius:99px;background:rgba(255,255,255,0.2);overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:#38bdf8;border-radius:99px;box-shadow:0 0 8px #38bdf8"></div>
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:rgba(255,255,255,0.75);margin-top:2px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1)">
                <span>📚 ${courseSets.length} khối học</span>
                <span>💻 ${total} bài tập</span>
                <span>⭐ ${esc(meta.rating || '5.0')}</span>
              </div>

              ${
                next
                  ? `<button class="btn-primary" data-go="#/set/${encodeURIComponent(next.id)}" style="background:#fff;color:#090d16;font-weight:700;font-size:13px;padding:9px 16px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,0.25);border:none;cursor:pointer;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px">
                      <span>Tiếp tục học: ${esc(next.title)}</span>
                      <span class="num" style="background:#090d16;color:#fff;padding:2px 7px;border-radius:99px;font-size:11.5px">${next.ac}/${next.count}</span>
                    </button>`
                  : '<div style="color:#6ee7b7;font-weight:700;font-size:13.5px;text-align:center;padding:6px;background:rgba(110,231,183,0.12);border-radius:6px">✓ Đã hoàn thành khóa học!</div>'
              }
            </div>

          </div>
        </section>

        <!-- THANH ĐIỀU HƯỚNG TABS (LỘ TRÌNH vs BẢNG XẾP HẠNG) -->
        <div class="course-tabs" style="display:flex;gap:12px;border-bottom:1.5px solid var(--line2)">
          <button type="button" class="course-tab-btn" data-tab="roadmap" style="display:flex;align-items:center;gap:8px;padding:10px 18px;font-size:14.5px;font-weight:600;border:none;background:transparent;cursor:pointer;border-bottom:2.5px solid ${currentTab === 'roadmap' ? 'var(--accent)' : 'transparent'};color:${currentTab === 'roadmap' ? 'var(--fg)' : 'var(--fg2)'}">
            <span>📚 Lộ trình học tập</span>
            <span class="chip-sm" style="font-size:11.5px;padding:1px 7px;border-radius:99px;background:var(--bg3)">${courseSets.length} chặng</span>
          </button>
          <button type="button" class="course-tab-btn" data-tab="leaderboard" style="display:flex;align-items:center;gap:8px;padding:10px 18px;font-size:14.5px;font-weight:600;border:none;background:transparent;cursor:pointer;border-bottom:2.5px solid ${currentTab === 'leaderboard' ? 'var(--accent)' : 'transparent'};color:${currentTab === 'leaderboard' ? 'var(--fg)' : 'var(--fg2)'}">
            <span>🏆 Bảng xếp hạng</span>
            <span class="chip-sm" style="font-size:11.5px;padding:1px 7px;border-radius:99px;background:var(--bg3)">${leaderboard.length} sinh viên</span>
          </button>
        </div>

        <div data-tab-content>
          ${currentTab === 'roadmap' ? renderRoadmapView() : renderLeaderboardView()}
        </div>
      </main>
    `;
  }

  drawView();

  ctx.view.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      currentTab = tabBtn.dataset.tab;
      drawView();
      return;
    }
    const goLb = e.target.closest('[data-go-tab]');
    if (goLb) {
      currentTab = goLb.dataset.goTab;
      drawView();
      return;
    }
  });

  ctx.view.addEventListener('input', (e) => {
    if (e.target.matches('[data-lb-q]')) {
      lbQuery = e.target.value;
      const content = ctx.view.querySelector('[data-tab-content]');
      if (content && currentTab === 'leaderboard') {
        content.innerHTML = renderLeaderboardView();
      }
    }
  });
}
