import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { openDrawer } from './kit.js';
import { THEMES, getTheme } from './courses.js';

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

export function openCourseEditor({ course = null, allSets = [], onSaved = () => {} }) {
  const isNew = !course;
  const currentName = course ? course.name : '';
  const currentMeta = (course && course.meta) || {};
  const currentSetIds = new Set(course ? course.sets.map((s) => s.id) : []);

  let nameVal = currentName;
  let badgeVal = currentMeta.badge || 'CHÍNH QUY · UTC2';
  let techVal = currentMeta.tech || 'C11 · GCC -O2';
  let subVal = currentMeta.sub || '11 Chương bài học bám sát chuẩn đầu ra KTLT';
  let ratingVal = currentMeta.rating || '5.0 (Đề cương chính thức)';
  let themeVal = currentMeta.theme || 'blue';
  let customColorVal = currentMeta.customColor || '';
  let highlightsVal = (currentMeta.highlights && currentMeta.highlights.length)
    ? currentMeta.highlights.join('\n')
    : '11 Chương bài học bám sát đề cương chuẩn UTC2\nWebsite chấm tự động 24/7 với hệ thống MiniJudge\nHơn 100 bài tập thực hành từ cơ bản đến con trỏ';

  let selectedSets = new Set(currentSetIds);
  let filterSetText = '';
  let activeTab = 'branding'; // 'branding' | 'sets'
  let previewMode = 'card'; // 'card' | 'hero'
  let activeIconIdx = 0;
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
        { icon: '📖', text: currentMeta.customSetsLabel || `${currentSetIds.size || 11} Chương / Khối bài học` },
        { icon: '💻', text: currentMeta.customProblemsLabel || `${calcTotalProblems() || 109} Bài tập thực hành` },
        { icon: '🏛️', text: currentMeta.dept || 'Bộ môn Kỹ thuật Lập trình · UTC2' },
        { icon: '🎯', text: currentMeta.schedule || 'Mở tự do 24/7 · Nộp bài tự động' },
      ];

  function renderPreviewHtml() {
    const theme = getTheme(themeVal, customColorVal);
    const lines = highlightsVal
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const totalP = calcTotalProblems();

    // 1. BANNER KHI VÀO KHÓA (BỐ CỤC 2 CỘT CÂN ĐỐI)
    if (previewMode === 'hero') {
      return `
        <div style="background:${theme.gradient};border-radius:14px;padding:20px 22px;color:#fff;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);position:relative;overflow:hidden;border:1px solid rgba(255,255,255,0.15)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10.5px;font-weight:700;letter-spacing:0.05em;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,0.2);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.3)">${esc(badgeVal || 'NHÃN')}</span>
            <span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.15)">${esc(techVal || 'NGÔN NGỮ')}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center">
            <div>
              <div style="font-size:18px;font-weight:800;letter-spacing:-0.01em;text-transform:uppercase;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.5)">
                ${esc(nameVal || 'TÊN KHÓA HỌC')}
              </div>
              <div style="font-size:11px;opacity:0.9;margin:3px 0 8px 0">${esc(subVal || 'Mô tả ngắn banner')}</div>
              ${
                lines.length
                  ? `
                <div style="display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,0.35);padding:8px 12px;border-radius:8px;font-size:11px;border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(6px)">
                  ${lines.slice(0, 3).map((l) => `<span style="display:flex;align-items:center;gap:6px"><b style="color:#38bdf8">•</b> ${esc(l)}</span>`).join('')}
                </div>`
                  : ''
              }
            </div>
            <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;backdrop-filter:blur(6px)">
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
                <span style="color:rgba(255,255,255,0.8);font-weight:600">Tiến độ của bạn</span>
                <span style="font-size:18px">${theme.avatar}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px">
                <span style="color:rgba(255,255,255,0.85)">Đã giải:</span>
                <b style="color:#fff">20/${totalP || 109} bài (18%)</b>
              </div>
              <div style="height:5px;border-radius:99px;background:rgba(255,255,255,0.2);overflow:hidden">
                <div style="width:18%;height:100%;background:#38bdf8;border-radius:99px"></div>
              </div>
              <button type="button" class="btn-primary" style="background:#fff;color:#090d16;font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;border:none;margin-top:2px">Tiếp tục học ➔</button>
            </div>
          </div>
        </div>
      `;
    }

    // 2. THẺ TRANG CHỦ (CARD HIỂN THỊ BÊN NGOÀI)
    return `
      <div style="max-width:320px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid var(--line2);background:var(--bg2);box-shadow:0 8px 24px rgba(0,0,0,0.25)">
        <!-- Banner trên của Card -->
        <div style="background:${theme.gradient};padding:14px;color:#fff;display:flex;flex-direction:column;gap:8px;position:relative;min-height:130px;justify-content:space-between">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:10.5px;font-weight:700;letter-spacing:0.05em;padding:3px 8px;border-radius:99px;background:rgba(255,255,255,0.2);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.3)">${esc(badgeVal || 'NHÃN')}</span>
            <span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.15)">${esc(techVal || 'NGÔN NGỮ')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:auto">
            <div style="min-width:0;flex:1">
              <div style="font-size:15px;font-weight:800;letter-spacing:-0.01em;text-transform:uppercase;color:#fff;line-height:1.25">${esc(nameVal || 'TÊN KHÓA HỌC')}</div>
              <div style="font-size:11px;opacity:0.9;margin-top:2px">${esc(subVal || 'Mô tả ngắn banner')}</div>
            </div>
            <span style="font-size:28px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.45));flex-shrink:0">${theme.avatar}</span>
          </div>
        </div>

        <!-- Thân Card -->
        <div style="padding:14px;display:flex;flex-direction:column;gap:9px">
          <!-- Đánh giá sao (Tô màu chuẩn theo số điểm) -->
          <div style="display:flex;align-items:center;gap:6px;font-size:12px">
            ${renderStarsHtml(ratingVal || '5.0 (Đề cương chính thức)')}
            <span style="color:var(--fg2);font-size:12px">${esc(ratingVal || '5.0 (Đề cương chính thức)')}</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:var(--fg);line-height:1.3">${esc(nameVal || 'Tên khóa học')}</div>
          
          <!-- 4 Mục thông tin linh động -->
          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--fg2)">
            ${infoItems.map((it) => `
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px">${esc(it.icon || '•')}</span>
                <span><b>${esc(it.text || '')}</b></span>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:4px;padding-top:8px;border-top:1px solid var(--line2)">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--fg2);margin-bottom:4px">
              <span>Tiến độ cá nhân</span>
              <b>20/${totalP || 109} bài (18%)</b>
            </div>
            <div style="height:5px;border-radius:99px;background:var(--line2);overflow:hidden">
              <div style="width:18%;height:100%;background:var(--accent);border-radius:99px"></div>
            </div>
            <button type="button" class="course-cta-btn" style="margin-top:8px;font-size:12.5px;height:34px">Tiếp tục học ➔</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSetsList() {
    const q = filterSetText.trim().toLowerCase();
    const visible = allSets.filter(
      (s) => !q || s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );

    return visible.length
      ? visible
          .map((s) => {
            const isChecked = selectedSets.has(s.id);
            const otherGroup = s.group && s.group !== currentName ? s.group : null;
            return `
            <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1.5px solid ${isChecked ? 'var(--accent)' : 'var(--line2)'};background:${isChecked ? 'color-mix(in oklch, var(--accent) 8%, var(--bg2))' : 'var(--bg2)'};cursor:pointer;transition:all 0.15s;user-select:none">
              <input type="checkbox" data-set-id="${esc(s.id)}" ${isChecked ? 'checked' : ''} style="margin-top:2px;width:17px;height:17px;accent-color:var(--accent);cursor:pointer;flex-shrink:0" />
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
                  <span style="font-family:var(--font-code);font-size:11px;font-weight:700;color:var(--accent);background:var(--bg3);padding:1px 6px;border-radius:4px;border:1px solid var(--line2)">${esc(s.id)}</span>
                  <span class="mono muted" style="font-size:11.5px;font-weight:600">${s.problems ? s.problems.length : (s.problemCount || 0)} bài</span>
                </div>
                <div style="font-size:13px;font-weight:600;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(s.title)}">
                  ${esc(s.title)}
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:2px;font-size:11px">
                  <span style="color:${s.status === 'open' ? 'var(--ok)' : 'var(--wa)'};font-weight:500">
                    ${s.status === 'open' ? '🟢 Đang mở' : '🔒 Đang khóa'}
                  </span>
                  ${otherGroup ? `<span style="color:var(--fg3);background:var(--bg);padding:1px 6px;border-radius:4px;border:1px solid var(--line2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px" title="Đang thuộc: ${esc(otherGroup)}">Thuộc: ${esc(otherGroup)}</span>` : ''}
                </div>
              </div>
            </label>`;
          })
          .join('')
      : '<div class="faint" style="padding:24px;text-align:center;grid-column:1 / -1">Không tìm thấy khối bài phù hợp với từ khóa tìm kiếm.</div>';
  }

  const bodyHtml = () => `
    <!-- Top Tab Switcher -->
    <div class="ed-tabs" style="margin:-20px -20px 18px -20px;padding:0 20px;background:var(--bg2);position:sticky;top:-20px;z-index:10;border-bottom:1px solid var(--line2)">
      <button type="button" class="tab-btn ${activeTab === 'branding' ? 'on' : ''}" data-tab="branding" style="font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;cursor:pointer">
        🎨 Giao diện & Thẻ sinh viên
      </button>
      <button type="button" class="tab-btn ${activeTab === 'sets' ? 'on' : ''}" data-tab="sets" style="font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;cursor:pointer">
        📚 Khối bài tập trực thuộc
        <span class="chip-sm" data-tab-badge style="font-size:11px;padding:2px 7px;border-radius:99px;background:var(--accent-soft);color:var(--accent);font-weight:700">
          ${selectedSets.size}/${allSets.length} khối
        </span>
      </button>
    </div>

    <!-- TAB 1: GIAO DIỆN & THẺ -->
    <div data-pane="branding" style="${activeTab === 'branding' ? '' : 'display:none'}">
      <div style="display:grid;grid-template-columns:minmax(380px, 1.2fr) minmax(320px, 0.8fr);gap:24px;align-items:start">
        
        <!-- Cột trái: Cài đặt thông tin -->
        <div style="display:flex;flex-direction:column;gap:14px">
          
          <!-- 1. Tên khóa học -->
          <label class="afield">
            <span style="font-weight:600;font-size:13.5px">Tên khóa học <b style="color:var(--wa)">*</b></span>
            <input class="input ${error ? 'err' : ''}" data-field="name" value="${esc(nameVal)}" placeholder="vd. Kỹ Thuật Lập Trình - [ C ]" autofocus />
            ${error ? `<span class="err-text" data-name-err style="color:var(--wa);font-size:12.5px">${esc(error)}</span>` : ''}
          </label>

          <!-- 2. Tông màu chủ đạo & Nhập RGB/Hex -->
          <div class="afield">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-weight:600;font-size:13.5px">Tông màu (Theme Gradient / RGB / Hex)</span>
              <span style="font-size:12px;color:var(--accent);font-weight:600" data-active-theme-name>${getTheme(themeVal, customColorVal).label}</span>
            </div>
            
            <!-- Preset Themes -->
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px">
              ${THEMES.map(
                (t) => `
                <button type="button" data-select-theme="${t.id}" title="${esc(t.label)}" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;border:1.5px solid ${themeVal === t.id && !customColorVal ? 'var(--accent)' : 'var(--line2)'};background:${themeVal === t.id && !customColorVal ? 'color-mix(in oklch, var(--accent) 12%, var(--bg2))' : 'var(--bg2)'};cursor:pointer;transition:all 0.15s;text-align:left">
                  <span style="width:13px;height:13px;border-radius:50%;background:${t.border};box-shadow:0 0 6px ${t.border};flex-shrink:0"></span>
                  <span style="font-size:11.5px;font-weight:600;color:var(--fg);flex:1">${t.id.toUpperCase()}</span>
                  <span style="font-size:12px">${t.avatar}</span>
                </button>`
              ).join('')}
              <button type="button" data-select-theme="custom" title="Tùy chỉnh mã màu RGB / Hex" style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;border:1.5px solid ${themeVal === 'custom' || customColorVal ? 'var(--accent)' : 'var(--line2)'};background:${themeVal === 'custom' || customColorVal ? 'color-mix(in oklch, var(--accent) 12%, var(--bg2))' : 'var(--bg2)'};cursor:pointer;transition:all 0.15s;text-align:left">
                <span style="width:13px;height:13px;border-radius:50%;background:${customColorVal || '#38bdf8'};box-shadow:0 0 6px ${customColorVal || '#38bdf8'};flex-shrink:0"></span>
                <span style="font-size:11.5px;font-weight:600;color:var(--fg);flex:1">TÙY CHỈNH</span>
                <span style="font-size:12px">🎨</span>
              </button>
            </div>

            <!-- Tùy chỉnh thông số RGB / Hex -->
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;background:var(--bg3);border:1px solid var(--line2);border-radius:8px">
              <span style="font-size:12px;font-weight:600;color:var(--fg2);white-space:nowrap">Mã màu tùy chỉnh:</span>
              <input type="color" data-color-picker value="${customColorVal && customColorVal.startsWith('#') && customColorVal.length === 7 ? customColorVal : '#1e3a8a'}" style="width:34px;height:34px;padding:1px;border:1px solid var(--line2);border-radius:6px;cursor:pointer;background:var(--bg);flex-shrink:0" title="Chọn màu trực quan" />
              <input class="input font-mono" data-field="customColor" value="${esc(customColorVal)}" placeholder="vd. #1e3a8a hoặc rgb(30, 58, 138)" style="flex:1;height:34px;font-size:12px" />
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button type="button" data-pick-color="#1e3a8a" class="chip-sm" style="width:20px;height:20px;padding:0;border-radius:4px;background:#1e3a8a;cursor:pointer;border:1px solid rgba(255,255,255,0.2)" title="#1e3a8a"></button>
                <button type="button" data-pick-color="#7c2d12" class="chip-sm" style="width:20px;height:20px;padding:0;border-radius:4px;background:#7c2d12;cursor:pointer;border:1px solid rgba(255,255,255,0.2)" title="#7c2d12"></button>
                <button type="button" data-pick-color="#4c1d95" class="chip-sm" style="width:20px;height:20px;padding:0;border-radius:4px;background:#4c1d95;cursor:pointer;border:1px solid rgba(255,255,255,0.2)" title="#4c1d95"></button>
                <button type="button" data-pick-color="#064e3b" class="chip-sm" style="width:20px;height:20px;padding:0;border-radius:4px;background:#064e3b;cursor:pointer;border:1px solid rgba(255,255,255,0.2)" title="#064e3b"></button>
                <button type="button" data-pick-color="#be123c" class="chip-sm" style="width:20px;height:20px;padding:0;border-radius:4px;background:#be123c;cursor:pointer;border:1px solid rgba(255,255,255,0.2)" title="#be123c"></button>
                <button type="button" data-pick-color="#0e7490" class="chip-sm" style="width:20px;height:20px;padding:0;border-radius:4px;background:#0e7490;cursor:pointer;border:1px solid rgba(255,255,255,0.2)" title="#0e7490"></button>
              </div>
            </div>
          </div>

          <!-- 3. Nhãn khóa học & Ngôn ngữ khuyên dùng -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <label class="afield">
              <span style="font-weight:500;font-size:13px">Nhãn khóa học</span>
              <input class="input" data-field="badge" value="${esc(badgeVal)}" placeholder="vd. CHÍNH QUY · UTC2" />
              <span class="help" style="font-size:11.5px">Góc trên bên trái banner thẻ</span>
            </label>
            <label class="afield">
              <span style="font-weight:500;font-size:13px">Ngôn ngữ khuyên dùng</span>
              <input class="input" data-field="tech" value="${esc(techVal)}" placeholder="vd. C / C++, Python 3, Java, C11 · GCC" />
              <span class="help" style="font-size:11.5px">Góc trên bên phải banner thẻ</span>
            </label>
          </div>

          <!-- 4. Mô tả ngắn -->
          <label class="afield">
            <span style="font-weight:500;font-size:13px">Mô tả ngắn banner</span>
            <input class="input" data-field="sub" value="${esc(subVal)}" placeholder="vd. 11 Chương bài học bám sát chuẩn đầu ra KTLT" />
          </label>

          <!-- 5. 3 Dòng mô tả (Highlights) -->
          <label class="afield">
            <div style="display:flex;justify-content:space-between">
              <span style="font-weight:500;font-size:13px">3 Dòng mô tả (Hiển thị trên banner khi vào khóa)</span>
              <span class="faint" style="font-size:11.5px">Mỗi dòng 1 gạch đầu dòng</span>
            </div>
            <textarea class="input" data-field="highlights" rows="3" style="font-size:13px;line-height:1.5" placeholder="11 Chương bài học chuẩn UTC2&#10;Chấm tự động 24/7 với MiniJudge&#10;Hơn 100 bài tập thực hành">${esc(highlightsVal)}</textarea>
          </label>

          <!-- 6. Đánh giá theo sao -->
          <label class="afield">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:500;font-size:13px">Đánh giá theo sao (Rating)</span>
              <div style="display:flex;gap:3px">
                <button type="button" class="chip-sm" data-quick-rating="5.0" style="cursor:pointer;font-size:10.5px;padding:1px 5px;border-radius:4px;background:var(--bg);border:1px solid var(--line2)">5.0 ★</button>
                <button type="button" class="chip-sm" data-quick-rating="4.8" style="cursor:pointer;font-size:10.5px;padding:1px 5px;border-radius:4px;background:var(--bg);border:1px solid var(--line2)">4.8 ★</button>
                <button type="button" class="chip-sm" data-quick-rating="4.5" style="cursor:pointer;font-size:10.5px;padding:1px 5px;border-radius:4px;background:var(--bg);border:1px solid var(--line2)">4.5 ★</button>
                <button type="button" class="chip-sm" data-quick-rating="4.0" style="cursor:pointer;font-size:10.5px;padding:1px 5px;border-radius:4px;background:var(--bg);border:1px solid var(--line2)">4.0 ★</button>
                <button type="button" class="chip-sm" data-quick-rating="3.5" style="cursor:pointer;font-size:10.5px;padding:1px 5px;border-radius:4px;background:var(--bg);border:1px solid var(--line2)">3.5 ★</button>
              </div>
            </div>
            <input class="input" data-field="rating" value="${esc(ratingVal)}" placeholder="vd. 4.0 (Đề cương chính thức) hoặc 4.5" />
            <span class="help" style="font-size:11.5px">Sao vàng sẽ tự động tô màu theo đúng số điểm (vd: 4.0 sẽ tô đúng 4 sao vàng, 1 sao xám).</span>
          </label>

          <!-- 7. 4 MỤC THÔNG TIN TUỲ CHỈNH (CHỌN ICON & NỘI DUNG LINH ĐỘNG) -->
          <div class="afield">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-weight:600;font-size:13.5px">4 Mục thông tin hiển thị trên thẻ sinh viên</span>
              <span class="faint" style="font-size:11.5px">Tùy chọn Icon & Nội dung từng mục</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px" data-info-rows>
              ${infoItems.map((item, idx) => `
                <div class="info-item-row" data-info-row="${idx}" style="display:grid;grid-template-columns:48px 1fr;gap:8px;align-items:center;padding:4px;border-radius:8px;border:1.5px solid ${idx === activeIconIdx ? 'var(--accent)' : 'transparent'};background:${idx === activeIconIdx ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : 'transparent'}">
                  <!-- Ô chọn/nhập Icon -->
                  <input class="input" data-info-icon="${idx}" value="${esc(item.icon)}" style="text-align:center;font-size:16px;padding:0;height:38px;border-radius:8px;font-weight:600;cursor:pointer" title="Nhấp vào để chọn hoặc gõ emoji" />
                  <!-- Ô nhập Text -->
                  <input class="input" data-info-text="${idx}" value="${esc(item.text)}" placeholder="Nội dung mục ${idx + 1}..." style="font-size:13px;height:38px" />
                </div>
              `).join('')}
            </div>

            <!-- Bảng gợi ý Icon 1-chạm -->
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;padding:8px 12px;background:var(--bg3);border-radius:8px;border:1px solid var(--line2)">
              <span style="font-size:11.5px;color:var(--fg2);font-weight:600">Gợi ý Icon:</span>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                ${['📖', '💻', '🏛️', '🎯', '⏱️', '📜', '🏆', '👥', '⭐', '🔥', '📅', '💡', '🚀', '⚡', '🎓', '🌐', '📌', '✨'].map((ic) => `
                  <button type="button" data-pick-icon="${ic}" class="btn-ghost" style="cursor:pointer;font-size:15px;padding:2px 6px;border-radius:4px;line-height:1.2;background:var(--bg2);border:1px solid var(--line2)">${ic}</button>
                `).join('')}
              </div>
              <span class="faint" style="font-size:11px;margin-left:auto">(Đang chọn mục <b style="color:var(--accent)" data-active-row-label>${activeIconIdx + 1}</b> · Bấm icon để gán)</span>
            </div>
          </div>

        </div>

        <!-- Cột phải: Sticky Live Preview -->
        <div style="position:sticky;top:30px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11.5px;font-weight:700;color:var(--fg2);text-transform:uppercase;letter-spacing:0.04em">XEM TRƯỚC (LIVE PREVIEW)</span>
            <div style="display:flex;gap:3px;background:var(--bg3);padding:2px;border-radius:6px;border:1px solid var(--line2)">
              <button type="button" class="btn-ghost" data-preview-mode="card" style="font-size:11px;padding:3px 8px;border-radius:4px;${previewMode === 'card' ? 'background:var(--accent);color:var(--on-accent)' : ''}">Thẻ Trang chủ</button>
              <button type="button" class="btn-ghost" data-preview-mode="hero" style="font-size:11px;padding:3px 8px;border-radius:4px;${previewMode === 'hero' ? 'background:var(--accent);color:var(--on-accent)' : ''}">Banner Vào khóa</button>
            </div>
          </div>
          <div data-preview-container>${renderPreviewHtml()}</div>
          <div style="font-size:11.5px;color:var(--fg3);text-align:center;line-height:1.4">
            💡 Preview cập nhật ngay lập tức theo nội dung bạn chỉnh sửa ở cột bên trái.
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: KHỐI BÀI TẬP TRỰC THUỘC (FULL WIDTH, 2 CỘT) -->
    <div data-pane="sets" style="${activeTab === 'sets' ? '' : 'display:none'}">
      <div style="display:flex;flex-direction:column;gap:14px">
        
        <!-- Summary Bar -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:color-mix(in oklch, var(--accent) 8%, var(--bg3));border:1px solid color-mix(in oklch, var(--accent) 25%, transparent);border-radius:10px;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--fg)">
              Khối bài trực thuộc: <span style="color:var(--accent)" data-selected-summary>${selectedSets.size} / ${allSets.length} khối (${calcTotalProblems()} bài tập)</span>
            </div>
            <div style="font-size:12px;color:var(--fg2);margin-top:2px">
              Sinh viên mở khóa học sẽ thấy đúng các khối bài tập này hiển thị theo thứ tự.
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="btn-ghost" data-quick-sel="all" style="font-size:12px;padding:4px 10px;border:1px solid var(--line2);background:var(--bg)">✓ Chọn tất cả</button>
            <button type="button" class="btn-ghost" data-quick-sel="none" style="font-size:12px;padding:4px 10px;border:1px solid var(--line2);background:var(--bg)">✕ Bỏ chọn</button>
            <button type="button" class="btn-ghost" data-quick-sel="unassigned" style="font-size:12px;padding:4px 10px;border:1px solid var(--line2);background:var(--bg)">✨ Chỉ khối tự do</button>
            <button type="button" class="btn-ghost" data-quick-sel="invert" style="font-size:12px;padding:4px 10px;border:1px solid var(--line2);background:var(--bg)">🔄 Đảo chọn</button>
          </div>
        </div>

        <!-- Presets & Search Filter -->
        <div style="display:flex;flex-direction:column;gap:8px">
          <!-- Bộ có sẵn -->
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="font-size:12px;color:var(--fg2);font-weight:600">⚡ Chọn nhanh theo bộ:</span>
            <button type="button" class="chip-sm" data-quick-group="ch01-ch11" style="cursor:pointer;background:var(--bg2);border:1px solid var(--line2);font-size:12px;padding:3px 9px;border-radius:6px;font-weight:500">+ 11 Chương KTLT (ch01–ch11)</button>
            <button type="button" class="chip-sm" data-quick-group="exams" style="cursor:pointer;background:var(--bg2);border:1px solid var(--line2);font-size:12px;padding:3px 9px;border-radius:6px;font-weight:500">+ Luyện thi & Kiểm tra</button>
            <button type="button" class="chip-sm" data-quick-group="olympic" style="cursor:pointer;background:var(--bg2);border:1px solid var(--line2);font-size:12px;padding:3px 9px;border-radius:6px;font-weight:500">+ Nâng cao & Olympic</button>
            <button type="button" class="chip-sm" data-quick-group="old" style="cursor:pointer;background:var(--bg2);border:1px solid var(--line2);font-size:12px;padding:3px 9px;border-radius:6px;font-weight:500">+ Khối cũ (ch1–ch6)</button>
          </div>

          <!-- Search input -->
          <div style="position:relative">
            <input class="input" data-filter-sets placeholder="🔍 Tìm kiếm khối bài theo tên hoặc mã khối…" value="${esc(filterSetText)}" style="font-size:13px" />
          </div>
        </div>

        <!-- 2-COLUMN SETS GRID -->
        <div data-sets-list style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-height:480px;overflow-y:auto;padding:2px 2px 8px 2px">
          ${renderSetsList()}
        </div>
      </div>
    </div>
  `;

  const drawer = openDrawer({
    title: isNew ? '✨ Tạo khóa học mới' : `✏️ Sửa khóa học: ${currentName}`,
    wide: true,
    html: bodyHtml(),
    footer: `
      <button class="btn-line" data-close>Hủy</button>
      <button class="btn-dark" data-save>${isNew ? 'Tạo khóa học' : 'Lưu thay đổi'}</button>
    `,
  });

  const drawerEl = drawer.el;

  function updatePreview() {
    const container = drawerEl.querySelector('[data-preview-container]');
    if (container) container.innerHTML = renderPreviewHtml();
  }

  function highlightActiveRow(idx) {
    activeIconIdx = idx;
    drawerEl.querySelectorAll('[data-info-row]').forEach((row) => {
      const isAct = parseInt(row.dataset.infoRow, 10) === idx;
      row.style.borderColor = isAct ? 'var(--accent)' : 'transparent';
      row.style.background = isAct ? 'color-mix(in oklch, var(--accent) 5%, transparent)' : 'transparent';
    });
    const lbl = drawerEl.querySelector('[data-active-row-label]');
    if (lbl) lbl.textContent = idx + 1;
  }

  function updateSetsUI() {
    const listEl = drawerEl.querySelector('[data-sets-list]');
    if (listEl) listEl.innerHTML = renderSetsList();
    const summary = drawerEl.querySelector('[data-selected-summary]');
    if (summary) summary.textContent = `${selectedSets.size} / ${allSets.length} khối (${calcTotalProblems()} bài tập)`;
    const tabBadge = drawerEl.querySelector('[data-tab-badge]');
    if (tabBadge) tabBadge.textContent = `${selectedSets.size}/${allSets.length} khối`;
    updatePreview();
  }

  drawerEl.addEventListener('input', (e) => {
    const f = e.target.dataset.field;
    if (f === 'name') {
      nameVal = e.target.value;
      const errSpan = drawerEl.querySelector('[data-name-err]');
      if (errSpan) errSpan.remove();
      e.target.classList.remove('err');
    }
    else if (f === 'badge') badgeVal = e.target.value;
    else if (f === 'tech') techVal = e.target.value;
    else if (f === 'sub') subVal = e.target.value;
    else if (f === 'rating') ratingVal = e.target.value;
    else if (f === 'customColor') {
      customColorVal = e.target.value;
      themeVal = 'custom';
      const picker = drawerEl.querySelector('[data-color-picker]');
      if (picker && customColorVal.startsWith('#') && customColorVal.length === 7) picker.value = customColorVal;
      const labelEl = drawerEl.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme('custom', customColorVal).label;
    }
    else if (f === 'highlights') highlightsVal = e.target.value;
    else if (e.target.matches('[data-info-icon]')) {
      const idx = parseInt(e.target.dataset.infoIcon, 10);
      highlightActiveRow(idx);
      if (infoItems[idx]) infoItems[idx].icon = e.target.value;
    }
    else if (e.target.matches('[data-info-text]')) {
      const idx = parseInt(e.target.dataset.infoText, 10);
      highlightActiveRow(idx);
      if (infoItems[idx]) infoItems[idx].text = e.target.value;
    }
    else if (e.target.matches('[data-color-picker]')) {
      customColorVal = e.target.value;
      themeVal = 'custom';
      const textInput = drawerEl.querySelector('[data-field="customColor"]');
      if (textInput) textInput.value = customColorVal;
      const labelEl = drawerEl.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme('custom', customColorVal).label;
    }
    else if (e.target.matches('[data-filter-sets]')) {
      filterSetText = e.target.value;
      const listEl = drawerEl.querySelector('[data-sets-list]');
      if (listEl) listEl.innerHTML = renderSetsList();
      return;
    }
    updatePreview();
  });

  drawerEl.addEventListener('focusin', (e) => {
    if (e.target.matches('[data-info-icon]')) {
      highlightActiveRow(parseInt(e.target.dataset.infoIcon, 10));
    } else if (e.target.matches('[data-info-text]')) {
      highlightActiveRow(parseInt(e.target.dataset.infoText, 10));
    }
  });

  drawerEl.addEventListener('change', (e) => {
    if (e.target.matches('[data-set-id]')) {
      const sid = e.target.dataset.setId;
      if (e.target.checked) selectedSets.add(sid);
      else selectedSets.delete(sid);
      updateSetsUI();
    }
  });

  drawerEl.addEventListener('click', (e) => {
    // Info row click
    const infoRow = e.target.closest('[data-info-row]');
    if (infoRow && (e.target.matches('[data-info-icon]') || e.target.matches('[data-info-text]'))) {
      highlightActiveRow(parseInt(infoRow.dataset.infoRow, 10));
    }

    // 1. Tab switcher
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      activeTab = tabBtn.dataset.tab;
      drawerEl.querySelectorAll('[data-tab]').forEach((b) => {
        b.classList.toggle('on', b.dataset.tab === activeTab);
      });
      drawerEl.querySelectorAll('[data-pane]').forEach((p) => {
        p.style.display = p.dataset.pane === activeTab ? 'block' : 'none';
      });
      return;
    }

    // 2. Preview mode switcher
    const prevBtn = e.target.closest('[data-preview-mode]');
    if (prevBtn) {
      previewMode = prevBtn.dataset.previewMode;
      drawerEl.querySelectorAll('[data-preview-mode]').forEach((b) => {
        const isActive = b.dataset.previewMode === previewMode;
        b.style.background = isActive ? 'var(--accent)' : 'transparent';
        b.style.color = isActive ? 'var(--on-accent)' : 'inherit';
      });
      updatePreview();
      return;
    }

    // 3. Quick rating button
    const rateBtn = e.target.closest('[data-quick-rating]');
    if (rateBtn) {
      const val = rateBtn.dataset.quickRating;
      const currentSuffix = ratingVal.replace(/^\s*\d+(?:[.,]\d+)?\s*/, ' ').trim();
      ratingVal = currentSuffix ? `${val} (${currentSuffix.replace(/^\(|\)$/g, '')})` : `${val} (Đánh giá chuẩn)`;
      const input = drawerEl.querySelector('[data-field="rating"]');
      if (input) input.value = ratingVal;
      updatePreview();
      return;
    }

    // 4. Quick icon picker for 4 info rows
    const iconBtn = e.target.closest('[data-pick-icon]');
    if (iconBtn) {
      const ic = iconBtn.dataset.pickIcon;
      if (infoItems[activeIconIdx]) {
        infoItems[activeIconIdx].icon = ic;
        const iconInput = drawerEl.querySelector(`[data-info-icon="${activeIconIdx}"]`);
        if (iconInput) iconInput.value = ic;
        updatePreview();
      }
      return;
    }

    // 5. Quick preset color picker
    const colBtn = e.target.closest('[data-pick-color]');
    if (colBtn) {
      customColorVal = colBtn.dataset.pickColor;
      themeVal = 'custom';
      const textInput = drawerEl.querySelector('[data-field="customColor"]');
      if (textInput) textInput.value = customColorVal;
      const picker = drawerEl.querySelector('[data-color-picker]');
      if (picker) picker.value = customColorVal;
      const labelEl = drawerEl.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme('custom', customColorVal).label;
      updatePreview();
      return;
    }

    // 6. Theme selector button
    const themeBtn = e.target.closest('[data-select-theme]');
    if (themeBtn) {
      const tid = themeBtn.dataset.selectTheme;
      themeVal = tid;
      if (tid !== 'custom') {
        customColorVal = '';
        const textInput = drawerEl.querySelector('[data-field="customColor"]');
        if (textInput) textInput.value = '';
      }
      drawerEl.querySelectorAll('[data-select-theme]').forEach((b) => {
        const isCurrent = b.dataset.selectTheme === themeVal;
        b.style.borderColor = isCurrent ? 'var(--accent)' : 'var(--line2)';
        b.style.background = isCurrent ? 'color-mix(in oklch, var(--accent) 12%, var(--bg2))' : 'var(--bg2)';
      });
      const labelEl = drawerEl.querySelector('[data-active-theme-name]');
      if (labelEl) labelEl.textContent = getTheme(themeVal, customColorVal).label;
      updatePreview();
      return;
    }

    // 7. Quick selection toolbar for sets
    const qBtn = e.target.closest('[data-quick-sel]');
    if (qBtn) {
      const act = qBtn.dataset.quickSel;
      const q = filterSetText.trim().toLowerCase();
      const visible = allSets.filter(
        (s) => !q || s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
      );

      if (act === 'all') {
        visible.forEach((s) => selectedSets.add(s.id));
      } else if (act === 'none') {
        visible.forEach((s) => selectedSets.delete(s.id));
      } else if (act === 'unassigned') {
        allSets.forEach((s) => {
          if (!s.group || s.group === currentName) selectedSets.add(s.id);
          else selectedSets.delete(s.id);
        });
      } else if (act === 'invert') {
        visible.forEach((s) => {
          if (selectedSets.has(s.id)) selectedSets.delete(s.id);
          else selectedSets.add(s.id);
        });
      }
      updateSetsUI();
      return;
    }

    // 8. Presets
    const grpBtn = e.target.closest('[data-quick-group]');
    if (grpBtn) {
      const grp = grpBtn.dataset.quickGroup;
      allSets.forEach((s) => {
        let match = false;
        if (grp === 'ch01-ch11') match = /^ch(0[1-9]|1[0-1])$/.test(s.id);
        else if (grp === 'exams') match = /^(ch-on-thi|ch-du-phong|kt-mang|on-thi|set-de)/.test(s.id) || s.title.toLowerCase().includes('thi') || s.title.toLowerCase().includes('kiểm tra');
        else if (grp === 'olympic') match = /^(ch-olympic|nc|thu-thach)/.test(s.id) || s.title.toLowerCase().includes('olympic') || s.title.toLowerCase().includes('nâng cao');
        else if (grp === 'old') match = /^ch[1-6]/.test(s.id);

        if (match) selectedSets.add(s.id);
      });
      updateSetsUI();
      return;
    }
  });

  drawerEl.querySelector('[data-save]').addEventListener('click', async () => {
    const trimmedName = nameVal.trim();
    if (!trimmedName) {
      error = 'Vui lòng nhập tên khóa học';
      activeTab = 'branding';
      drawerEl.querySelectorAll('[data-tab]').forEach((b) => {
        b.classList.toggle('on', b.dataset.tab === activeTab);
      });
      drawerEl.querySelectorAll('[data-pane]').forEach((p) => {
        p.style.display = p.dataset.pane === activeTab ? 'block' : 'none';
      });
      const nameInput = drawerEl.querySelector('[data-field="name"]');
      if (nameInput) {
        nameInput.classList.add('err');
        nameInput.focus();
      }
      let errSpan = drawerEl.querySelector('[data-name-err]');
      if (!errSpan && nameInput) {
        errSpan = document.createElement('span');
        errSpan.className = 'err-text';
        errSpan.dataset.nameErr = '';
        errSpan.style.color = 'var(--wa)';
        errSpan.style.fontSize = '12.5px';
        nameInput.parentNode.appendChild(errSpan);
      }
      if (errSpan) errSpan.textContent = error;
      toast('Vui lòng nhập tên khóa học');
      return;
    }

    const highlights = highlightsVal
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: trimmedName,
      badge: badgeVal.trim(),
      tech: techVal.trim(),
      sub: subVal.trim(),
      rating: ratingVal.trim(),
      theme: themeVal,
      customColor: customColorVal.trim(),
      highlights,
      infoItems,
      // Backwards compatibility
      customSetsLabel: infoItems[0]?.text || '',
      customProblemsLabel: infoItems[1]?.text || '',
      dept: infoItems[2]?.text || '',
      schedule: infoItems[3]?.text || '',
      setIds: Array.from(selectedSets),
    };

    try {
      if (isNew) {
        await api('/api/admin/courses', {
          method: 'POST',
          body: payload,
        });
        toast(`Đã tạo khóa học "${trimmedName}"`);
      } else {
        await api(`/api/admin/courses/${encodeURIComponent(currentName)}`, {
          method: 'PUT',
          body: { newName: trimmedName, ...payload },
        });
        toast(`Đã cập nhật khóa học "${trimmedName}"`);
      }
      drawer.close();
      if (typeof onSaved === 'function') await onSaved();
    } catch (err) {
      toast(err.message || 'Có lỗi xảy ra khi lưu khóa học');
    }
  });
}
