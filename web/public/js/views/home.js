import { api } from '../api.js';
import { diffMeter, esc, pillStyle, setStatus } from '../ui.js';

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
  blue: { gradient: 'linear-gradient(135deg, #090d16 0%, #1e3a8a 50%, #0284c7 100%)', avatar: '👨‍💻' },
  amber: { gradient: 'linear-gradient(135deg, #18181b 0%, #7c2d12 50%, #ea580c 100%)', avatar: '⚡' },
  purple: { gradient: 'linear-gradient(135deg, #09090b 0%, #4c1d95 50%, #8b5cf6 100%)', avatar: '🏆' },
  emerald: { gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)', avatar: '🚀' },
  ruby: { gradient: 'linear-gradient(135deg, #881337 0%, #be123c 50%, #f43f5e 100%)', avatar: '🎯' },
  cyan: { gradient: 'linear-gradient(135deg, #083344 0%, #0e7490 50%, #06b6d4 100%)', avatar: '💻' },
  dark: { gradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)', avatar: '⚙️' },
};

const DEFAULT_COURSE_METAS = {
  'Kỹ Thuật Lập Trình - [ C ]': {
    badge: 'CHÍNH QUY · UTC2',
    tech: 'C11 · GCC -O2',
    sub: '11 Chương bài học bám sát chuẩn đầu ra KTLT',
    dept: 'Bộ môn Kỹ thuật Lập trình · UTC2',
    theme: 'blue',
    rating: '5.0 (Đề cương chính thức)',
    highlights: [
      '11 Chương bài học bám sát đề cương chuẩn',
      'Website chấm tự động 24/7 với hệ thống MiniJudge',
      'Hơn 100 bài tập thực hành từ cơ bản đến nâng cao',
    ],
    infoItems: [
      { icon: '📖', text: '11 Chương / Khối bài học' },
      { icon: '💻', text: '109 Bài tập thực hành' },
      { icon: '🏛️', text: 'Bộ môn Kỹ thuật Lập trình · UTC2' },
      { icon: '🎯', text: 'Mở tự do 24/7 · Nộp bài tự động' },
    ],
  },
  'Luyện thi & Thực hành': {
    badge: 'THỰC CHIẾN · PHÒNG THI',
    tech: 'ICPC · SUBTASK',
    sub: 'Bộ đề thi Giữa kỳ, Cuối kỳ & Đề K13 thật',
    dept: 'Bộ môn Kỹ thuật Lập trình · UTC2',
    theme: 'amber',
    highlights: [
      'Đề thi thực hành giữa kỳ & cuối kỳ có giới hạn',
      'Chấm tự động theo thời gian thực (Subtask/ICPC)',
      'Rèn luyện kỹ năng giải đề dưới áp lực thời gian',
    ],
  },
  'Luyện thi & Đánh giá năng lực': {
    badge: 'THỰC CHIẾN · PHÒNG THI',
    tech: 'ICPC · SUBTASK',
    sub: 'Bộ đề thi Giữa kỳ, Cuối kỳ & Đề K13 thật',
    dept: 'Bộ môn Kỹ thuật Lập trình · UTC2',
    theme: 'amber',
    highlights: [
      'Đề thi thực hành giữa kỳ & cuối kỳ có giới hạn',
      'Chấm tự động theo thời gian thực (Subtask/ICPC)',
      'Rèn luyện kỹ năng giải đề dưới áp lực thời gian',
    ],
  },
  'Chinh phục điểm 10 & Olympic': {
    badge: 'NÂNG CAO · OLYMPIC',
    tech: 'ALGORITHM · ICPC',
    sub: 'Tư duy thuật toán & Bộ đề thử thách phân loại',
    dept: 'Đội tuyển Olympic Tin học UTC2',
    theme: 'purple',
    highlights: [
      'Tư duy thuật toán phân loại & tối ưu thời gian chạy',
      'Bộ đề thử thách tổng hợp dành cho sinh viên xuất sắc',
      'Chuẩn bị nền tảng tham gia Olympic Tin học SV',
    ],
  },
  'Nâng cao': {
    badge: 'NÂNG CAO · OLYMPIC',
    tech: 'ALGORITHM · ICPC',
    sub: 'Tư duy thuật toán & Bộ đề thử thách phân loại',
    dept: 'Đội tuyển Olympic Tin học UTC2',
    theme: 'purple',
    highlights: [
      'Tư duy thuật toán phân loại & tối ưu thời gian chạy',
      'Bộ đề thử thách tổng hợp dành cho sinh viên xuất sắc',
      'Chuẩn bị nền tảng tham gia Olympic Tin học SV',
    ],
  },
};

