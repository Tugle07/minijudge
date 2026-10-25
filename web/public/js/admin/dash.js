import { api } from '../api.js';
import { esc, renderAvatar } from '../ui.js';
import { pad } from './kit.js';

const RANGES = [
  ['today', 'Hôm nay'],
  ['7d', '7 ngày'],
  ['30d', '30 ngày'],
];
const RANGE_WORD = { today: 'hôm nay', '7d': '7 ngày', '30d': '30 ngày' };
const REFRESH_MS = 3000;
const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const DAY_CODES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const fmtNum = (n) => Number(n).toLocaleString('vi-VN');
const delta = (cur, prev, unit = '%', points = false) => {
  if (points) {
    const d = cur - prev;
    return [`${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)} điểm so với kỳ trước`, d > 0 ? 'var(--ac)' : d < 0 ? 'var(--wa)' : 'var(--fg3)'];
  }
  if (!prev) return [cur ? 'kỳ trước chưa có bài nộp' : '—', 'var(--fg3)'];
  const p = Math.round(((cur - prev) / prev) * 100);
  return [`${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p)}${unit} so với kỳ trước`, p > 0 ? 'var(--ac)' : p < 0 ? 'var(--wa)' : 'var(--fg3)'];
};

function kpiCard(label, value, [text, color]) {
  return `<div class="kpi"><span class="label">${label}</span><span class="value">${value}</span><span class="delta" style="color:${color}">${text}</span></div>`;
}

