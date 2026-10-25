import { api } from '../api.js';
import { badge, esc, fmtWhen, renderAvatar, toast, verdictLabel, verdictVar } from '../ui.js';

const DAY = 86_400_000;
const VERDICTS = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'];
const WEEKDAYS = ['T2', '', 'T4', '', 'T6', '', 'CN'];
const pad = (n) => String(n).padStart(2, '0');
const dmy = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const PRESET_AVATARS = [
  { icon: '💻', bg: '#2563eb', label: 'Coder' },
  { icon: '🚀', bg: '#7c3aed', label: 'Rocket' },
  { icon: '🎓', bg: '#059669', label: 'Student' },
  { icon: '⚡', bg: '#d97706', label: 'Speed' },
  { icon: '🐱', bg: '#e11d48', label: 'Cat' },
  { icon: '🐶', bg: '#ea580c', label: 'Dog' },
  { icon: '🦊', bg: '#d97706', label: 'Fox' },
  { icon: '🐼', bg: '#0f172a', label: 'Panda' },
  { icon: '🦁', bg: '#ca8a04', label: 'Lion' },
  { icon: '🎮', bg: '#4f46e5', label: 'Gamer' },
  { icon: '☕', bg: '#b45309', label: 'Coffee' },
  { icon: '🎯', bg: '#dc2626', label: 'Target' },
];

