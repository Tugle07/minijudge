import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { THEMES, getTheme } from './courses.js';
import { openCourseShareModal } from './course-share-modal.js';

const COURSE_ICONS = [
  '📖', '📚', '📜', '🎓', '🏛️', '📝', '✏️', '💡',
  '💻', '🖥️', '⚙️', '⚡', '🛠️', '🚀', '🤖', '🌐',
  '🏆', '🥇', '🥈', '🥉', '🎯', '🏅', '⭐', '🔥',
  '📅', '⏰', '⏳', '🔄', '🟢', '🛡️', '✨', '👨‍💻'
];

function getVisBadge(vis, allowUsers) {
  if (vis === 'public') return '<span class="chip-sm" style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:#16a34a22;color:#16a34a;border:1px solid #16a34a44">🌐 Public</span>';
  if (vis === 'unlisted') return '<span class="chip-sm" style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:#0284c722;color:#0284c7;border:1px solid #0284c744">🔗 Nội bộ</span>';
  if (vis === 'restricted') {
    const n = Array.isArray(allowUsers) ? allowUsers.length : String(allowUsers || '').split(/[\r\n,]+/).filter(Boolean).length;
    return `<span class="chip-sm" style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:#ea580c22;color:#ea580c;border:1px solid #ea580c44">👥 Team (${n})</span>`;
  }
  return '<span class="chip-sm" style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--bg3);color:var(--fg3);border:1px solid var(--line2)">📝 Nháp</span>';
}

function getVisDesc(vis) {
  if (vis === 'public') return 'Public: Hiện công khai trên trang chủ cho mọi sinh viên.';
  if (vis === 'unlisted') return 'Nội bộ: Ẩn khỏi trang chủ, chỉ ai có link trực tiếp mới vào được.';
  if (vis === 'restricted') return 'Team: Chỉ những tài khoản sinh viên được chỉ định mới truy cập được.';
  return 'Nháp: Đang biên soạn, chỉ Quản trị viên mới thấy và thử nghiệm.';
}

