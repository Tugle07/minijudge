import { api } from '../api.js';
import { highlightC } from '../highlight.js';
import { badge, esc, renderAvatar, toast, verdictAbbr, verdictLabel, verdictVar } from '../ui.js';
import { fmtDateTime, openDrawer, pad } from './kit.js';

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

/* 1. Bản đồ nhiệt "Cày code" 24/7 (Punch Card Heatmap) */
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
    <div class="panel pad" style="gap:14px;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <b style="font-weight:600;font-size:15px;display:inline-flex;align-items:center;gap:6px;">
            <span>🔥 Bản đồ nhiệt "Cày code" 24/7</span>
          </b>
          <span class="faint" style="font-size:12.5px">Mật độ sinh viên nộp bài theo từng khung giờ trong tuần</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;background:var(--bg3);padding:4px 10px;border-radius:var(--r-md);border:1px solid var(--line2);">
          <span style="color:var(--accent);">★ Đỉnh điểm:</span>
          <b>${peakDay} lúc ${peakHour}</b>
          <span class="mono" style="color:var(--ac);font-weight:600;">(${peakCount} bài)</span>
        </div>
      </div>

      <div style="width:100%;overflow-x:auto;">
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;min-width:540px;height:auto;display:block;">
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

/* 5. Biểu đồ Radar Năng lực chuyên đề C (Skill Proficiency Radar) */
function radarHtml(skills) {
  if (!skills || !skills.length) return '';
  const size = 300;
  const cx = 150;
  const cy = 135;
  const R = 85;
  const N = skills.length;

  const getPt = (idx, radius) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / N;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const gridPolys = [20, 40, 60, 80, 100].map((lvl) => {
    const r = (R * lvl) / 100;
    const pts = Array.from({ length: N }, (_, i) => getPt(i, r).map((n) => n.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--line2)" stroke-dasharray="${lvl === 100 ? '0' : '2,3'}" stroke-width="1" />`;
  });

  const spokes = Array.from({ length: N }, (_, i) => {
    const [x, y] = getPt(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line2)" stroke-width="1" />`;
  });

  const dataPoints = skills.map((s, i) => {
    const clamped = Math.max(6, Math.min(100, s.rate));
    return getPt(i, (R * clamped) / 100);
  });
  const dataPolyPts = dataPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const vertexCircles = dataPoints.map(([x, y], i) => {
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--accent)" stroke="#fff" stroke-width="1.5"><title>${skills[i].name}: ${skills[i].rate}% sinh viên làm được</title></circle>`;
  });

  const labels = skills.map((s, i) => {
    const [x, y] = getPt(i, R + 22);
    const anchor = Math.abs(x - cx) < 15 ? 'middle' : x > cx ? 'start' : 'end';
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="var(--fg2)">${s.name.split(' ')[0]} <tspan fill="var(--accent)">${s.rate}%</tspan></text>`;
  });

  const sorted = [...skills].sort((a, b) => b.rate - a.rate);
  const best = sorted[0];
  const needWork = sorted[sorted.length - 1];

  return `
    <div class="panel pad" style="gap:12px;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <b style="font-weight:600;font-size:15px;display:inline-flex;align-items:center;gap:6px;">
            <span>🎯 Radar Năng lực Chuyên đề C</span>
          </b>
          <span class="faint" style="font-size:12.5px">Độ thành thạo 6 trụ cột lập trình C của cả lớp</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(240px, 1fr) minmax(180px, 1fr);gap:14px;align-items:center;">
        <div style="display:flex;justify-content:center;">
          <svg viewBox="0 0 ${size} ${size - 30}" style="width:100%;max-width:280px;height:auto;display:block;">
            ${gridPolys.join('')}
            ${spokes.join('')}
            <polygon points="${dataPolyPts}" fill="color-mix(in oklch, var(--accent) 26%, transparent)" stroke="var(--accent)" stroke-width="2.5" />
            ${vertexCircles.join('')}
            ${labels.join('')}
          </svg>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;">
          <div style="padding:8px 10px;background:var(--bg3);border-radius:var(--r-md);border:1px solid var(--line2);display:flex;flex-direction:column;gap:4px;">
            <span style="font-size:11.5px;color:var(--ac);font-weight:700;">🟢 THÀNH THẠO NHẤT</span>
            <b>${best?.name || '—'}</b>
            <span class="muted" style="font-size:11.5px;">${best?.solvedStudents || 0} sinh viên đã giải được (${best?.rate || 0}%)</span>
          </div>

          <div style="padding:8px 10px;background:var(--bg3);border-radius:var(--r-md);border:1px solid var(--line2);display:flex;flex-direction:column;gap:4px;">
            <span style="font-size:11.5px;color:var(--wa);font-weight:700;">⚠️ CẦN BỒI DƯỠNG</span>
            <b>${needWork?.name || '—'}</b>
            <span class="muted" style="font-size:11.5px;">${needWork?.solvedStudents || 0} sinh viên đã giải được (${needWork?.rate || 0}%)</span>
          </div>

          <span class="faint" style="font-size:11px;line-height:1.4;">Tính theo tỷ lệ sinh viên trong lớp giải được bài tập thuộc chuyên đề tương ứng</span>
        </div>
      </div>
    </div>`;
}

/* 3. Top sinh viên xuất sắc & dẫn đầu tiến độ */
function topStudentsHtml(top) {
  if (!top || !top.length) return '<div class="empty">Chưa có sinh viên nào ghi nhận AC.</div>';
  return `
    <div class="panel pad" style="gap:12px;min-width:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <b style="font-weight:600;font-size:15px;">🏆 Top sinh viên dẫn đầu lớp</b>
        <a href="#/users" style="font-size:12.5px;color:var(--accent);text-decoration:none;">Xem tất cả ↗</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${top
          .map((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="mono faint" style="font-size:12px;width:18px;text-align:center;">${i + 1}</span>`;
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:var(--r-sm);background:var(--bg3);border:1px solid var(--line);">
                <div style="width:22px;display:flex;justify-content:center;font-size:15px;">${medal}</div>
                ${renderAvatar(u.username, u.avatar, 28, u.fullName)}
                <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
                  <a href="/#/profile/${encodeURIComponent(u.username)}" target="_blank" style="font-weight:600;font-size:13px;color:inherit;text-decoration:none;" class="ellipsis" title="Xem hồ sơ ${esc(u.fullName || u.username)}">
                    ${esc(u.fullName || u.username)}
                  </a>
                  <span class="mono faint" style="font-size:11px;">MSSV: ${esc(u.username)}</span>
                </div>
                <div style="text-align:right;">
                  <b class="num" style="color:var(--ac);font-size:13.5px;">${u.solved} bài AC</b>
                  <div class="mono faint" style="font-size:11px;">${u.tries} lần nộp</div>
                </div>
              </div>`;
          })
          .join('')}
      </div>
    </div>`;
}

/* 4. Bài khó nhất */
function hardestHtml(hardest) {
  if (!hardest || !hardest.length) return '<p class="faint" style="margin:0;padding:18px">Chưa đủ dữ liệu.</p>';
  return `
    <div class="panel" style="overflow:hidden;min-width:0;">
      <div class="panel-head"><b style="font-weight:600;font-size:14.5px;">⚠️ Bài tập rớt nhiều nhất (Tỷ lệ AC thấp)</b></div>
      <table class="atable" style="font-size:13px;">
        <thead>
          <tr>
            <th>Mã &amp; Tên bài</th>
            <th class="num">Thử</th>
            <th class="num">AC</th>
            <th class="num">Tỉ lệ AC</th>
          </tr>
        </thead>
        <tbody>
          ${hardest
            .map(
              (h) => `<tr>
                <td>
                  <a href="/#/problem/${encodeURIComponent(h.id)}" target="_blank" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px;" title="Xem đề bài ${esc(h.id)} · ${esc(h.title)} (tab mới)">
                    <span class="mono" style="color:var(--accent);font-weight:600;">${esc(h.id)}</span>
                    <span style="font-weight:500;" class="ellipsis">${esc(h.title)}</span>
                    <span class="faint" style="font-size:11px;">↗</span>
                  </a>
                </td>
                <td class="num">${h.tried}</td>
                <td class="num">${h.solved}</td>
                <td class="num" style="color:var(--wa);font-weight:700;">${h.rate}%</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

/* 6. Luồng bài nộp trực tiếp - THU GỌN 1 DÒNG (Không hiển thị dài dòng tên bài, chỉ hiện mã bài và mở trực tiếp) */
function feedTableHtml(feed, isJudgeOk) {
  if (!feed || !feed.length) return '<p class="faint" style="margin:0;padding:18px">Chưa có bài nộp nào.</p>';
  return `
    <div class="panel" style="overflow:hidden;min-width:0;">
      <div class="panel-head" style="padding:10px 16px;">
        <b style="font-weight:600;font-size:14.5px;">Bài nộp trực tiếp gần đây</b>
        <span class="live" style="color:${isJudgeOk ? 'var(--ac)' : 'var(--wa)'};font-size:12px;">
          <i></i>${isJudgeOk ? 'Trực tiếp' : 'Tạm dừng'}
        </span>
        <div style="flex:1"></div>
        <a href="#/subs" style="font-size:12.5px;color:var(--accent);text-decoration:none;">Xem tất cả bài nộp ↗</a>
      </div>
      <table class="atable" style="font-size:13px;">
        <thead>
          <tr>
            <th style="width:55px;">Giờ</th>
            <th>Sinh viên</th>
            <th style="width:90px;">Mã bài</th>
            <th style="width:75px;text-align:center;">Kết quả</th>
            <th class="num" style="width:75px;">Thời gian</th>
          </tr>
        </thead>
        <tbody>
          ${feed
            .map((f) => {
              const d = new Date(f.created_at);
              const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
              return `
                <tr class="click" data-sub-id="${f.id}" title="Bấm vào để xem mã nguồn và kết quả chi tiết của bài #${f.id}">
                  <td class="mono faint" style="font-size:12px;">${timeStr}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      ${renderAvatar(f.username, f.avatar, 22, f.fullName)}
                      <a href="/#/profile/${encodeURIComponent(f.username)}" target="_blank" onclick="event.stopPropagation();" style="font-weight:600;color:inherit;text-decoration:none;" class="ellipsis" title="Xem hồ sơ ${esc(f.fullName || f.username)}">
                        ${esc(f.fullName || f.username)}
                      </a>
                    </div>
                  </td>
                  <td>
                    <a href="/#/problem/${encodeURIComponent(f.problem_id)}" target="_blank" onclick="event.stopPropagation();" style="color:var(--accent);font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:3px;" class="mono" title="Mở trang đề bài ${esc(f.problem_id)} (tab mới)">
                      ${esc(f.problem_id)} <span class="faint" style="font-size:10px;font-weight:normal;">↗</span>
                    </a>
                  </td>
                  <td style="text-align:center;">
                    <b class="vbadge" style="--v:${verdictVar(f.verdict)};min-width:36px;line-height:20px;font-size:11px;" title="${esc(verdictLabel(f.verdict))}">${verdictAbbr(f.verdict)}</b>
                  </td>
                  <td class="num mono muted" style="font-size:12px;">
                    ${f.verdict === 'CE' || f.time_ms == null ? '—' : `${f.time_ms} ms`}
                  </td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>
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

  async function openDetail(id) {
    const s = await api(`/api/admin/submissions/${id}`);
    const vText = (v) => `<span class="vtext" style="--v:${verdictVar(v)}">${badge(v)}<span style="white-space:nowrap">${esc(verdictLabel(v))}</span></span>`;
    const tests = s.tests?.length
      ? s.tests
          .map(
            (t, i) => `<div style="display:grid;grid-template-columns:44px 1fr 80px 84px;gap:10px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line);font-size:14px">
              <span class="mono muted">#${i + 1}</span>${vText(t.verdict)}<span class="mono muted" style="text-align:right">${t.time_ms} ms</span><span class="mono muted" style="text-align:right">${t.memory_kb} KB</span></div>`,
          )
          .join('')
      : '';
    const drawer = openDrawer({
      wide: true,
      title: `<b class="mono" style="font-weight:600;font-size:16px">#${s.id}</b>${vText(s.verdict)}`,
      html: `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:14px">
          <div style="display:flex;flex-direction:column">
            <span class="faint" style="font-size:12.5px">Người nộp</span>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              ${renderAvatar(s.username, s.avatar, 22, s.fullName)}
              <b style="font-weight:600">${esc(s.fullName || s.username)}</b>
              ${s.fullName ? `<span class="mono faint" style="font-size:12px">(${esc(s.username)})</span>` : ''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column">
            <span class="faint" style="font-size:12.5px">Bài</span>
            <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
              <a href="/#/problem/${encodeURIComponent(s.problemId)}" target="_blank" style="color:var(--accent);font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Xem trang đề bài (tab mới)">
                ${esc(s.problemId)} · ${esc(s.title)} <span style="font-size:11px">↗</span>
              </a>
              <a href="#/probs/${encodeURIComponent(s.problemId)}" class="link-btn faint" style="font-size:12px;text-decoration:underline;" title="Chỉnh sửa bài này trong trang Admin">
                [Sửa bài]
              </a>
            </div>
          </div>
          <div style="display:flex;flex-direction:column"><span class="faint" style="font-size:12.5px">Thời điểm</span><span class="mono">${fmtDateTime(s.createdAt)}</span></div>
        </div>
        ${tests || s.compileLog ? `<div style="border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden">${tests}${s.compileLog ? `<pre class="celog" style="border:0;border-radius:0;max-height:160px">${esc(s.compileLog)}</pre>` : ''}</div>` : ''}
        ${s.failOutput ? `<div style="display:flex;flex-direction:column;gap:4px;"><span style="font-size:12px;font-weight:600;color:var(--wa);text-transform:uppercase;letter-spacing:.04em">Kết quả in ra của thí sinh (Gây sai test):</span><pre class="celog" style="border:1px solid color-mix(in oklch, var(--wa) 40%, var(--line));background:color-mix(in oklch, var(--wa) 6%, var(--bg2));color:var(--fg);max-height:140px;white-space:pre-wrap;font-size:13px;">${esc(s.failOutput)}</pre></div>` : ''}
        <span style="font-size:12.5px;font-weight:600;color:var(--fg3);text-transform:uppercase;letter-spacing:.04em">Mã nguồn</span>
        <pre class="sub-code" tabindex="0" style="background:var(--bg2);max-height:none">${highlightC(s.source).html}</pre>`,
      footer: '<button class="btn-dark" data-rejudge-one>Chấm lại</button>',
    });
    drawer.el.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-rejudge-one]')) return;
      await api('/api/admin/rejudge', { method: 'POST', body: { ids: [s.id] } });
      toast('Đã đưa bài vào hàng đợi chấm lại');
      drawer.close();
      load();
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

      <!-- HÀNG 2: 2 WIDGET TRỌNG TÂM MỚI (1 VÀ 5) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 500px), 1fr));gap:16px;align-items:stretch;">
        ${punchCardHtml(d.punchCard)}
        ${radarHtml(d.skills)}
      </div>

      <!-- HÀNG 3: BẢNG DỮ LIỆU THỰC DỤNG (3 CỘT) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 340px), 1fr));gap:16px;align-items:start;">
        ${topStudentsHtml(d.topStudents)}
        ${hardestHtml(d.hardest)}
        ${feedTableHtml(d.feed, d.judge.ok)}
      </div>`;
  }

  ctx.page.addEventListener('click', (e) => {
    const row = e.target.closest('[data-sub-id]');
    if (row) {
      openDetail(Number(row.dataset.subId));
    }
  });

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
