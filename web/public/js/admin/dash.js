import { api } from '../api.js';
import { esc, renderAvatar, verdictAbbr, verdictLabel, verdictVar } from '../ui.js';
import { pad } from './kit.js';

const RANGES = [
  ['today', 'Hôm nay'],
  ['7d', '7 ngày'],
  ['30d', '30 ngày'],
];
const RANGE_WORD = { today: 'hôm nay', '7d': '7 ngày', '30d': '30 ngày' };
const REFRESH_MS = 3000;

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

function chartHtml(series) {
  const vals = series.vals;
  const max = Math.max(1, ...vals);
  const n = vals.length;
  const pts = vals.map((v, i) => `${((i / Math.max(1, n - 1)) * 600).toFixed(1)},${(176 - (v / max) * 160).toFixed(1)}`).join(' ');
  return `
    <div class="panel pad">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-weight:600">Số bài nộp theo ${series.unit}</b><span class="faint" style="font-size:13px">Tổng ${fmtNum(vals.reduce((a, b) => a + b, 0))}</span></div>
      <div class="chart">
        <div class="grid"><span></span><span></span><span></span><span></span></div>
        <svg viewBox="0 0 600 180" preserveAspectRatio="none" aria-label="Biểu đồ số bài nộp">
          <polygon points="0,176 ${pts} 600,176" fill="color-mix(in oklch, var(--ring) 16%, transparent)"></polygon>
          <polyline points="${pts}" fill="none" stroke="var(--ring)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"></polyline>
        </svg>
        <span class="max">${max}</span>
      </div>
      <div class="axis">${series.labels.map((l) => `<span>${esc(l)}</span>`).join('')}</div>
    </div>`;
}

function donutHtml(dist) {
  const total = dist.reduce((t, d) => t + d.n, 0);
  let acc = 0;
  const stops = total
    ? dist
        .filter((d) => d.n)
        .map((d) => {
          const a = acc;
          acc += (d.n / total) * 100;
          return `${verdictVar(d.verdict)} ${a}% ${Math.max(a, acc - 0.6)}%, transparent ${Math.max(a, acc - 0.6)}% ${acc}%`;
        })
        .join(', ')
    : 'var(--bg3) 0% 100%';
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const ac = dist.find((d) => d.verdict === 'AC')?.n ?? 0;
  return `
    <div class="panel pad" style="gap:14px">
      <b style="font-weight:600">Phân bố kết quả chấm</b>
      <div style="display:flex;align-items:center;gap:20px">
        <div class="donut" style="background:conic-gradient(${stops})"><div>${pct(ac)}%<br /><span class="faint" style="font-size:12px;font-weight:500">AC</span></div></div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:0">
          ${dist
            .map(
              (d) => `<div style="display:flex;align-items:center;gap:8px;font-size:13.5px"><b class="vbadge" style="--v:${verdictVar(d.verdict)};min-width:38px">${verdictAbbr(d.verdict)}</b>
                <span class="muted ellipsis" style="flex:1">${esc(verdictLabel(d.verdict))}</span><span class="mono">${pct(d.n)}%</span></div>`,
            )
            .join('')}
        </div>
      </div>
    </div>`;
}

function feedRow(f) {
  const d = new Date(f.created_at);
  return `
    <div class="feed-row" style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);">
      <span class="mono faint" style="font-size:12.5px;min-width:38px">${pad(d.getHours())}:${pad(d.getMinutes())}</span>
      ${renderAvatar(f.username, f.avatar, 26, f.fullName)}
      <span style="min-width:0;display:flex;flex-direction:column;flex:1">
        <span class="ellipsis" style="font-weight:600;font-size:13.5px">${esc(f.fullName || f.username)}${f.fullName ? ` <span class="mono faint" style="font-size:11.5px;font-weight:normal">(${esc(f.username)})</span>` : ''}</span>
        <span class="muted ellipsis" style="font-size:12.5px">${esc(f.problem_id)} · ${esc(f.title)}</span>
      </span>
      <b class="vbadge" style="--v:${verdictVar(f.verdict)};min-width:40px;line-height:22px" title="${esc(verdictLabel(f.verdict))}">${verdictAbbr(f.verdict)}</b>
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
      <div class="dash-grid">
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          ${chartHtml(d.series)}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">
            ${donutHtml(d.dist)}
            <div class="panel pad">
              <b style="font-weight:600">Tiến độ theo khối</b>
              ${d.setProgress
                .map(
                  (s) => `<div style="display:flex;flex-direction:column;gap:5px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px"><span class="ellipsis">${esc(s.title)}</span><span class="mono muted">${s.pct}%</span></div><div class="progress"><div style="width:${s.pct}%"></div></div></div>`,
                )
                .join('') || '<span class="faint">Chưa có khối nào.</span>'}
              <span class="faint" style="font-size:12.5px">% sinh viên đã AC toàn bộ bài trong khối</span>
            </div>
          </div>
          <div class="panel" style="overflow:hidden">
            <div class="panel-head"><b style="font-weight:600">Bài khó nhất</b></div>
            ${
              d.hardest.length
                ? `<table class="atable"><thead><tr><th>Bài</th><th class="num">Số người thử</th><th class="num">Đã giải</th><th class="num">Tỉ lệ AC</th></tr></thead><tbody>
              ${d.hardest.map((h) => `<tr><td><span class="mono muted" style="margin-right:8px">${esc(h.id)}</span>${esc(h.title)}</td><td class="num">${h.tried}</td><td class="num">${h.solved}</td><td class="num" style="color:var(--wa)">${h.rate}%</td></tr>`).join('')}
              </tbody></table>`
                : '<p class="faint" style="margin:0;padding:18px">Chưa đủ dữ liệu (cần ít nhất 2 người thử một bài).</p>'
            }
          </div>
        </div>
        <div class="panel" style="overflow:hidden;min-width:0">
          <div class="panel-head"><b style="font-weight:600">Bài nộp mới nhất</b><span class="live" style="color:${d.judge.ok ? 'var(--ac)' : 'var(--wa)'}"><i></i>${d.judge.ok ? 'Trực tiếp' : 'Tạm dừng'}</span></div>
          ${d.feed.map(feedRow).join('') || '<p class="faint" style="margin:0;padding:18px">Chưa có bài nộp nào.</p>'}
        </div>
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