function parseRating(str) {
  if (!str) return 5.0;
  const m = String(str).match(/^(\d+(?:[.,]\d+)?)/);
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

export function openCourseEditor({ course = null, allSets = [], initialTab = 'general', onSaved = () => {} }) {
  const isNew = !course;
  const currentName = course ? course.name : '';
  const currentMeta = (course && course.meta) || {};
  const currentSetIds = new Set(course ? course.sets.map((s) => s.id) : []);

  let nameVal = currentName;
  let visibilityVal = currentMeta.visibility || 'public';
  let allowUsersVal = currentMeta.allowUsers ? (Array.isArray(currentMeta.allowUsers) ? currentMeta.allowUsers.join('\n') : String(currentMeta.allowUsers)) : '';
  let defaultLangVal = currentMeta.defaultLang || '';
  let badgeVal = currentMeta.badge || (isNew ? '' : 'KTLT');
  let techVal = currentMeta.tech || (isNew ? '' : 'C11 · GCC');
  let subVal = currentMeta.sub || '';
  let ratingVal = currentMeta.rating || '5.0 (Đề cương chính thức)';
  let themeVal = currentMeta.theme || 'blue';
  let customColorVal = currentMeta.customColor || '';
  let highlightsVal = (currentMeta.highlights && currentMeta.highlights.length)
    ? currentMeta.highlights.join('\n')
    : (isNew ? '' : '11 Chương bài học bám sát đề cương chuẩn UTC2\nWebsite chấm tự động 24/7 với hệ thống MiniJudge\nHơn 100 bài tập thực hành từ cơ bản đến con trỏ');

  let selectedSets = new Set(currentSetIds);
  let filterSetText = '';
  let activeTab = initialTab || 'general'; // 'general' | 'branding' | 'sets'
  let previewMode = 'hero'; // 'card' | 'hero'
  let error = '';

  function calcTotalProblems() {
    return allSets
      .filter((s) => selectedSets.has(s.id))
      .reduce((sum, s) => sum + (s.problems ? s.problems.length : (s.problemCount || 0)), 0);
  }

  // 4 mục thông tin linh động
  let infoItems = Array.isArray(currentMeta.infoItems) && currentMeta.infoItems.length === 4
    ? currentMeta.infoItems.map((it) => ({ icon: it.icon || '•', text: it.text || '' }))
    : [
        { icon: '📖', text: currentMeta.customSetsLabel || `${currentSetIds.size} Khối bài học` },
        { icon: '💻', text: currentMeta.customProblemsLabel || `${calcTotalProblems()} Bài tập thực hành` },
        { icon: '🏛️', text: currentMeta.dept || '' },
        { icon: '🎯', text: currentMeta.schedule || 'Mở tự do 24/7 · Nộp bài tự động' },
      ];

  function renderPreviewHtml() {
    const theme = getTheme(themeVal, customColorVal);
    const lines = highlightsVal
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const totalP = calcTotalProblems();
    const demoSolved = Math.round(totalP * 0.25);
    const demoPct = totalP > 0 ? Math.round((demoSolved / totalP) * 100) : 0;

    // 1. BANNER KHI VÀO KHÓA (KHÔNG BỊ BÓP - RỘNG RÃI CHUẨN TỈ LỆ 2 CỘT)
    if (previewMode === 'hero') {
      return `
        <div style="background:${theme.gradient};border-radius:14px;padding:20px 22px;color:#fff;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.15);width:100%;box-sizing:border-box">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,0.2);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.3)">${esc(badgeVal || 'NHÃN')}</span>
            <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.15)">${esc(techVal || 'NGÔN NGỮ')}</span>
          </div>
          <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:16px;align-items:center">
            <div style="min-width:0">
              <div style="font-size:18px;font-weight:800;letter-spacing:-0.01em;text-transform:uppercase;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.5);line-height:1.25;word-break:break-word">
                ${esc(nameVal || 'TÊN KHÓA HỌC')}
              </div>
              ${subVal ? `<div style="font-size:12px;color:rgba(255,255,255,0.92);margin:4px 0 8px 0;line-height:1.3">${esc(subVal)}</div>` : ''}
              ${
                lines.length
                  ? `
                <div style="display:flex;flex-direction:column;gap:5px;background:rgba(0,0,0,0.36);padding:9px 12px;border-radius:8px;font-size:11.5px;border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(6px)">
                  ${lines.slice(0, 3).map((l) => `<span style="display:flex;align-items:center;gap:6px"><b style="color:#38bdf8">•</b> ${esc(l)}</span>`).join('')}
                </div>`
                  : ''
              }
            </div>
            <!-- Cột phải: Card demo tiến độ chuẩn dark glass -->
            <div style="background:rgba(0,0,0,0.42);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;backdrop-filter:blur(8px);box-shadow:0 6px 18px rgba(0,0,0,0.2)">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.04em">Tiến độ của bạn (Minh họa)</span>
                <span style="font-size:18px">${theme.avatar}</span>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px;margin-bottom:4px">
                  <span style="color:rgba(255,255,255,0.88)">Đã giải thành công:</span>
                  <b style="color:#fff;font-family:var(--font-code)">${demoSolved}/${totalP} bài (${demoPct}%)</b>
                </div>
                <div style="height:6px;border-radius:99px;background:rgba(255,255,255,0.2);overflow:hidden">
                  <div style="width:${demoPct}%;height:100%;background:#38bdf8;border-radius:99px;box-shadow:0 0 6px #38bdf8"></div>
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:rgba(255,255,255,0.75);margin-top:2px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1)">
                <span>📚 ${selectedSets.size} khối</span>
                <span>💻 ${totalP} bài</span>
                <span>⭐ ${esc(parseRating(ratingVal).toFixed(1))}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 2. THẺ KHÓA HỌC TRANG CHỦ (CARD)
    return `
      <div style="width:310px;margin:0 auto;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--bg2);box-shadow:0 8px 24px rgba(0,0,0,0.15)">
        <div style="background:${theme.gradient};padding:14px 16px;color:#fff;position:relative">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:rgba(255,255,255,0.2);backdrop-filter:blur(4px)">${esc(badgeVal || 'NHÃN')}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,0.4)">${esc(techVal || 'NGÔN NGỮ')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px">
            <div style="min-width:0;flex:1">
              <div style="font-size:15px;font-weight:800;line-height:1.25;text-transform:uppercase">${esc(nameVal || 'TÊN KHÓA HỌC')}</div>
              <div style="font-size:11px;opacity:0.85;margin-top:3px">${esc(subVal || 'Mô tả ngắn')}</div>
            </div>
            <span style="font-size:22px;line-height:1">${theme.avatar}</span>
          </div>
        </div>
        <div style="padding:14px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:4px">
            ${renderStarsHtml(ratingVal)}
            <span style="font-size:12px;font-weight:600;color:var(--fg);margin-left:4px">${esc(ratingVal || '5.0')}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
            ${infoItems.map((it) => `
              <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--fg2)">
                <span style="font-size:14px;flex-shrink:0">${esc(it.icon || '•')}</span>
                <span class="ellipsis">${esc(it.text || '')}</span>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:8px;padding-top:10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px">
              <span style="color:var(--fg3)">Tiến độ cá nhân (Minh họa)</span>
              <span class="mono" style="font-weight:700;color:var(--accent-text)">${demoSolved}/${totalP} bài (${demoPct}%)</span>
            </div>
            <div style="height:6px;background:var(--bg3);border-radius:99px;overflow:hidden">
              <div style="width:${demoPct}%;height:100%;background:var(--accent);border-radius:99px"></div>
            </div>
          </div>
          <button type="button" class="btn-dark" style="width:100%;height:34px;margin-top:4px;font-size:12.5px;font-weight:700">
            Tiếp tục học ➔
          </button>
        </div>
      </div>
    `;
  }

  function renderSetsList() {
    const q = filterSetText.toLowerCase();
    const filtered = allSets.filter(
      (s) => !q || s.id.toLowerCase().includes(q) || (s.title && s.title.toLowerCase().includes(q))
    );

    return filtered.length
      ? filtered
          .map((s) => {
            const isChecked = selectedSets.has(s.id);
            const otherGroup = s.group && s.group !== currentName ? s.group : '';
            return `
            <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid ${isChecked ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);background:${isChecked ? 'var(--accent-soft)' : 'var(--bg2)'};cursor:pointer;transition:all .12s">
              <input type="checkbox" data-set-id="${esc(s.id)}" ${isChecked ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--accent);cursor:pointer;flex-shrink:0" />
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
                  <div style="font-size:13.5px;font-weight:600;color:var(--fg);" class="ellipsis" title="${esc(s.title || s.id)}">
                    ${esc(s.title || s.id)}
                  </div>
                  <span class="mono muted" style="font-size:11.5px;font-weight:600;flex-shrink:0">${s.problems ? s.problems.length : (s.problemCount || 0)} bài</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11px">
                  <span class="mono faint">${esc(s.id)}</span>
                  <span style="color:${s.status === 'open' ? 'var(--ok)' : 'var(--wa)'}">
                    ${s.status === 'open' ? '🟢 Mở' : '🔒 Khóa'}
                  </span>
                  ${otherGroup ? `<span class="chip-sm" style="font-size:10.5px;padding:1px 5px;border-radius:3px;background:var(--bg3);color:var(--fg3)">Đang thuộc: ${esc(otherGroup)}</span>` : ''}
                </div>
              </div>
            </label>`;
          })
          .join('')
      : '<div class="faint" style="padding:28px;text-align:center;grid-column:1 / -1">Không tìm thấy khối bài phù hợp với từ khóa tìm kiếm.</div>';
  }

  const wrap = document.createElement('div');
  wrap.className = 'dialog-wrap';
  wrap.style.cssText = `
    position: fixed; inset: 0; z-index: 90;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(3px);
    display: grid; place-items: center; padding: 16px;
  `;

  function renderModalHtml() {
    wrap.innerHTML = `
      <style>
        .course-editor-modal {
          width: min(1080px, calc(100vw - 32px));
          height: min(88vh, 860px);
          background: var(--bg2);
          color: var(--fg);
          border-radius: var(--r-xl, 14px);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
          box-sizing: border-box;
          animation: mjrise .18s ease-out;
        }
        .ce-tab-btn {
          height: 32px; padding: 0 14px; border: none; border-radius: var(--r-xs);
          background: transparent; color: var(--fg2); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .12s; white-space: nowrap;
        }
        .ce-tab-btn:hover { color: var(--fg); background: var(--bg3); }
        .ce-tab-btn.on { background: var(--accent); color: var(--on-accent); }
        .ce-icon-popover {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 120;
          background: var(--bg2); border: 1px solid var(--line); border-radius: var(--r-md);
          box-shadow: var(--shadow); padding: 8px; width: 280px;
          animation: mjMenuPop .12s ease-out;
        }
      </style>

      <div class="dialog course-editor-modal" role="dialog" aria-modal="true">
        
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid var(--line);background:var(--bg2);flex-shrink:0;gap:12px">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <div style="width:36px;height:36px;border-radius:var(--r-sm);background:var(--accent-soft);color:var(--accent-text);display:grid;place-items:center;font-size:18px;flex-shrink:0">
              ${isNew ? '✨' : '✏️'}
            </div>
            <div style="min-width:0">
              <h2 style="margin:0;font-size:16.5px;font-weight:700;color:var(--fg);line-height:1.2" class="ellipsis">
                ${isNew ? 'Tạo khóa học mới' : `Thiết lập khóa học: ${currentName}`}
              </h2>
              <div class="faint" style="font-size:11.5px;margin-top:2px">
                ${isNew ? 'Khởi tạo khóa học, lộ trình và cấu hình hiển thị' : 'Tùy chỉnh thông tin cơ bản, giao diện thẻ & danh sách khối bài'}
              </div>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="seg" style="display:flex;padding:3px;border-radius:var(--r-sm);background:var(--bg3);border:1px solid var(--line2);flex-shrink:0">
            <button type="button" class="ce-tab-btn ${activeTab === 'general' ? 'on' : ''}" data-tab="general">
              ⚙️ Thông tin cơ bản
            </button>
            <button type="button" class="ce-tab-btn ${activeTab === 'branding' ? 'on' : ''}" data-tab="branding">
              🎨 Thẻ & Banner
            </button>
            <button type="button" class="ce-tab-btn ${activeTab === 'sets' ? 'on' : ''}" data-tab="sets">
              📚 Gán khối bài (${selectedSets.size}/${allSets.length})
            </button>
          </div>

          <button type="button" class="btn-ghost" data-close style="width:30px;height:30px;padding:0;font-size:18px;display:grid;place-items:center;border-radius:var(--r-sm)">×</button>
        </div>

        <!-- Body Area -->
        <div style="flex:1;min-height:0;overflow-y:auto;padding:22px" data-ce-body>
          
          <!-- TAB 1: THÔNG TIN CƠ BẢN -->
          <div data-pane="general" style="${activeTab === 'general' ? '' : 'display:none'}">
            <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:start">
              
              <!-- Cột trái: Thông tin chính -->
              <div style="display:flex;flex-direction:column;gap:14px">
                <label class="afield">
                  <span style="font-weight:600;font-size:13.5px">Tên khóa học <b style="color:var(--wa)">*</b></span>
                  <input class="input ${error ? 'err' : ''}" data-field="name" value="${esc(nameVal)}" placeholder="vd. Kỹ Thuật Lập Trình - [ C ]" autofocus />
                  ${error ? `<span class="err-text" data-name-err style="color:var(--wa);font-size:12px">${esc(error)}</span>` : ''}
                </label>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                  <label class="afield">
                    <span style="font-weight:500;font-size:13px">Khoa / Bộ môn / Phụ đề</span>
                    <input class="input" data-field="dept" value="${esc(currentMeta.dept || '')}" placeholder="vd. Bộ môn Kỹ thuật Lập trình · UTC2" />
                    <span class="help" style="font-size:11.5px">Hiển thị dưới tên khóa ở bảng quản trị</span>
                  </label>
                  <label class="afield">
                    <span style="font-weight:500;font-size:13px">Mã nhãn góc thẻ (Badge)</span>
                    <input class="input" data-field="badge" value="${esc(badgeVal)}" placeholder="vd. CHÍNH QUY · UTC2, KTLT" />
                    <span class="help" style="font-size:11.5px">Góc trên bên trái banner thẻ</span>
                  </label>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                  <label class="afield">
                    <span style="font-weight:500;font-size:13px">Ngôn ngữ đề xuất (Template code)</span>
                    <select class="ctl" data-field="defaultLang" style="cursor:pointer;font-weight:600;width:100%">
                      <option value="" ${!defaultLangVal ? 'selected' : ''}>-- Tự động theo hệ thống (C11) --</option>
                      <option value="c" ${defaultLangVal === 'c' ? 'selected' : ''}>C (C11 · gcc)</option>
                      <option value="cpp14" ${defaultLangVal === 'cpp14' ? 'selected' : ''}>C++ (C++14 · g++)</option>
                      <option value="cpp" ${defaultLangVal === 'cpp' ? 'selected' : ''}>C++ (C++17 · g++)</option>
                      <option value="py" ${defaultLangVal === 'py' ? 'selected' : ''}>Python (Python 3.11)</option>
                      <option value="pypy3" ${defaultLangVal === 'pypy3' ? 'selected' : ''}>Python (PyPy 3)</option>
                    </select>
                    <span class="help" style="font-size:11.5px">Khung code mẫu sinh viên mở bài</span>
                  </label>
                  <label class="afield">
                    <span style="font-weight:500;font-size:13px">Nhãn ngôn ngữ góc phải banner</span>
                    <input class="input" data-field="tech" value="${esc(techVal)}" placeholder="vd. C11 · GCC, C++17 · G++" />
                    <span class="help" style="font-size:11.5px">Góc trên bên phải banner thẻ</span>
                  </label>
                </div>

                <!-- Đánh giá sao -->
                <label class="afield">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:500;font-size:13px">Đánh giá theo sao (Rating)</span>
                    <div style="display:flex;gap:4px">
                      <button type="button" class="chip-sm" data-quick-rating="5.0" style="cursor:pointer;background:var(--bg3);border:1px solid var(--line2);font-size:11px">5.0 ★</button>
                      <button type="button" class="chip-sm" data-quick-rating="4.8" style="cursor:pointer;background:var(--bg3);border:1px solid var(--line2);font-size:11px">4.8 ★</button>
                      <button type="button" class="chip-sm" data-quick-rating="4.5" style="cursor:pointer;background:var(--bg3);border:1px solid var(--line2);font-size:11px">4.5 ★</button>
                    </div>
                  </div>
                  <input class="input" data-field="rating" value="${esc(ratingVal)}" placeholder="vd. 5.0 (Đề cương chính thức)" />
                  <span class="help" style="font-size:11.5px">Sao vàng tự động tô theo điểm số</span>
                </label>
              </div>

              <!-- Cột phải: Tông màu & Tóm tắt phân quyền -->
              <div style="display:flex;flex-direction:column;gap:14px">
                <!-- Theme Palette -->
                <div style="padding:14px;background:var(--bg);border:1px solid var(--line2);border-radius:var(--r-md)">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
                    <span style="font-size:12.5px;font-weight:700;color:var(--fg);text-transform:uppercase;letter-spacing:0.03em">Tông màu (Theme Gradient)</span>
                    <span class="chip-sm" data-active-theme-name style="font-size:11.5px;color:var(--accent-text);font-weight:600">${esc(getTheme(themeVal, customColorVal).label)}</span>
                  </div>
                  
                  <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px">
                    ${THEMES.map((t) => `
                      <button type="button" data-select-theme="${t.id}" class="chip-sm" style="height:34px;padding:0 8px;border-radius:var(--r-xs);border:1.5px solid ${themeVal === t.id ? 'var(--accent)' : 'var(--line2)'};background:${t.gradient};color:#fff;display:flex;align-items:center;justify-content:space-between;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15)">
                        <span style="font-size:10.5px;font-weight:700;letter-spacing:0.04em">${t.id.toUpperCase()}</span>
                        <span style="font-size:13px">${t.avatar}</span>
                      </button>
                    `).join('')}
                    <button type="button" data-select-theme="custom" class="chip-sm" style="height:34px;padding:0 8px;border-radius:var(--r-xs);border:1.5px solid ${themeVal === 'custom' ? 'var(--accent)' : 'var(--line2)'};background:var(--bg2);color:var(--fg);display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                      <span style="font-size:10.5px;font-weight:700">TÙY CHỈNH</span>
                      <span style="font-size:13px">🎨</span>
                    </button>
                  </div>

                  <!-- Hex / Picker tùy chỉnh -->
                  <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding:8px 10px;background:var(--bg2);border:1px solid var(--line2);border-radius:var(--r-xs)">
                    <input type="color" data-color-picker value="${customColorVal && customColorVal.startsWith('#') && customColorVal.length === 7 ? customColorVal : '#1e3a8a'}" style="width:30px;height:30px;padding:1px;border:1px solid var(--line2);border-radius:4px;cursor:pointer;background:var(--bg);flex-shrink:0" title="Chọn màu trực quan" />
                    <input class="input font-mono" data-field="customColor" value="${esc(customColorVal)}" placeholder="vd. #1e3a8a hoặc rgb(...)" style="flex:1;height:30px;font-size:12px;padding:0 8px" />
                    <div style="display:flex;gap:3px;flex-shrink:0">
                      <button type="button" data-pick-color="#1e3a8a" style="width:18px;height:18px;border-radius:3px;background:#1e3a8a;cursor:pointer;border:1px solid rgba(255,255,255,0.2)"></button>
                      <button type="button" data-pick-color="#7c2d12" style="width:18px;height:18px;border-radius:3px;background:#7c2d12;cursor:pointer;border:1px solid rgba(255,255,255,0.2)"></button>
                      <button type="button" data-pick-color="#4c1d95" style="width:18px;height:18px;border-radius:3px;background:#4c1d95;cursor:pointer;border:1px solid rgba(255,255,255,0.2)"></button>
                      <button type="button" data-pick-color="#064e3b" style="width:18px;height:18px;border-radius:3px;background:#064e3b;cursor:pointer;border:1px solid rgba(255,255,255,0.2)"></button>
                    </div>
                  </div>
                </div>

                <!-- Thẻ tóm tắt phân quyền & khối bài -->
                <div style="padding:14px;background:var(--bg);border:1px solid var(--line2);border-radius:var(--r-md);display:flex;flex-direction:column;gap:10px">
                  <div style="display:flex;align-items:center;justify-content:space-between">
                    <div>
                      <div style="font-size:12px;font-weight:700;color:var(--fg2);text-transform:uppercase;letter-spacing:0.03em">Quyền truy cập</div>
                      <div style="margin-top:3px" data-ed-vis-badge>${getVisBadge(visibilityVal, allowUsersVal)}</div>
                    </div>
                    <button type="button" class="btn-line" data-open-share style="height:30px;padding:0 12px;font-size:12px">
                      Phân quyền ↗
                    </button>
                  </div>

                  <div style="height:1px;background:var(--line);margin:2px 0"></div>

                  <div style="display:flex;align-items:center;justify-content:space-between">
                    <div>
                      <div style="font-size:12px;font-weight:700;color:var(--fg2);text-transform:uppercase;letter-spacing:0.03em">Khối bài trực thuộc</div>
                      <div style="font-size:12.5px;color:var(--fg);font-weight:600;margin-top:2px" data-selected-summary>
                        ${selectedSets.size} / ${allSets.length} khối (${calcTotalProblems()} bài)
                      </div>
                    </div>
                    <button type="button" class="btn-line" data-switch-to-sets style="height:30px;padding:0 12px;font-size:12px">
                      Gán khối bài ➔
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- TAB 2: THẺ & BANNER (CÓ ICON PICKER VÀ LIVE PREVIEW RỘNG RÃI) -->
          <div data-pane="branding" style="${activeTab === 'branding' ? '' : 'display:none'}">
            <div style="display:grid;grid-template-columns:1.05fr 1.15fr;gap:24px;align-items:start">
              
              <!-- Cột trái: Cấu hình hiển thị thẻ & banner -->
              <div style="display:flex;flex-direction:column;gap:14px">
                
                <!-- 4 Mục thông tin hiển thị trên thẻ -->
                <div style="padding:14px;background:var(--bg);border:1px solid var(--line2);border-radius:var(--r-md)">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <span style="font-size:12.5px;font-weight:700;color:var(--fg);text-transform:uppercase;letter-spacing:0.03em">
                      4 Tiêu điểm hiển thị trên thẻ sinh viên
                    </span>
                    <span class="faint" style="font-size:11px">Bấm icon để đổi biểu tượng</span>
                  </div>

                  <div style="display:flex;flex-direction:column;gap:8px">
                    ${infoItems.map((item, idx) => `
                      <div style="position:relative;display:flex;align-items:center;gap:8px" data-info-row="${idx}">
                        <!-- Nút Icon (Bấm mở Palette) -->
                        <button type="button" data-trigger-icon-picker="${idx}" class="btn-line" style="width:40px;height:38px;padding:0;font-size:18px;display:grid;place-items:center;border-radius:var(--r-sm);flex-shrink:0;cursor:pointer;background:var(--bg2)" title="Bấm để đổi biểu tượng">
                          <span data-info-icon-display="${idx}">${esc(item.icon || '•')}</span>
                        </button>

                        <!-- Nội dung text -->
                        <input class="input" data-info-text="${idx}" value="${esc(item.text)}" placeholder="Tiêu điểm dòng ${idx + 1}..." style="flex:1;height:38px;font-size:13px" />

                        <!-- Icon Palette Popover -->
                        <div class="ce-icon-popover" data-icon-palette="${idx}" style="display:none;${idx >= 2 ? 'bottom:calc(100% + 6px);top:auto' : 'top:calc(100% + 6px);bottom:auto'}">
                          <div style="font-size:11px;font-weight:700;color:var(--fg3);text-transform:uppercase;margin-bottom:6px;padding:0 2px">Chọn biểu tượng sẵn có:</div>
                          <div style="display:grid;grid-template-columns:repeat(8, 1fr);gap:4px">
                            ${COURSE_ICONS.map((ic) => `
                              <button type="button" data-pick-icon="${ic}" data-target-row="${idx}" style="width:30px;height:30px;border-radius:var(--r-xs);border:1px solid transparent;background:transparent;font-size:16px;cursor:pointer;display:grid;place-items:center;transition:background .1s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
                                ${ic}
                              </button>
                            `).join('')}
                          </div>
                          <div style="height:1px;background:var(--line);margin:8px 0 6px 0"></div>
                          <div style="display:flex;align-items:center;gap:6px;padding:0 2px">
                            <span style="font-size:11px;color:var(--fg3);white-space:nowrap">Hoặc nhập:</span>
                            <input type="text" data-custom-icon-input="${idx}" value="${esc(item.icon || '')}" maxlength="4" placeholder="emoji" style="flex:1;height:26px;font-size:13px;padding:0 6px;text-align:center;border-radius:var(--r-xs);border:1px solid var(--line2);background:var(--bg);color:var(--fg)" />
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Mô tả ngắn banner -->
                <label class="afield">
                  <span style="font-weight:500;font-size:13px">Mô tả ngắn banner</span>
                  <input class="input" data-field="sub" value="${esc(subVal)}" placeholder="vd. 11 Chương bài học bám sát chuẩn đầu ra KTLT" />
                  <span class="help" style="font-size:11.5px">Hiển thị ngay dưới tên khóa học</span>
                </label>

                <!-- 3 Dòng mô tả chi tiết khi vào khóa -->
                <label class="afield">
                  <div style="display:flex;justify-content:space-between">
                    <span style="font-weight:500;font-size:13px">3 Dòng nổi bật (Hiển thị trên banner khi vào học)</span>
                    <span class="faint" style="font-size:11.5px">Mỗi dòng 1 gạch đầu dòng</span>
                  </div>
                  <textarea class="input" data-field="highlights" rows="3" style="font-size:13px;line-height:1.5" placeholder="11 Chương bài học chuẩn UTC2&#10;Chấm tự động 24/7 với MiniJudge&#10;Hơn 100 bài tập thực hành">${esc(highlightsVal)}</textarea>
                </label>

              </div>

              <!-- Cột phải: Xem trước (Live Preview Rộng rãi, không bị bóp) -->
              <div style="display:flex;flex-direction:column;gap:12px;position:sticky;top:0">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:12px;font-weight:700;color:var(--fg2);text-transform:uppercase;letter-spacing:0.04em">
                    Xem trước trực tiếp (Live Preview)
                  </span>
                  
                  <!-- Switcher Card / Hero -->
                  <div class="seg" style="display:flex;padding:2px;border-radius:var(--r-xs);background:var(--bg);border:1px solid var(--line2)">
                    <button type="button" data-preview-mode="hero" style="height:26px;padding:0 10px;font-size:11.5px;font-weight:600;border:none;border-radius:3px;cursor:pointer;background:${previewMode === 'hero' ? 'var(--accent)' : 'transparent'};color:${previewMode === 'hero' ? 'var(--on-accent)' : 'inherit'}">
                      Banner Vào khóa
                    </button>
                    <button type="button" data-preview-mode="card" style="height:26px;padding:0 10px;font-size:11.5px;font-weight:600;border:none;border-radius:3px;cursor:pointer;background:${previewMode === 'card' ? 'var(--accent)' : 'transparent'};color:${previewMode === 'card' ? 'var(--on-accent)' : 'inherit'}">
                      Thẻ Trang chủ
                    </button>
                  </div>
                </div>

                <!-- Preview Box Container -->
                <div style="background:var(--bg);padding:18px;border-radius:var(--r-md);border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;min-height:300px" data-preview-container>
                  ${renderPreviewHtml()}
                </div>
                <div class="faint" style="font-size:11.5px;text-align:center">
                  💡 Thay đổi nội dung bên trái sẽ cập nhật ngay vào giao diện xem trước.
                </div>
              </div>

            </div>
          </div>

          <!-- TAB 3: GÁN KHỐI BÀI TẬP -->
          <div data-pane="sets" style="${activeTab === 'sets' ? '' : 'display:none'}">
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
                <input class="ctl" data-filter-sets placeholder="Tìm kiếm khối bài tập (tên, mã khối)…" value="${esc(filterSetText)}" style="flex:1 1 240px;max-width:380px" />
                <div style="display:flex;align-items:center;gap:8px">
                  <button type="button" class="btn-line" data-select-all-sets style="height:34px;padding:0 12px;font-size:12.5px">Chọn tất cả</button>
                  <button type="button" class="btn-line" data-clear-all-sets style="height:34px;padding:0 12px;font-size:12.5px">Bỏ chọn</button>
                  <span class="chip-sm" style="font-size:12px;font-weight:600;padding:4px 10px;background:var(--accent-soft);color:var(--accent-text);border-radius:var(--r-xs)">
                    ${selectedSets.size} / ${allSets.length} khối
                  </span>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:10px;max-height:52vh;overflow-y:auto;padding-right:4px" data-sets-list>
                ${renderSetsList()}
              </div>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 22px;border-top:1px solid var(--line);background:var(--bg);flex-shrink:0">
          <div style="display:flex;align-items:center;gap:10px">
            <button type="button" class="btn-line" data-open-share style="height:36px;padding:0 14px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">
              <span>🔗</span>
              <span>Phân quyền & Chia sẻ</span>
            </button>
            ${!isNew ? `
              <button type="button" class="btn-ghost" data-preview-in-editor style="height:36px;padding:0 12px;font-size:13px;display:inline-flex;align-items:center;gap:6px" title="Mở trang khóa học phía học viên trong tab mới">
                <span>↗️</span>
                <span>Xem giao diện học viên</span>
              </button>
            ` : ''}
            <span class="faint" style="font-size:12px" data-ed-vis-badge-foot>${getVisBadge(visibilityVal, allowUsersVal)}</span>
          </div>

          <div style="display:flex;gap:10px;align-items:center">
            <button type="button" class="btn-line" data-close style="height:36px;padding:0 18px;font-size:13.5px">Hủy</button>
            <button type="button" class="btn-dark" data-save style="height:36px;padding:0 24px;font-size:13.5px;font-weight:600">
              ${isNew ? 'Tạo khóa học' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>

      </div>
    `;
  }

  renderModalHtml();

  function updatePreview() {
    const container = wrap.querySelector('[data-preview-container]');
    if (container) container.innerHTML = renderPreviewHtml();
  }

  function updateSetsUI() {
    const listEl = wrap.querySelector('[data-sets-list]');
    if (listEl) listEl.innerHTML = renderSetsList();
    const summary = wrap.querySelector('[data-selected-summary]');
    if (summary) summary.textContent = `${selectedSets.size} / ${allSets.length} khối (${calcTotalProblems()} bài)`;
    const tabBtn = wrap.querySelector('[data-tab="sets"]');
    if (tabBtn) tabBtn.innerHTML = `📚 Gán khối bài (${selectedSets.size}/${allSets.length})`;
    updatePreview();
  }

  function switchTab(tabKey) {
    activeTab = tabKey;
    wrap.querySelectorAll('[data-tab]').forEach((b) => {
      b.classList.toggle('on', b.dataset.tab === activeTab);
    });
    wrap.querySelectorAll('[data-pane]').forEach((p) => {
      p.style.display = p.dataset.pane === activeTab ? 'block' : 'none';
    });
  }

  function closeAllIconPalettes() {
    wrap.querySelectorAll('.ce-icon-popover').forEach((p) => (p.style.display = 'none'));
  }

  const close = () => wrap.remove();

  wrap.addEventListener('input', (e) => {
    const f = e.target.dataset.field;
    if (f === 'name') {
      nameVal = e.target.value;
      const errSpan = wrap.querySelector('[data-name-err]');
      if (errSpan) errSpan.remove();
      e.target.classList.remove('err');
    } else if (f === 'dept') {
      currentMeta.dept = e.target.value;
      if (infoItems[2]) infoItems[2].text = e.target.value;
      const itInput = wrap.querySelector('[data-info-text="2"]');
      if (itInput) itInput.value = e.target.value;
    } else if (f === 'defaultLang') {
      defaultLangVal = e.target.value;
      if (defaultLangVal === 'cpp') techVal = 'C++17 · G++ -O2';
      else if (defaultLangVal === 'cpp14') techVal = 'C++14 · G++ -O2';
      else if (defaultLangVal === 'pypy3') techVal = 'PyPy 3';
      else if (defaultLangVal === 'py') techVal = 'Python 3.11';
      else if (defaultLangVal === 'c') techVal = 'C11 · GCC -O2';
      const techInput = wrap.querySelector('[data-field="tech"]');
      if (techInput) techInput.value = techVal;
    } else if (f === 'badge') {
      badgeVal = e.target.value;
    } else if (f === 'tech') {
      techVal = e.target.value;
    } else if (f === 'sub') {
      subVal = e.target.value;
    } else if (f === 'rating') {
      ratingVal = e.target.value;
    } else if (f === 'customColor') {
      customColorVal = e.target.value;
      themeVal = 'custom';
      const picker = wrap.querySelector('[data-color-picker]');
      if (picker && customColorVal.startsWith('#') && customColorVal.length === 7) picker.value = customColorVal;
      const labelEl = wrap.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme('custom', customColorVal).label;
    } else if (f === 'highlights') {
      highlightsVal = e.target.value;
    } else if (e.target.matches('[data-info-text]')) {
      const idx = parseInt(e.target.dataset.infoText, 10);
      if (infoItems[idx]) infoItems[idx].text = e.target.value;
    } else if (e.target.matches('[data-custom-icon-input]')) {
      const idx = parseInt(e.target.dataset.customIconInput, 10);
      const val = e.target.value.trim();
      if (infoItems[idx]) {
        infoItems[idx].icon = val || '•';
        const disp = wrap.querySelector(`[data-info-icon-display="${idx}"]`);
        if (disp) disp.textContent = val || '•';
      }
    } else if (e.target.matches('[data-filter-sets]')) {
      filterSetText = e.target.value.trim();
      const listEl = wrap.querySelector('[data-sets-list]');
      if (listEl) listEl.innerHTML = renderSetsList();
    }
    updatePreview();
  });

  wrap.addEventListener('change', (e) => {
    if (e.target.matches('[data-color-picker]')) {
      customColorVal = e.target.value;
      themeVal = 'custom';
      const textInput = wrap.querySelector('[data-field="customColor"]');
      if (textInput) textInput.value = customColorVal;
      const labelEl = wrap.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme('custom', customColorVal).label;
      updatePreview();
    }
    if (e.target.matches('[data-set-id]')) {
      const sid = e.target.dataset.setId;
      if (e.target.checked) selectedSets.add(sid);
      else selectedSets.delete(sid);
      updateSetsUI();
    }
  });

  wrap.addEventListener('click', async (e) => {
    const t = e.target;

    // Click ngoài đóng palette
    if (!t.closest('.ce-icon-popover') && !t.closest('[data-trigger-icon-picker]')) {
      closeAllIconPalettes();
    }

    if (t.closest('[data-close]') || t === wrap) {
      close();
      return;
    }

    // Chuyển tab
    const tabBtn = t.closest('[data-tab]');
    if (tabBtn) {
      switchTab(tabBtn.dataset.tab);
      return;
    }

    if (t.closest('[data-switch-to-sets]')) {
      switchTab('sets');
      return;
    }

    // Chuyển preview mode (hero vs card)
    const prevBtn = t.closest('[data-preview-mode]');
    if (prevBtn) {
      previewMode = prevBtn.dataset.previewMode;
      wrap.querySelectorAll('[data-preview-mode]').forEach((b) => {
        const isActive = b.dataset.previewMode === previewMode;
        b.style.background = isActive ? 'var(--accent)' : 'transparent';
        b.style.color = isActive ? 'var(--on-accent)' : 'inherit';
      });
      updatePreview();
      return;
    }

    // Chọn rating nhanh
    const rateBtn = t.closest('[data-quick-rating]');
    if (rateBtn) {
      const val = rateBtn.dataset.quickRating;
      ratingVal = `${val} (Đánh giá chuẩn)`;
      const input = wrap.querySelector('[data-field="rating"]');
      if (input) input.value = ratingVal;
      updatePreview();
      return;
    }

    // Mở palette chọn icon
    const iconTrigger = t.closest('[data-trigger-icon-picker]');
    if (iconTrigger) {
      e.stopPropagation();
      const idx = iconTrigger.dataset.triggerIconPicker;
      const palette = wrap.querySelector(`[data-icon-palette="${idx}"]`);
      const isOpen = palette && palette.style.display !== 'none';
      closeAllIconPalettes();
      if (!isOpen && palette) palette.style.display = 'block';
      return;
    }

    // Chọn icon trong palette
    const pickIconBtn = t.closest('[data-pick-icon]');
    if (pickIconBtn) {
      const ic = pickIconBtn.dataset.pickIcon;
      const rowIdx = parseInt(pickIconBtn.dataset.targetRow, 10);
      if (infoItems[rowIdx]) {
        infoItems[rowIdx].icon = ic;
        const disp = wrap.querySelector(`[data-info-icon-display="${rowIdx}"]`);
        if (disp) disp.textContent = ic;
        const customInp = wrap.querySelector(`[data-custom-icon-input="${rowIdx}"]`);
        if (customInp) customInp.value = ic;
        updatePreview();
      }
      closeAllIconPalettes();
      return;
    }

    // Theme selector
    const themeBtn = t.closest('[data-select-theme]');
    if (themeBtn) {
      const tid = themeBtn.dataset.selectTheme;
      themeVal = tid;
      if (tid !== 'custom') {
        customColorVal = '';
        const textInput = wrap.querySelector('[data-field="customColor"]');
        if (textInput) textInput.value = '';
      }
      wrap.querySelectorAll('[data-select-theme]').forEach((b) => {
        b.style.borderColor = b.dataset.selectTheme === tid ? 'var(--accent)' : 'var(--line2)';
      });
      const labelEl = wrap.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme(themeVal, customColorVal).label;
      updatePreview();
      return;
    }

    // Color swatch
    const colBtn = t.closest('[data-pick-color]');
    if (colBtn) {
      customColorVal = colBtn.dataset.pickColor;
      themeVal = 'custom';
      const textInput = wrap.querySelector('[data-field="customColor"]');
      if (textInput) textInput.value = customColorVal;
      const picker = wrap.querySelector('[data-color-picker]');
      if (picker) picker.value = customColorVal;
      const labelEl = wrap.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme('custom', customColorVal).label;
      updatePreview();
      return;
    }

    // Xem giao diện học viên từ popup editor
    if (t.closest('[data-preview-in-editor]')) {
      const targetName = (nameVal.trim() || currentName);
      if (targetName) {
        window.open(`/index.html#/course/${encodeURIComponent(targetName)}`, '_blank');
      } else {
        toast('Vui lòng nhập tên khóa học trước');
      }
      return;
    }

    // Mở popup Phân quyền & Chia sẻ
    if (t.closest('[data-open-share]')) {
      openCourseShareModal({
        courseName: nameVal || (course ? course.name : 'Khóa học mới'),
        meta: {
          visibility: visibilityVal,
          allowUsers: allowUsersVal,
        },
        onSaved: ({ visibility, allowUsers }) => {
          visibilityVal = visibility;
          allowUsersVal = Array.isArray(allowUsers) ? allowUsers.join('\n') : allowUsers;
          const badgeBox = wrap.querySelector('[data-ed-vis-badge]');
          if (badgeBox) badgeBox.innerHTML = getVisBadge(visibilityVal, allowUsersVal);
          const footBadge = wrap.querySelector('[data-ed-vis-badge-foot]');
          if (footBadge) footBadge.innerHTML = getVisBadge(visibilityVal, allowUsersVal);
        },
      });
      return;
    }

    // Chọn / Bỏ chọn tất cả khối bài
    if (t.closest('[data-select-all-sets]')) {
      allSets.forEach((s) => selectedSets.add(s.id));
      updateSetsUI();
      return;
    }
    if (t.closest('[data-clear-all-sets]')) {
      selectedSets.clear();
      updateSetsUI();
      return;
    }

    // Lưu khóa học
    if (t.closest('[data-save]')) {
      const saveBtn = t.closest('[data-save]');
      const cleanName = nameVal.trim();
      if (!cleanName) {
        error = 'Vui lòng nhập tên khóa học';
        activeTab = 'general';
        renderModalHtml();
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang lưu…';

      const payload = {
        name: cleanName,
        visibility: visibilityVal,
        allowUsers: allowUsersVal
          ? allowUsersVal.split(/[\r\n,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
          : [],
        defaultLang: defaultLangVal || undefined,
        badge: badgeVal.trim(),
        tech: techVal.trim(),
        sub: subVal.trim(),
        rating: ratingVal.trim(),
        theme: themeVal,
        customColor: themeVal === 'custom' ? customColorVal.trim() : undefined,
        highlights: highlightsVal
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        infoItems: infoItems.map((it) => ({ icon: it.icon || '•', text: (it.text || '').trim() })),
        dept: (currentMeta.dept || infoItems[2]?.text || '').trim(),
        sets: Array.from(selectedSets),
        setIds: Array.from(selectedSets),
      };

      try {
        if (isNew) {
          await api('/api/admin/courses', { method: 'POST', body: payload });
          toast('Đã tạo khóa học thành công!');
        } else {
          await api('/api/admin/courses/' + encodeURIComponent(currentName), {
            method: 'PUT',
            body: payload,
          });
          toast('Đã lưu thay đổi khóa học!');
        }
        close();
        onSaved();
      } catch (err) {
        toast(err.message || 'Lỗi khi lưu khóa học', 'var(--wa)');
        saveBtn.disabled = false;
        saveBtn.textContent = isNew ? 'Tạo khóa học' : 'Lưu thay đổi';
      }
    }
  });

  document.body.append(wrap);
}
