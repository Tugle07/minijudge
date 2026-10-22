import { api } from '../api.js';
import { badge, esc, fmtWhen, toast, verdictLabel, verdictVar } from '../ui.js';

const DAY = 86_400_000;
const VERDICTS = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'];
const WEEKDAYS = ['T2', '', 'T4', '', 'T6', '', 'CN'];
const pad = (n) => String(n).padStart(2, '0');
const dmy = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

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
  const p = await api('/api/me/profile');
  const fresh = !p.submissions && !p.contests.length;
  const firstSet = p.sets.find((s) => s.count);

  ctx.view.innerHTML = `
    <main class="page" style="max-width:1000px;gap:24px">
      <div class="pf-head">
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <h1 class="page-title">${esc(p.fullName || p.username)}</h1>
          <span class="muted" style="font-size:14px"><span class="mono">${esc(p.username)}</span> · ${p.role === 'admin' ? 'Admin' : 'Sinh viên'} · tham gia ${dmy(p.createdAt)}</span>
        </div>
        <button class="btn" data-pw-open>Đổi mật khẩu</button>
      </div>
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
              <span class="muted">Hoạt động, kết quả và các bài đang làm dở sẽ hiện ở đây sau lần nộp đầu tiên.</span>
              ${firstSet ? `<button class="btn-primary" data-go="#/set/${encodeURIComponent(firstSet.id)}">Bắt đầu với ${esc(firstSet.title)}</button>` : ''}
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
          fresh
            ? ''
            : `<div class="pf-col">
                <section class="card-box">
                  <div class="pf-box-head"><b>Bài đang làm dở</b><span class="faint">${p.unsolvedTotal ? `${p.unsolvedTotal} bài` : ''}</span></div>
                  ${p.unsolved.length ? `<div class="pf-list">${p.unsolved.map(unsolvedRow).join('')}</div>` : '<span class="faint">Bài nào đã thử cũng đã AC.</span>'}
                </section>
                <section class="card-box">
                  <div class="pf-box-head"><b>Lần nộp gần đây</b><span class="faint">bấm để xem các lần nộp của bài</span></div>
                  ${verdictBar(p.practiceVerdicts)}
                  ${p.recent.length ? `<div class="pf-list">${p.recent.map(recentRow).join('')}</div>` : '<span class="faint">Chưa có lần nộp nào ở phần luyện tập.</span>'}
                </section>
              </div>`
        }
      </div>

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

  const dialog = ctx.view.querySelector('[data-pw-dialog]');
  const form = ctx.view.querySelector('[data-pw]');
  const showErr = (fields) =>
    form.querySelectorAll('[data-err]').forEach((el) => {
      el.textContent = fields[el.dataset.err] || '';
      form.querySelector(`[name="${el.dataset.err}"]`).classList.toggle('err', Boolean(fields[el.dataset.err]));
    });
  ctx.view.querySelector('[data-pw-open]').addEventListener('click', () => {
    form.reset();
    showErr({});
    dialog.showModal();
  });
  ctx.view.querySelector('[data-pw-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  form.addEventListener('submit', async (e) => {
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