/* 1. Bản đồ nhiệt "Cày code" 24/7 (Punch Card Heatmap theo tuần) */
function punchCardHtml(punch) {
  if (!punch || !punch.matrix) return '';
  const max = Math.max(1, punch.max);
  const width = 640;
  const height = 210;
  const leftM = 44;
  const topM = 26;
  const stepX = (width - leftM - 20) / 23;
  const stepY = (height - topM - 20) / 6;

  const circles = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const count = punch.matrix[d][h] || 0;
      const cx = (leftM + h * stepX).toFixed(1);
      const cy = (topM + d * stepY).toFixed(1);
      if (count === 0) {
        circles.push(`<circle cx="${cx}" cy="${cy}" r="2" fill="var(--line2)" opacity="0.35"><title>${DAYS[d]}, ${h}:00 – Chưa có bài nộp</title></circle>`);
      } else {
        const ratio = count / max;
        const r = (3 + ratio * 8.5).toFixed(1);
        const fill = ratio > 0.6 ? 'var(--accent)' : ratio > 0.3 ? 'var(--ring)' : 'var(--fg2)';
        const glow = ratio > 0.6 ? `filter="drop-shadow(0 0 4px var(--accent))"` : '';
        circles.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${glow} opacity="${(0.55 + ratio * 0.45).toFixed(2)}" style="cursor:pointer">
          <title>${DAYS[d]}, ${pad(h)}:00 – ${count} bài nộp</title>
        </circle>`);
      }
    }
  }

  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => {
    const x = (leftM + h * stepX).toFixed(1);
    return `<text x="${x}" y="14" text-anchor="middle" font-size="11" fill="var(--fg3)" font-family="var(--font-code)">${h}h</text>`;
  });

  const dayLabels = DAY_CODES.map((name, d) => {
    const y = (topM + d * stepY + 4).toFixed(1);
    return `<text x="12" y="${y}" font-size="12" font-weight="600" fill="var(--fg2)">${name}</text>`;
  });

  const peakDay = DAYS[punch.peak?.day ?? 0] || '—';
  const peakHour = punch.peak ? `${pad(punch.peak.hour)}:00` : '—';
  const peakCount = punch.peak?.count || 0;

  return `
    <div class="panel pad" style="gap:14px;min-width:0;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <b style="font-weight:600;font-size:15px;display:inline-flex;align-items:center;gap:6px;">
            <span>🔥 Bản đồ nhiệt "Cày code" 24/7 (Theo tuần)</span>
          </b>
          <span class="faint" style="font-size:12.5px">Mật độ nộp bài theo từng khung giờ trong tuần</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;background:var(--bg3);padding:4px 10px;border-radius:var(--r-md);border:1px solid var(--line2);">
          <span style="color:var(--accent);">★ Đỉnh điểm:</span>
          <b>${peakDay} lúc ${peakHour}</b>
          <span class="mono" style="color:var(--ac);font-weight:600;">(${peakCount} bài)</span>
        </div>
      </div>

      <div style="width:100%;overflow-x:auto;">
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;min-width:520px;height:auto;display:block;">
          ${dayLabels.join('')}
          ${hourLabels.join('')}
          ${circles.join('')}
        </svg>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--fg3);padding-top:4px;border-top:1px dashed var(--line);">
        <span>Chấm to &amp; sáng hơn = nộp bài nhiều hơn trong khung giờ</span>
        <span>Tổng cộng: <b class="num" style="color:var(--fg);">${punch.total || 0} bài nộp</b></span>
      </div>
    </div>`;
}

/* 2. Biểu đồ cũ theo khung giờ và số lượng */
function chartHtml(series) {
  if (!series || !series.vals) return '';
  const vals = series.vals;
  const max = Math.max(1, ...vals);
  const total = vals.reduce((a, b) => a + b, 0);
  const n = vals.length;
  const pts = vals.map((v, i) => `${((i / Math.max(1, n - 1)) * 600).toFixed(1)},${(170 - (v / max) * 150).toFixed(1)}`).join(' ');

  return `
    <div class="panel pad" style="gap:14px;min-width:0;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <b style="font-weight:600;font-size:15px;display:inline-flex;align-items:center;gap:6px;">
            <span>📈 Số bài nộp theo ${series.unit}</span>
          </b>
          <span class="faint" style="font-size:12.5px">Nhận diện biến động theo khung giờ và số lượng</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;background:var(--bg3);padding:4px 10px;border-radius:var(--r-md);border:1px solid var(--line2);">
          <span style="color:var(--accent);">★ Cao nhất:</span>
          <b>${max} bài / ${series.unit}</b>
        </div>
      </div>

      <div class="chart" style="height:190px;">
        <div class="grid"><span></span><span></span><span></span><span></span></div>
        <svg viewBox="0 0 600 180" preserveAspectRatio="none" aria-label="Biểu đồ số bài nộp">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28" />
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <polygon points="0,176 ${pts} 600,176" fill="url(#chartGrad)"></polygon>
          <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"></polyline>
        </svg>
        <span class="max">${max}</span>
      </div>
      <div class="axis" style="padding:0 4px;">${series.labels.map((l) => `<span>${esc(l)}</span>`).join('')}</div>

      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--fg3);padding-top:4px;border-top:1px dashed var(--line);">
        <span>Tổng số lượt nộp trong khoảng thời gian đã chọn</span>
        <span>Tổng cộng: <b class="num" style="color:var(--fg);">${fmtNum(total)} bài nộp</b></span>
      </div>
    </div>`;
}

/* 3. Top sinh viên xuất sắc & dẫn đầu tiến độ (Chia đều 50%) */
function topStudentsHtml(top) {
  if (!top || !top.length) return '<div class="panel pad"><div class="empty">Chưa có sinh viên nào ghi nhận AC.</div></div>';
  return `
    <div class="panel pad" style="gap:14px;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <b style="font-weight:600;font-size:15px;display:inline-flex;align-items:center;gap:6px;">
          <span>🏆 Top sinh viên dẫn đầu lớp</span>
        </b>
        <a href="#/users" style="font-size:12.5px;color:var(--accent);text-decoration:none;">Xem tất cả sinh viên ↗</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${top
          .map((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="mono faint" style="font-size:12px;width:18px;text-align:center;">${i + 1}</span>`;
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:var(--r-sm);background:var(--bg3);border:1px solid var(--line);">
                <div style="width:24px;display:flex;justify-content:center;font-size:16px;">${medal}</div>
                ${renderAvatar(u.username, u.avatar, 30, u.fullName)}
                <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
                  <a href="/#/profile/${encodeURIComponent(u.username)}" target="_blank" style="font-weight:600;font-size:13.5px;color:inherit;text-decoration:none;" class="ellipsis" title="Xem hồ sơ ${esc(u.fullName || u.username)}">
                    ${esc(u.fullName || u.username)}
                  </a>
                  <span class="mono faint" style="font-size:11.5px;">MSSV: ${esc(u.username)}</span>
                </div>
                <div style="text-align:right;">
                  <b class="num" style="color:var(--ac);font-size:14px;">${u.solved} bài AC</b>
                  <div class="mono faint" style="font-size:11.5px;">${u.tries} lần nộp</div>
                </div>
              </div>`;
          })
          .join('')}
      </div>
    </div>`;
}

/* 4. Bài tập rớt nhiều nhất (Chia đều 50% - Rộng rãi, không bị ép co rút cột) */
function hardestHtml(hardest) {
  if (!hardest || !hardest.length) return '<div class="panel pad"><p class="faint" style="margin:0;">Chưa đủ dữ liệu bài nộp.</p></div>';
  return `
    <div class="panel" style="overflow:hidden;min-width:0;">
      <div class="panel-head" style="padding:12px 18px;">
        <b style="font-weight:600;font-size:15px;display:inline-flex;align-items:center;gap:6px;">
          <span>⚠️ Bài tập rớt nhiều nhất (Tỷ lệ AC thấp)</span>
        </b>
        <span class="faint" style="font-size:12.5px;">Cần lưu ý giảng lại hoặc hỗ trợ sinh viên</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="atable" style="font-size:13.5px;min-width:440px;">
          <thead>
            <tr>
              <th style="min-width:180px;">Mã &amp; Tên bài</th>
              <th class="num" style="width:90px;">Số người thử</th>
              <th class="num" style="width:80px;">Đã AC</th>
              <th class="num" style="width:95px;">Tỉ lệ AC</th>
            </tr>
          </thead>
          <tbody>
            ${hardest
              .map(
                (h) => `<tr>
                  <td>
                    <a href="/#/problem/${encodeURIComponent(h.id)}" target="_blank" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px;" title="Xem đề bài ${esc(h.id)} · ${esc(h.title)} (tab mới)">
                      <span class="mono" style="color:var(--accent);font-weight:600;">${esc(h.id)}</span>
                      <span style="font-weight:500;">${esc(h.title)}</span>
                      <span class="faint" style="font-size:11px;">↗</span>
                    </a>
                  </td>
                  <td class="num" style="font-weight:600;">${h.tried}</td>
                  <td class="num" style="color:var(--ac);font-weight:600;">${h.solved}</td>
                  <td class="num" style="color:var(--wa);font-weight:700;font-size:14px;">${h.rate}%</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

export async function render(ctx) {
  let range = 'today';
  let timer = null;
  let alive = true;

  function head() {
    ctx.setHead({
      crumb: 'Tổng quan',
      title: 'Tổng quan',
      actions: `<div class="seg" role="radiogroup" aria-label="Khoảng thời gian">${RANGES.map(
        ([k, l]) => `<button role="radio" aria-checked="${k === range}" class="${k === range ? 'on' : ''}" data-range="${k}">${l}</button>`,
      ).join('')}</div>`,
    });
  }

  async function load() {
    const d = await api(`/api/admin/dashboard?range=${range}`);
    if (!alive) return;
    ctx.setJudgeDown(!d.judge.ok, d.judge.queue);
    const k = d.kpis;

    ctx.page.innerHTML = `
      <!-- HÀNG 1: 5 THẺ KPI TỔNG QUAN -->
      <div class="kpis">
        ${kpiCard('Sinh viên', fmtNum(k.users), [`+${k.newUsers} trong ${RANGE_WORD[range]}`, k.newUsers ? 'var(--ac)' : 'var(--fg3)'])}
        ${kpiCard(`Bài nộp ${RANGE_WORD[range]}`, fmtNum(k.submissions), delta(k.submissions, k.prevSubmissions))}
        ${kpiCard(`Tỉ lệ AC ${RANGE_WORD[range]}`, `${k.acRate}%`, delta(k.acRate, k.prevAcRate, '', true))}
        ${kpiCard('Đang hoạt động', fmtNum(k.active), ['trong 15 phút qua', 'var(--fg3)'])}
        <div class="kpi" style="border-color:${d.judge.ok ? 'var(--line)' : 'color-mix(in oklch, var(--wa) 50%, transparent)'}">
          <span class="label">Hàng đợi chấm</span>
          <span class="value">${d.judge.queue} <span class="muted" style="font-size:15px;font-weight:500">bài</span></span>
          <span class="delta" style="display:flex;align-items:center;gap:7px;font-weight:600;color:${d.judge.ok ? 'var(--ac)' : 'var(--wa)'}"><span style="width:8px;height:8px;border-radius:50%;background:currentColor"></span>${d.judge.ok ? 'Hoạt động' : 'Mất kết nối'}</span>
        </div>
      </div>

      <!-- HÀNG 2: BẢN ĐỒ NHIỆT THEO TUẦN (PUNCH CARD) & BIỂU ĐỒ SỐ LƯỢNG THEO KHUNG GIỜ/NGÀY -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 500px), 1fr));gap:16px;align-items:stretch;">
        ${punchCardHtml(d.punchCard)}
        ${chartHtml(d.series)}
      </div>

      <!-- HÀNG 3: CHIA ĐỀU 2 CỘT 50% - 50% (ĐÃ BỎ HOÀN TOÀN BÀI NỘP TRỰC TIẾP, KHÔNG BỊ ÉP LỖI HIỂN THỊ) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 500px), 1fr));gap:16px;align-items:stretch;">
        ${topStudentsHtml(d.topStudents)}
        ${hardestHtml(d.hardest)}
      </div>`;
  }

  ctx.actions().addEventListener('click', (e) => {
    const b = e.target.closest('[data-range]');
    if (!b) return;
    range = b.dataset.range;
    head();
    load();
  });

  head();
  await load();
  timer = setInterval(() => load().catch(() => {}), REFRESH_MS);
  return () => {
    alive = false;
    clearInterval(timer);
  };
}