export async function render(ctx) {
  const { summary, sets, banner, coursesMeta = {} } = await api('/api/home');
  const topics = [...new Set(sets.flatMap((s) => s.tags))].sort((a, b) => a.localeCompare(b, 'vi'));
  const state = { query: '', topic: '', hideDone: false };

  const total = sets.reduce((t, s) => t + s.count, 0);
  const next = sets.find((s) => s.count && s.ac < s.count);
  const stat = (label, value, unit) =>
    `<div class="ov-stat"><span>${label}</span><b class="num">${value}</b><small>${unit}</small></div>`;

  ctx.view.innerHTML = `
    <main class="page home">
      <section class="overview">
        <div class="ov-head">
          <h1 class="page-title">Khóa học Lập trình</h1>
          ${
            next
              ? `<button class="btn-primary ov-next" data-go="#/set/${encodeURIComponent(next.id)}"><span>Làm tiếp: ${esc(next.title)}</span><span class="num ov-next-n">${next.ac}/${next.count}</span></button>`
              : '<span class="muted">Đã AC toàn bộ bài hiện có.</span>'
          }
        </div>
        <div class="ov-stats">
          ${stat('Đã giải', summary.solved, `/ ${total} bài`)}
          ${stat('Đã thử, chưa AC', Math.max(0, summary.tried - summary.solved), 'bài')}
          ${stat('Chuỗi nộp bài', summary.streak, 'ngày liên tiếp')}
          ${stat('Tỷ lệ hoàn thành', total ? `${Math.round((summary.solved / total) * 100)}%` : '0%', `${summary.solved}/${total} bài`)}
        </div>
      </section>
      ${banner ? `<div class="banner-preview" role="note"><span style="text-wrap:pretty">${esc(banner)}</span></div>` : ''}

      <div class="home-filters" style="margin-top:12px">
        <input class="search" data-q placeholder="Tìm khóa học, khối hoặc chủ đề (vd. mảng, con trỏ)…" aria-label="Tìm kiếm" />
        <select class="ctl" data-topic aria-label="Lọc theo chủ đề"><option value="">Mọi chủ đề</option>${topics.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
        <label class="check"><input type="checkbox" data-hide /> Ẩn khối đã xong</label>
      </div>

      <div data-grid></div>
    </main>`;

  /* Số liệu tổng quan đếm dần lên khi mở trang */
  ctx.view.querySelectorAll('.ov-stat b').forEach((el) => {
    const m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m) return;
    const end = parseInt(m[1], 10);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      el.textContent = `${Math.round(end * (1 - (1 - k) ** 3))}${m[2]}`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  const grid = ctx.view.querySelector('[data-grid]');

  function courseCard(name, items, index) {
    const totalP = items.reduce((t, s) => t + s.count, 0);
    const solvedP = items.reduce((t, s) => t + s.ac, 0);
    const pct = totalP ? Math.round((solvedP / totalP) * 100) : 0;
    const isDone = totalP && solvedP === totalP;
    const href = `#/course/${encodeURIComponent(name)}`;

    const meta = {
      ...(DEFAULT_COURSE_METAS[name] || {}),
      ...(coursesMeta[name] || {}),
    };
    const themeKey = meta.theme || ['blue', 'amber', 'purple', 'emerald'][index % 4];
    const theme = THEME_PRESETS[themeKey] || THEME_PRESETS.blue;
    const bannerGradient = (meta.customColor && meta.customColor.trim())
      ? `linear-gradient(135deg, #090d16 0%, ${meta.customColor.trim()} 65%, color-mix(in srgb, ${meta.customColor.trim()} 75%, #ffffff) 100%)`
      : theme.gradient;

    const badge = meta.badge || 'CHÍNH QUY · UTC2';
    const tech = meta.tech || 'C11 · GCC -O2';
    const sub = meta.sub || `${items.length} Khối bài học bám sát chương trình`;
    const dept = meta.dept || 'Bộ môn Kỹ thuật Lập trình · UTC2';

    const infoItems = Array.isArray(meta.infoItems) && meta.infoItems.length === 4
      ? meta.infoItems
      : [
          { icon: '📖', text: meta.customSetsLabel || `${items.length} Chương / Khối bài học` },
          { icon: '💻', text: meta.customProblemsLabel || `${totalP} Bài tập thực hành` },
          { icon: '🏛️', text: meta.dept || dept },
          { icon: '🎯', text: meta.schedule || 'Mở tự do 24/7 · Nộp bài tự động' },
        ];

    return `
      <div class="course-card-pro" data-go="${href}">
        <div class="course-banner" style="background:${bannerGradient}">
          <div class="course-banner-top">
            <span class="course-badge">${esc(badge)}</span>
            <span class="course-tech-tag">${esc(tech)}</span>
          </div>
          <div class="course-banner-bottom" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:auto">
            <div style="min-width:0;flex:1">
              <div class="course-banner-title">${esc(name)}</div>
              <div class="course-banner-sub">${esc(sub)}</div>
            </div>
            <span class="course-banner-avatar">${theme.avatar}</span>
          </div>
        </div>
        <div class="course-content">
          <div class="course-rating-row">
            ${renderStarsHtml(meta.rating || '5.0 (Đề cương chính thức)')}
            <span class="course-rating-text">${esc(meta.rating || '5.0 (Đề cương chính thức)')}</span>
          </div>
          <h3 class="course-title-main">${esc(name)}</h3>
          <div class="course-meta-list">
            ${infoItems.map((it) => `
              <div class="course-meta-item">
                <i>${esc(it.icon || '•')}</i> <span><b>${esc(it.text || '')}</b></span>
              </div>
            `).join('')}
          </div>
          <div class="course-progress-box">
            <div class="course-progress-label">
              <span>Tiến độ cá nhân</span>
              <b>${solvedP}/${totalP} bài (${pct}%)</b>
            </div>
            <div class="course-progress-bar">
              <div style="width:${pct}%"></div>
            </div>
            <button class="course-cta-btn" type="button">
              ${isDone ? 'Xem lại lộ trình ✓' : solvedP > 0 ? 'Tiếp tục học ➔' : 'Vào học ngay ➔'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function fallbackSetCard(s) {
    const [label, color] = setStatus(s);
    const pct = s.count ? Math.round((s.ac / s.count) * 100) : 0;
    const done = s.count && s.ac === s.count;
    return `
      <button class="set-card ${done ? 'done' : ''}" data-go="#/set/${encodeURIComponent(s.id)}">
        <div class="set-card-top">
          <span class="set-num mono">${esc(s.num)}</span>
          <span class="pill" style="${pillStyle(color)}">${esc(label)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span class="title">${esc(s.title)}</span>
        </div>
        <div class="foot">
          <div class="foot-line">${diffMeter(s.difficulty)}<span><b class="num">${s.ac}</b>/${s.count} bài</span></div>
          <div class="progress ${done ? 'done' : ''}"><div style="width:${pct}%"></div></div>
        </div>
      </button>`;
  }

  function draw() {
    const q = state.query.trim().toLowerCase();
    const filteredSets = sets.filter((s) => {
      if (state.hideDone && s.count && s.ac === s.count) return false;
      if (state.topic && !s.tags.includes(state.topic)) return false;
      if (q && !`${s.title} ${s.desc} ${s.group} ${s.tags.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });

    // Group sets by course
    const groups = new Map();
    for (const s of filteredSets) {
      const g = (s.group || '').trim();
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(s);
    }

    // Courses (named groups)
    const courses = [];
    const orphanSets = [];
    for (const [name, items] of groups.entries()) {
      if (name) courses.push({ name, items });
      else orphanSets.push(...items);
    }

    if (!courses.length && !orphanSets.length) {
      grid.innerHTML = `
        <div class="empty-box">
          <b style="font-size:17px;font-weight:600">Không tìm thấy khóa học hoặc khối bài tập nào</b>
          <span class="muted" style="font-size:14px">Thử từ khóa khác hoặc bỏ bớt bộ lọc.</span>
          <button class="btn" data-clear style="margin-top:6px">Xóa bộ lọc</button>
        </div>`;
      return;
    }

    let html = '';

    // Render Course Cards Grid
    if (courses.length) {
      html += `
        <section class="courses-section">
          <div class="courses-head">
            <div>
              <h2>Khóa học & Lộ trình đào tạo</h2>
              <p>Chọn một khóa học để xem lộ trình từng chương và bắt đầu làm bài tập</p>
            </div>
            <span class="count">${courses.length} khóa học</span>
          </div>
          <div class="courses-grid">
            ${courses.map((c, i) => courseCard(c.name, c.items, i)).join('')}
          </div>
        </section>
      `;
    }

    // Render orphan sets if any
    if (orphanSets.length) {
      html += `
        <section class="courses-section" style="margin-top:36px">
          <div class="courses-head">
            <div>
              <h2>Khối bài tập tự do khác</h2>
              <p>Các khối bài tập bổ trợ chưa phân vào khóa học chính</p>
            </div>
            <span class="count">${orphanSets.length} khối</span>
          </div>
          <div class="set-grid">
            ${orphanSets.map((s) => fallbackSetCard(s)).join('')}
          </div>
        </section>
      `;
    }

    grid.innerHTML = html;
  }

  const $ = (sel) => ctx.view.querySelector(sel);
  $('[data-q]').addEventListener('input', (e) => {
    state.query = e.target.value;
    draw();
  });
  $('[data-topic]').addEventListener('change', (e) => {
    state.topic = e.target.value;
    draw();
  });
  $('[data-hide]').addEventListener('change', (e) => {
    state.hideDone = e.target.checked;
    draw();
  });
  ctx.view.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear]')) {
      state.query = '';
      state.topic = '';
      state.hideDone = false;
      $('[data-q]').value = '';
      $('[data-topic]').value = '';
      $('[data-hide]').checked = false;
      draw();
    }
  });

  draw();
}
