import { api } from '../api.js';
import { avatarColor, esc, initials, toast, verdictAbbr, verdictLabel, verdictVar } from '../ui.js';

const DAY = 86_400_000;
const VERDICTS = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'];
const pad = (n) => String(n).padStart(2, '0');
const dmy = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/* Bản đồ hoạt động 12 tuần kiểu GitHub: mỗi cột là một tuần (T2 → CN), đậm hơn = nộp nhiều hơn. */
function heatmap(activity, end) {
  const n = activity.length;
  const start = end - (n - 1) * DAY;
  const offset = (new Date(start).getDay() + 6) % 7; /* T2 = 0 */
  const max = Math.max(1, ...activity);
  const cells = Array.from({ length: offset }, () => '<span class="hm-cell empty"></span>');
  activity.forEach((count, i) => {
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
    cells.push(`<span class="hm-cell l${level}" title="${dmy(start + i * DAY)}: ${count} bài nộp"></span>`);
  });
  return `<div class="heatmap" role="img" aria-label="Hoạt động nộp bài 12 tuần gần nhất">${cells.join('')}</div>`;
}

export async function render(ctx) {
  const p = await api('/api/me/profile');
  const totalV = VERDICTS.reduce((t, v) => t + (p.verdicts[v] || 0), 0);

  ctx.view.innerHTML = `
    <main class="page" style="max-width:1000px;gap:24px">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:18px">
        <span class="avatar" style="width:64px;height:64px;font-size:22px;background:${avatarColor(p.username)}">${esc(initials(p.username))}</span>
        <div style="display:flex;flex-direction:column;gap:4px">
          <h1 class="page-title mono" style="font-size:24px">${esc(p.username)}</h1>
          <span class="muted" style="font-size:14px">${p.role === 'admin' ? 'Admin' : 'Sinh viên'} · tham gia ${dmy(p.createdAt)}</span>
        </div>
      </div>
      <div class="chip-row" style="gap:8px">
        <span class="stat-pill">Đã giải <b>${p.solved}</b> bài</span>
        <span class="stat-pill">Đã thử <b>${p.tried}</b> bài</span>
        <span class="stat-pill">Hạng <b>${p.rank || '—'}</b>/${p.classSize}</span>
        <span class="stat-pill">Chuỗi <b>${p.streak}</b> ngày</span>
        <span class="stat-pill">${p.submissions} bài nộp · <b>${p.acRate}%</b> AC</span>
      </div>

      <section class="card-box">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><b style="font-weight:600">Hoạt động 12 tuần</b><span class="faint" style="font-size:13px">${p.activity.reduce((a, b) => a + b, 0)} bài nộp</span></div>
        ${heatmap(p.activity, p.activityEnd)}
        <div class="faint" style="display:flex;align-items:center;gap:6px;font-size:12px;justify-content:flex-end">Ít <span class="hm-cell l0"></span><span class="hm-cell l1"></span><span class="hm-cell l2"></span><span class="hm-cell l3"></span><span class="hm-cell l4"></span> Nhiều</div>
      </section>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px">
        <section class="card-box">
          <b style="font-weight:600">Tiến độ theo khối</b>
          ${p.sets
            .map((s) => {
              const pct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
              return `<div style="display:flex;flex-direction:column;gap:6px">
                <div style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><a href="#/set/${encodeURIComponent(s.id)}" class="ellipsis" style="color:var(--fg)">${esc(s.title)}</a><span class="mono muted">${s.ac}/${s.count}</span></div>
                <div class="progress ${s.count && s.ac === s.count ? 'done' : ''}"><div style="width:${pct}%"></div></div></div>`;
            })
            .join('') || '<span class="faint">Chưa có khối nào.</span>'}
        </section>
        <section class="card-box">
          <b style="font-weight:600">Kết quả các lần nộp</b>
          ${VERDICTS.map((v) => {
            const n = p.verdicts[v] || 0;
            const pct = totalV ? Math.round((n / totalV) * 100) : 0;
            return `<div style="display:grid;grid-template-columns:44px minmax(0,1fr) 40px;gap:10px;align-items:center;font-size:13.5px">
              <b class="vbadge" style="--v:${verdictVar(v)}" title="${esc(verdictLabel(v))}">${verdictAbbr(v)}</b>
              <div class="progress"><div style="width:${pct}%;background:${verdictVar(v)}"></div></div>
              <span class="mono muted" style="text-align:right">${n}</span></div>`;
          }).join('')}
        </section>
      </div>

      <section class="card-box" style="max-width:460px">
        <b style="font-weight:600">Đổi mật khẩu</b>
        <form class="form" data-pw novalidate>
          <label class="field"><span>Mật khẩu hiện tại</span><input class="input" type="password" name="current" autocomplete="current-password" /><span class="err-text" data-err="current"></span></label>
          <label class="field"><span>Mật khẩu mới</span><input class="input" type="password" name="next" autocomplete="new-password" placeholder="Ít nhất 6 ký tự" /><span class="err-text" data-err="next"></span></label>
          <label class="field"><span>Nhập lại mật khẩu mới</span><input class="input" type="password" name="again" autocomplete="new-password" /><span class="err-text" data-err="again"></span></label>
          <button class="btn-primary" type="submit" style="height:40px">Đổi mật khẩu</button>
          <span class="faint" style="font-size:13px">Các thiết bị khác đang đăng nhập sẽ bị đăng xuất.</span>
        </form>
      </section>
    </main>`;

  const form = ctx.view.querySelector('[data-pw]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const showErr = (fields) =>
      form.querySelectorAll('[data-err]').forEach((el) => {
        el.textContent = fields[el.dataset.err] || '';
        form.querySelector(`[name="${el.dataset.err}"]`).classList.toggle('err', Boolean(fields[el.dataset.err]));
      });
    if (data.next !== data.again) return showErr({ again: 'Mật khẩu nhập lại không khớp' });
    try {
      await api('/api/me/password', { method: 'POST', body: { current: data.current, next: data.next } });
      form.reset();
      showErr({});
      toast('Đã đổi mật khẩu');
    } catch (err) {
      showErr(err.fields || {});
      if (!err.fields) toast(err.message);
    }
  });
}
