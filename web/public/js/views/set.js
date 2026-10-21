import { api } from '../api.js';
import { diffMeter, esc, pillStyle, setStatus } from '../ui.js';

const MY = {
  ac: ['✓', 'ac', 'Đã Accepted'],
  tried: ['✗', 'tried', 'Đã thử, chưa đúng'],
  '': ['', '', 'Chưa thử'],
};

export async function render(ctx) {
  const { set, problems } = await api(`/api/sets/${encodeURIComponent(ctx.arg || '')}`);
  const [label, color] = setStatus(set);
  const pct = set.count ? Math.round((set.ac / set.count) * 100) : 0;

  const row = (p) => {
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

  ctx.view.innerHTML = `
    <main class="page" style="max-width:1100px;padding-top:28px;gap:24px">
      <nav class="crumbs" aria-label="breadcrumb">
        <button class="link-btn" data-go="#/home">Bài tập</button><span>›</span><span class="current">${esc(set.title)}</span>
      </nav>
      <div class="set-head">
        <div style="display:flex;flex-direction:column;gap:10px;max-width:640px">
          <div style="display:flex;gap:14px;align-items:center">
            <span class="pill" style="${pillStyle(color)}">${esc(label)}</span>
            ${diffMeter(set.difficulty)}
          </div>
          <h1 class="page-title">${esc(set.title)}</h1>
          <p class="muted" style="margin:0">${esc(set.desc)}</p>
        </div>
        <div class="set-progress">
          <div style="display:flex;justify-content:space-between;font-size:14px"><span class="muted">Tiến độ của tôi</span><b class="num" style="font-weight:650">${set.ac}/${set.count} bài</b></div>
          <div class="progress ${set.count && set.ac === set.count ? 'done' : ''}"><div style="width:${pct}%"></div></div>
        </div>
      </div>
      <div class="table" role="table">
        <div class="trow thead set-cols" role="row">
          <span></span><span>Mã</span><span>Tên bài</span><span>Độ khó</span>
          <span class="right wide-only">Tỉ lệ AC</span><span class="right wide-only">Đã giải</span>
        </div>
        ${problems.map(row).join('') || '<div class="empty">Khối này chưa có bài nào.</div>'}
      </div>
      <p class="faint" style="margin:0;font-size:13px"><span style="color:var(--ac)">✓</span> đã AC · <span style="color:var(--wa)">✗</span> đã thử, chưa đúng · Tỉ lệ AC và số bạn đã giải tính trên ${set.classSize} sinh viên</p>
    </main>`;
}