function emojiSvgDataUrl(emoji, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><text x="50" y="65" font-size="48" text-anchor="middle" font-family="system-ui,apple color emoji,segoe ui emoji">${emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function resizeImageToDataUrl(file, maxSize = 160) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);
        let dataUrl = canvas.toDataURL('image/webp', 0.85);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* Bản đồ hoạt động kiểu GitHub: mỗi cột là một tuần (T2 → CN), đậm hơn = nộp nhiều hơn; nhãn tháng ở cột chứa ngày 1. */
function heatmap(activity, end) {
  const n = activity.length;
  const start = end - (n - 1) * DAY;
  const offset = (new Date(start).getDay() + 6) % 7; /* T2 = 0 */
  const max = Math.max(1, ...activity);
  const cells = Array.from({ length: offset }, () => '<span class="hm-cell empty"></span>');
  const months = new Map();
  activity.forEach((count, i) => {
    const d = new Date(start + i * DAY);
    const col = Math.floor((i + offset) / 7);
    if (d.getDate() === 1 || (i === 0 && d.getDate() <= 21)) months.set(col, `Th${d.getMonth() + 1}`);
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
    cells.push(`<span class="hm-cell l${level}" title="${dmy(start + i * DAY)}: ${count} bài nộp"></span>`);
  });
  const cols = Math.ceil((n + offset) / 7);
  return `<div class="hm-grid" style="--cols:${cols}" role="img" aria-label="Hoạt động nộp bài ${Math.round(n / 7)} tuần gần nhất">
    <span></span>
    <div class="hm-months">${[...months].map(([c, m]) => `<span style="grid-column:${c + 1}">${m}</span>`).join('')}</div>
    <div class="hm-days">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
    <div class="heatmap">${cells.join('')}</div>
  </div>`;
}

const testsText = (s) => (s.verdict === 'CE' ? 'Lỗi biên dịch' : s.testCount ? `qua ${s.testsPassed ?? 0}/${s.testCount} test` : verdictLabel(s.verdict));

function contestRow(c) {
  const rank = c.rank ? `Hạng <b class="num">${c.rank}</b>/${c.participants}` : c.finished ? 'Chưa công bố hạng' : 'Đang làm bài';
  return `<a class="pf-row pf-contest" href="#/contest/${c.id}">
    <span class="pf-main"><b class="ellipsis">${esc(c.title)}</b><small>${dmy(c.startAt)}${c.violations ? ` · <span class="pf-warn">${c.violations} lần rời bài</span>` : ''}</small></span>
    <span class="pf-score"><b class="num">${+c.score.toFixed(2)}</b><small>/ ${+c.maxScore.toFixed(2)} điểm</small></span>
    <span class="pf-rank">${rank}</span>
  </a>`;
}

const unsolvedRow = (s) => `<a class="pf-row" href="#/problem/${encodeURIComponent(s.problemId)}">
    ${badge(s.verdict)}
    <span class="pf-main"><b class="ellipsis">${esc(s.title)}</b><small><span class="mono">${esc(s.problemId)}</span> · ${testsText(s)} · ${s.tries} lần nộp</small></span>
    <span class="faint pf-when">${fmtWhen(s.createdAt)}</span>
  </a>`;

const recentRow = (s) => `<a class="pf-row" href="#/problem/${encodeURIComponent(s.problemId)}/history" title="Xem các lần nộp của bài này">
    ${badge(s.verdict)}
    <span class="pf-main"><b class="ellipsis">${esc(s.title)}</b><small><span class="mono">${esc(s.problemId)}</span> · ${testsText(s)}</small></span>
    <span class="faint pf-when">${fmtWhen(s.createdAt)}</span>
  </a>`;

function verdictBar(verdicts) {
  const total = VERDICTS.reduce((t, v) => t + (verdicts[v] || 0), 0);
  if (!total) return '';
  const used = VERDICTS.filter((v) => verdicts[v]);
  return `<div class="vdist">
    <div class="vdist-bar">${used.map((v) => `<span style="--v:${verdictVar(v)};width:${(verdicts[v] / total) * 100}%" title="${esc(verdictLabel(v))}: ${verdicts[v]}"></span>`).join('')}</div>
    <div class="vdist-legend">${used.map((v) => `<span style="--v:${verdictVar(v)}"><i></i>${v} <b>${verdicts[v]}</b></span>`).join('')}</div>
  </div>`;
}

function setProgress(sets) {
  return (
    sets
      .map((s) => {
        const pct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
        return `<div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><a href="#/set/${encodeURIComponent(s.id)}" class="ellipsis" style="color:var(--fg)">${esc(s.title)}</a><span class="mono muted">${s.ac}/${s.count}</span></div>
          <div class="progress ${s.count && s.ac === s.count ? 'done' : ''}"><div style="width:${pct}%"></div></div></div>`;
      })
      .join('') || '<span class="faint">Chưa có khối nào.</span>'
  );
}

export async function render(ctx) {
  const targetUser = ctx.arg ? ctx.arg.trim() : '';
  const isOther = Boolean(targetUser && (!ctx.user || targetUser.toLowerCase() !== ctx.user.username.toLowerCase()));
  const url = isOther ? `/api/users/${encodeURIComponent(targetUser)}/profile` : '/api/me/profile';

  let p;
  try {
    p = await api(url);
  } catch (err) {
    ctx.view.innerHTML = `
      <main class="page" style="max-width:720px;gap:20px;align-items:center;text-align:center;padding:50px 20px;">
        <div style="font-size:48px;">🔍</div>
        <h2 style="font-size:20px;font-weight:600;margin:0;">Không tìm thấy hồ sơ thành viên</h2>
        <p class="muted" style="margin:0;">Tài khoản <code class="mono">${esc(targetUser)}</code> không tồn tại trên hệ thống hoặc đã bị gỡ.</p>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="btn" onclick="history.back()">← Quay lại</button>
          <button class="btn-primary" data-go="#/profile">Về hồ sơ của tôi</button>
        </div>
      </main>`;
    return;
  }

  const isSelf = p.isSelf;
  const fresh = !p.submissions && !p.contests.length;
  const firstSet = p.sets.find((s) => s.count);

  ctx.view.innerHTML = `
    <main class="page" style="max-width:1000px;gap:24px">
      <!-- Header Hồ sơ -->
      <div class="pf-head card-box" style="padding:20px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:18px;min-width:0;flex:1;">
          <div class="pf-avatar-wrapper" style="position:relative;width:76px;height:76px;flex:none;">
            <div data-avatar-display style="width:76px;height:76px;cursor:${isSelf ? 'pointer' : 'default'}" title="${isSelf ? 'Bấm để đổi ảnh đại diện' : esc(p.username)}">
              ${renderAvatar(p.username, p.avatar, 76)}
            </div>
            ${isSelf ? `<button class="pf-avatar-edit-badge" data-avatar-open title="Đổi ảnh đại diện">📷</button>` : ''}
          </div>

          <div style="display:flex;flex-direction:column;gap:5px;min-width:0;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <h1 class="page-title" style="margin:0;font-size:22px;word-break:break-word;">${esc(p.fullName || p.username)}</h1>
              <span style="padding:2px 9px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid ${p.role === 'admin' ? 'var(--wa)' : 'var(--line)'};color:${p.role === 'admin' ? 'var(--wa)' : 'var(--fg2)'};">
                ${p.role === 'admin' ? 'Admin' : 'Sinh viên'}
              </span>
              ${!isSelf ? `<span class="faint" style="font-size:12.5px;">(Đang soi hồ sơ)</span>` : ''}
            </div>
            <span class="muted" style="font-size:13.5px;">
              <span class="mono" style="font-weight:500;">${esc(p.username)}</span> · tham gia ${dmy(p.createdAt)}
            </span>
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          ${
            isSelf
              ? `<button class="btn" data-avatar-open>Đổi ảnh đại diện</button>
                 <button class="btn" data-pw-open>Đổi mật khẩu</button>`
              : `<button class="btn" data-go="#/profile">← Về hồ sơ của tôi</button>
                 ${ctx.user?.role === 'admin' ? `<a class="btn" href="/admin.html#/users" target="_blank">Quản lý người dùng ↗</a>` : ''}`
          }
        </div>
      </div>

      <!-- Khung tìm kiếm/soi hồ sơ thành viên khác -->
      <div class="card-box pf-search-box" style="padding:12px 18px;">
        <form class="pf-search-form" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:0;">
          <div style="display:flex;align-items:center;gap:8px;color:var(--fg2);font-weight:600;font-size:13.5px;">
            <span>🔍 Soi hồ sơ thành viên:</span>
            <span class="faint" style="font-weight:normal;font-size:12.5px;">(Nhập MSSV hoặc tên đăng nhập)</span>
          </div>
          <div style="display:flex;gap:8px;flex:1;max-width:380px;">
            <input class="input" style="height:34px;padding:0 12px;font-size:13px;flex:1;" type="text" name="lookupUser" placeholder="vd. 6751071001 hoặc ttdung..." value="${isOther ? esc(targetUser) : ''}" />
            <button class="btn" type="submit" style="height:34px;padding:0 14px;font-size:13px;white-space:nowrap;">Xem hồ sơ</button>
          </div>
        </form>
      </div>

      <!-- Thống kê tổng quan -->
      <div class="profile-stats">
        <div class="ov-stat"><span>Đã giải</span><b class="num">${p.solved}</b><small>bài</small></div>
        <div class="ov-stat"><span>Đã thử, chưa AC</span><b class="num">${Math.max(0, p.tried - p.solved)}</b><small>bài</small></div>
        <div class="ov-stat"><span>Chuỗi nộp bài</span><b class="num">${p.streak}</b><small>ngày</small></div>
        <div class="ov-stat"><span>Tỉ lệ AC</span><b class="num">${p.acRate}%</b><small>${p.submissions} bài nộp</small></div>
      </div>

      ${
        fresh
          ? `<section class="card-box pf-empty">
              <b>Chưa có bài nộp nào</b>
              <span class="muted">${isSelf ? 'Hoạt động, kết quả và các bài đang làm dở sẽ hiện ở đây sau lần nộp đầu tiên.' : 'Thành viên này chưa nộp bài nào trên hệ thống.'}</span>
              ${isSelf && firstSet ? `<button class="btn-primary" data-go="#/set/${encodeURIComponent(firstSet.id)}">Bắt đầu với ${esc(firstSet.title)}</button>` : ''}
            </section>`
          : `<section class="card-box">
              <div class="pf-box-head"><b>Hoạt động 26 tuần</b><span class="faint">${p.activity.reduce((a, b) => a + b, 0)} bài nộp</span></div>
              <div class="pf-activity">
                ${heatmap(p.activity, p.activityEnd)}
                <div class="pf-facts">
                  <div><b class="num">${p.activeDays}</b><span>ngày có nộp bài</span></div>
                  <div><b class="num">${p.longestStreak}</b><span>ngày liên tiếp dài nhất</span></div>
                  <div><b class="num">${p.bestDay ? p.bestDay.count : 0}</b><span>bài nộp nhiều nhất trong một ngày${p.bestDay ? ` (${dmy(p.bestDay.at)})` : ''}</span></div>
                </div>
              </div>
              <div class="faint hm-legend">Ít <span class="hm-cell l0"></span><span class="hm-cell l1"></span><span class="hm-cell l2"></span><span class="hm-cell l3"></span><span class="hm-cell l4"></span> Nhiều</div>
            </section>`
      }

      <div class="pf-cols">
        <div class="pf-col">
          ${
            p.contests.length
              ? `<section class="card-box">
                  <div class="pf-box-head"><b>Kết quả cuộc thi</b><span class="faint">${p.contests.length} cuộc thi</span></div>
                  <div class="pf-list">${p.contests.map(contestRow).join('')}</div>
                </section>`
              : ''
          }
          <section class="card-box"><b>Tiến độ theo khối</b>${setProgress(p.sets)}</section>
        </div>
        ${
          p.isPrivateHidden
            ? `<div class="pf-col">
                <section class="card-box" style="padding:24px 20px;display:flex;flex-direction:column;gap:12px;border:1px dashed var(--line2);background:var(--bg2);">
                  <div style="display:flex;align-items:center;gap:10px;color:var(--fg2);">
                    <span style="font-size:22px;">🔒</span>
                    <b style="font-size:15px;">Thông tin riêng tư của thành viên</b>
                  </div>
                  <p class="muted" style="margin:0;font-size:13.5px;line-height:1.6;">
                    Chi tiết bài đang làm dở và lịch sử nộp lỗi (WA / CE) được bảo mật riêng tư để đảm bảo sự thoải mái trong quá trình học tập của sinh viên.
                  </p>
                  <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--fg3);padding-top:4px;border-top:1px solid var(--line);">
                    <div style="display:flex;justify-content:space-between;"><span>Số bài đã giải:</span><b class="mono" style="color:var(--fg);">${p.solved} bài</b></div>
                    <div style="display:flex;justify-content:space-between;"><span>Tỉ lệ AC:</span><b class="mono" style="color:var(--ac);">${p.acRate}%</b></div>
                    <div style="display:flex;justify-content:space-between;"><span>Chuỗi nộp bài:</span><b class="mono" style="color:var(--fg);">${p.streak} ngày liên tiếp</b></div>
                  </div>
                </section>
              </div>`
            : fresh
            ? ''
            : `<div class="pf-col">
                <section class="card-box">
                  <div class="pf-box-head">
                    <b>Bài đang làm dở</b>
                    <span class="faint">${p.unsolvedTotal ? `${p.unsolvedTotal} bài` : ''} · <span title="Chỉ bạn và Admin mới nhìn thấy">🔒 Riêng tư</span></span>
                  </div>
                  ${p.unsolved.length ? `<div class="pf-list">${p.unsolved.map(unsolvedRow).join('')}</div>` : '<span class="faint">Bài nào đã thử cũng đã AC.</span>'}
                </section>
                <section class="card-box">
                  <div class="pf-box-head">
                    <b>Lần nộp gần đây</b>
                    <span class="faint">bấm để xem các lần nộp của bài · <span title="Chỉ bạn và Admin mới nhìn thấy">🔒 Riêng tư</span></span>
                  </div>
                  ${verdictBar(p.practiceVerdicts)}
                  ${p.recent.length ? `<div class="pf-list">${p.recent.map(recentRow).join('')}</div>` : '<span class="faint">Chưa có lần nộp nào ở phần luyện tập.</span>'}
                </section>
              </div>`
        }
      </div>

      <!-- Dialog Đổi Avatar -->
      <dialog class="pf-dialog" data-avatar-dialog style="max-width:440px;width:95vw;padding:24px;border-radius:var(--r-lg);border:1px solid var(--line);background:var(--bg2);color:var(--fg);">
        <div style="display:flex;flex-direction:column;gap:18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="font-size:18px;">Thay đổi ảnh đại diện</b>
            <button type="button" class="btn-ghost" data-avatar-close style="font-size:18px;line-height:1;padding:4px 8px;">✕</button>
          </div>

          <!-- Preview -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px;background:var(--bg3);border-radius:var(--r-md);">
            <div data-preview-avatar style="width:84px;height:84px;border-radius:50%;overflow:hidden;display:grid;place-items:center;">
              ${renderAvatar(p.username, p.avatar, 84)}
            </div>
            <span class="faint" style="font-size:12px;">Xem trước hiển thị</span>
          </div>

          <!-- Option 1: Upload file -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <span style="font-weight:600;font-size:13px;">1. Tải ảnh từ thiết bị:</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-file-input style="display:none;" />
            <button type="button" class="btn" data-btn-upload style="display:flex;align-items:center;justify-content:center;gap:8px;">
              <span>📁 Chọn ảnh từ máy tính...</span>
            </button>
            <span class="faint" style="font-size:11.5px;">Hệ thống tự động căn giữa hình tròn và nén tối ưu.</span>
          </div>

          <!-- Option 2: Presets -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <span style="font-weight:600;font-size:13px;">2. Hoặc chọn nhanh Avatar mẫu:</span>
            <div class="avatar-preset-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;">
              ${PRESET_AVATARS.map((ps, idx) => `
                <button type="button" class="avatar-preset-btn" data-preset="${idx}" style="width:44px;height:44px;border-radius:50%;border:2px solid transparent;background:${ps.bg};color:#fff;font-size:22px;display:grid;place-items:center;cursor:pointer;transition:transform 0.15s;" title="${ps.label}">
                  ${ps.icon}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;border-top:1px solid var(--line);padding-top:14px;">
            <button type="button" class="btn-ghost" data-avatar-reset style="color:var(--wa);font-size:13px;">Xóa ảnh đại diện</button>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn" data-avatar-close>Hủy</button>
              <button type="button" class="btn-primary" data-avatar-save>Lưu ảnh</button>
            </div>
          </div>
        </div>
      </dialog>

      <!-- Dialog Đổi Mật Khẩu -->
      <dialog class="pf-dialog" data-pw-dialog aria-labelledby="pw-title">
        <form class="form" data-pw novalidate>
          <b id="pw-title" style="font-size:18px">Đổi mật khẩu</b>
          <label class="field"><span>Mật khẩu hiện tại</span><input class="input" type="password" name="current" autocomplete="current-password" /><span class="err-text" data-err="current"></span></label>
          <label class="field"><span>Mật khẩu mới</span><input class="input" type="password" name="next" autocomplete="new-password" placeholder="Ít nhất 6 ký tự" /><span class="err-text" data-err="next"></span></label>
          <label class="field"><span>Nhập lại mật khẩu mới</span><input class="input" type="password" name="again" autocomplete="new-password" /><span class="err-text" data-err="again"></span></label>
          <span class="faint" style="font-size:13px">Các thiết bị khác đang đăng nhập sẽ bị đăng xuất.</span>
          <div class="pf-dialog-actions">
            <button class="btn" type="button" data-pw-close>Hủy</button>
            <button class="btn-primary" type="submit">Đổi mật khẩu</button>
          </div>
        </form>
      </dialog>
    </main>`;

  // 1. Tìm kiếm/soi hồ sơ thành viên
  const searchForm = ctx.view.querySelector('.pf-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (searchForm.querySelector('[name="lookupUser"]').value || '').trim();
      if (!val) return;
      location.hash = `#/profile/${encodeURIComponent(val)}`;
    });
  }

  // 2. Avatar Dialog & Update
  if (isSelf) {
    const avatarDialog = ctx.view.querySelector('[data-avatar-dialog]');
    const previewBox = ctx.view.querySelector('[data-preview-avatar]');
    const fileInput = ctx.view.querySelector('[data-file-input]');
    let tempAvatar = p.avatar || '';

    const updatePreview = (val) => {
      tempAvatar = val;
      previewBox.innerHTML = renderAvatar(p.username, val, 84);
    };

    ctx.view.querySelectorAll('[data-avatar-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        updatePreview(p.avatar || '');
        avatarDialog.showModal();
      });
    });

    ctx.view.querySelectorAll('[data-avatar-close]').forEach((btn) => {
      btn.addEventListener('click', () => avatarDialog.close());
    });
    avatarDialog.addEventListener('click', (e) => e.target === avatarDialog && avatarDialog.close());

    // Chọn ảnh từ máy
    const btnUpload = ctx.view.querySelector('[data-btn-upload]');
    if (btnUpload && fileInput) {
      btnUpload.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          toast('Ảnh gốc không được vượt quá 5MB');
          return;
        }
        try {
          const dataUrl = await resizeImageToDataUrl(file, 160);
          updatePreview(dataUrl);
        } catch (e) {
          toast('Không thể đọc file ảnh');
        }
      });
    }

    // Chọn preset
    ctx.view.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.preset);
        const ps = PRESET_AVATARS[idx];
        if (ps) {
          const svgUrl = emojiSvgDataUrl(ps.icon, ps.bg);
          updatePreview(svgUrl);
        }
      });
    });

    // Reset avatar (quay về chữ cái đầu)
    ctx.view.querySelector('[data-avatar-reset]')?.addEventListener('click', () => {
      updatePreview('');
    });

    // Lưu avatar
    ctx.view.querySelector('[data-avatar-save]')?.addEventListener('click', async () => {
      try {
        await api('/api/me/avatar', { method: 'PUT', body: { avatar: tempAvatar } });
        p.avatar = tempAvatar;
        ctx.view.querySelector('[data-avatar-display]').innerHTML = renderAvatar(p.username, tempAvatar, 76);
        window.updateUserAvatar?.(tempAvatar);
        avatarDialog.close();
        toast('Đã cập nhật ảnh đại diện thành công!');
      } catch (err) {
        toast(err.message || 'Lỗi khi cập nhật ảnh đại diện');
      }
    });
  }

  // 3. Password Dialog
  if (isSelf) {
    const dialog = ctx.view.querySelector('[data-pw-dialog]');
    const form = ctx.view.querySelector('[data-pw]');
    const showErr = (fields) =>
      form.querySelectorAll('[data-err]').forEach((el) => {
        el.textContent = fields[el.dataset.err] || '';
        form.querySelector(`[name="${el.dataset.err}"]`).classList.toggle('err', Boolean(fields[el.dataset.err]));
      });
    ctx.view.querySelector('[data-pw-open]')?.addEventListener('click', () => {
      form.reset();
      showErr({});
      dialog.showModal();
    });
    ctx.view.querySelector('[data-pw-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (data.next !== data.again) return showErr({ again: 'Mật khẩu nhập lại không khớp' });
      try {
        await api('/api/me/password', { method: 'POST', body: { current: data.current, next: data.next } });
        dialog.close();
        toast('Đã đổi mật khẩu');
      } catch (err) {
        showErr(err.fields || {});
        if (!err.fields) toast(err.message);
      }
    });
  }
}
