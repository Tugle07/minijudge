import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { confirmDialog } from './kit.js';
import { openCourseEditor } from './course-editor.js';
import { openCourseShareModal } from './course-share-modal.js';

export const THEMES = [
  { id: 'blue', label: 'Xanh Đại dương (Blue Ocean)', gradient: 'linear-gradient(135deg, #090d16 0%, #1e3a8a 50%, #0284c7 100%)', border: '#0284c7', avatar: '👨‍💻' },
  { id: 'amber', label: 'Cam Hoàng hôn (Amber Fire)', gradient: 'linear-gradient(135deg, #18181b 0%, #7c2d12 50%, #ea580c 100%)', border: '#ea580c', avatar: '⚡' },
  { id: 'purple', label: 'Tím Huyền bí (Purple Galaxy)', gradient: 'linear-gradient(135deg, #09090b 0%, #4c1d95 50%, #8b5cf6 100%)', border: '#8b5cf6', avatar: '🏆' },
  { id: 'emerald', label: 'Xanh Lục bảo (Emerald Forest)', gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)', border: '#10b981', avatar: '🚀' },
  { id: 'ruby', label: 'Đỏ Ruby (Ruby Passion)', gradient: 'linear-gradient(135deg, #881337 0%, #be123c 50%, #f43f5e 100%)', border: '#f43f5e', avatar: '🎯' },
  { id: 'cyan', label: 'Xanh Băng (Cyan Tech)', gradient: 'linear-gradient(135deg, #083344 0%, #0e7490 50%, #06b6d4 100%)', border: '#06b6d4', avatar: '💻' },
  { id: 'dark', label: 'Xám Than (Midnight Slate)', gradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)', border: '#52525b', avatar: '⚙️' },
];

export function getTheme(themeId, customColor = '') {
  if (themeId === 'custom' || (customColor && customColor.trim())) {
    const c = (customColor && customColor.trim()) || '#1e3a8a';
    return {
      id: 'custom',
      label: 'Tùy chỉnh (' + c + ')',
      gradient: 'linear-gradient(135deg, #090d16 0%, ' + c + ' 65%, color-mix(in srgb, ' + c + ' 75%, #ffffff) 100%)',
      border: c,
      avatar: '🎨',
    };
  }
  return THEMES.find((t) => t.id === themeId) || THEMES[0];
}

function formatLang(meta = {}) {
  const l = meta.defaultLang;
  if (l === 'c') return 'C11';
  if (l === 'cpp') return 'C++17';
  if (l === 'cpp14') return 'C++14';
  if (l === 'py') return 'Python 3';
  if (l === 'pypy3') return 'PyPy 3';
  if (meta.tech) return meta.tech;
  return 'Tất cả';
}

function getVisPill(meta = {}, courseName = '') {
  const v = meta.visibility || 'public';
  if (v === 'public') {
    return `<button type="button" class="chip-sm link-btn" data-share="${esc(courseName)}" style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:4px;background:#16a34a18;color:#16a34a;border:1px solid #16a34a33;cursor:pointer" title="Quyền: Public (Bấm để thay đổi)">
      🌐 Public
    </button>`;
  }
  if (v === 'unlisted') {
    return `<button type="button" class="chip-sm link-btn" data-share="${esc(courseName)}" style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:4px;background:#0284c718;color:#0284c7;border:1px solid #0284c733;cursor:pointer" title="Quyền: Nội bộ - chỉ có link (Bấm để thay đổi)">
      🔗 Nội bộ
    </button>`;
  }
  if (v === 'restricted') {
    const n = Array.isArray(meta.allowUsers) ? meta.allowUsers.length : 0;
    return `<button type="button" class="chip-sm link-btn" data-share="${esc(courseName)}" style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:4px;background:#ea580c18;color:#ea580c;border:1px solid #ea580c33;cursor:pointer" title="Quyền: Team - username cụ thể (${n}) (Bấm để thay đổi)">
      👥 Team (${n})
    </button>`;
  }
  return `<button type="button" class="chip-sm link-btn" data-share="${esc(courseName)}" style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--bg3);color:var(--fg3);border:1px solid var(--line2);cursor:pointer" title="Quyền: Nháp - chỉ Admin (Bấm để thay đổi)">
    📝 Nháp
  </button>`;
}

export function openCourseSetsModal({ course, allSets = [], onEditSets = null }) {
  const wrap = document.createElement('div');
  wrap.className = 'dialog-wrap';
  wrap.style.cssText = `
    position: fixed; inset: 0; z-index: 95;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
    display: grid; place-items: center; padding: 16px;
  `;

  const sets = course.sets || [];

  wrap.innerHTML = `
    <div class="dialog" role="dialog" aria-modal="true" style="width:min(560px, calc(100vw - 32px));max-height:85vh;overflow:hidden;display:flex;flex-direction:column;padding:22px;gap:16px;box-shadow:var(--shadow)">
      
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <div style="width:38px;height:38px;border-radius:var(--r-sm);background:var(--accent-soft);color:var(--accent-text);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
            📚
          </div>
          <div style="min-width:0">
            <h2 style="margin:0;font-size:16.5px;font-weight:700;color:var(--fg);line-height:1.3">
              Danh sách khối bài trực thuộc
            </h2>
            <div style="font-size:13px;color:var(--accent-text);font-weight:600;margin-top:2px" class="ellipsis font-mono">
              ${esc(course.name)} · ${sets.length} khối (${course.problemCount} bài)
            </div>
          </div>
        </div>
        <button type="button" class="btn-ghost" data-close style="width:30px;height:30px;padding:0;font-size:16px;display:grid;place-items:center;border-radius:var(--r-sm)">×</button>
      </div>

      <!-- Sets list -->
      <div style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px">
        ${
          sets.length === 0
            ? '<div class="faint" style="text-align:center;padding:28px 12px;font-style:italic">Khóa học này hiện chưa có khối bài tập nào. Hãy vào "Chỉnh sửa thông tin" để gán khối bài.</div>'
            : sets
                .map((s, idx) => {
                  const probCount = Array.isArray(s.problems) ? s.problems.length : (s.problemCount || 0);
                  const numStr = String(idx + 1).padStart(2, '0');
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 12px;border-radius:var(--r-sm);background:var(--bg);border:1px solid var(--line2)">
                      <div style="display:flex;align-items:center;gap:10px;min-width:0">
                        <span class="mono" style="font-size:11px;font-weight:700;color:var(--fg3);background:var(--bg2);padding:2px 6px;border-radius:var(--r-xs);border:1px solid var(--line);flex-shrink:0">${numStr}</span>
                        <div style="min-width:0">
                          <div style="font-size:13.5px;font-weight:600;color:var(--fg);line-height:1.3" class="ellipsis">${esc(s.title || s.id)}</div>
                          <div class="faint mono" style="font-size:11px;line-height:1.2">${esc(s.id)}</div>
                        </div>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                        <span class="chip-sm mono" style="font-size:11.5px;padding:2px 8px;border-radius:var(--r-xs);background:var(--bg2);border:1px solid var(--line);color:var(--fg2)">${probCount} bài</span>
                      </div>
                    </div>
                  `;
                })
                .join('')
        }
      </div>

      <!-- Footer -->
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:10px;border-top:1px solid var(--line)">
        ${
          onEditSets
            ? `<button type="button" class="btn-line" data-assign-sets style="height:34px;padding:0 14px;font-size:13px;display:inline-flex;align-items:center;gap:6px">
                ⚙️ Thêm / Gỡ khối bài
              </button>`
            : `<a href="#/sets" class="btn-line" data-close style="height:34px;padding:0 14px;font-size:13px;display:inline-flex;align-items:center;gap:6px">
                Quản lý khối bài tập ↗
              </a>`
        }
        <button type="button" class="btn-dark" data-close style="height:34px;padding:0 20px;font-size:13px;font-weight:600">
          Đóng
        </button>
      </div>

    </div>
  `;

  const close = () => wrap.remove();
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-assign-sets]')) {
      close();
      if (onEditSets) onEditSets(course);
      return;
    }
    if (e.target.closest('[data-close]') || e.target === wrap) close();
  });
  document.body.append(wrap);
}

export async function render(ctx) {
  ctx.setHead({
    crumb: 'Khóa học',
    title: 'Khóa học & Lộ trình',
    actions: '<button class="btn-dark" data-new>+ Tạo khóa học mới</button>',
  });

  let courses = [];
  let allSets = [];
  let query = '';

  async function load() {
    [courses, allSets] = await Promise.all([
      api('/api/admin/courses'),
      api('/api/admin/sets'),
    ]);
    draw();
  }

  function draw() {
    const filtered = courses.filter((c) =>
      !query || c.name.toLowerCase().includes(query.toLowerCase())
    );

    ctx.page.innerHTML = `
      <div class="filters" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <input class="ctl" data-q placeholder="Tìm khóa học…" value="${esc(query)}" style="flex:1 1 220px;max-width:320px" />
        <span class="count" style="margin-left:auto">${courses.length} khóa học</span>
      </div>

      <div class="panel">
        <table class="atable">
          <thead>
            <tr>
              <th style="min-width:260px">Khóa học</th>
              <th class="num" style="width:110px;text-align:center">Số khối</th>
              <th class="num" style="width:110px;text-align:center">Tổng bài</th>
              <th style="width:145px;text-align:center">Quyền truy cập</th>
              <th style="width:120px;text-align:center">Ngôn ngữ</th>
              <th style="width:110px;text-align:right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map((c) => {
                const meta = c.meta || {};
                const theme = getTheme(meta.theme, meta.customColor);
                return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${theme.border};box-shadow:0 0 6px ${theme.border};flex-shrink:0" title="Tông màu: ${esc(theme.label)}"></span>
                    <div style="min-width:0">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                        <button class="link-btn" data-edit="${esc(c.name)}" style="color:var(--fg);font-weight:700;font-size:14.5px;text-align:left;line-height:1.3">
                          ${esc(c.name)}
                        </button>
                        ${
                          meta.badge
                            ? `<span class="chip-sm" style="font-size:10.5px;padding:1px 6px;border-radius:var(--r-xs);background:var(--bg3);color:var(--accent-text);border:1px solid var(--line2)">${esc(meta.badge)}</span>`
                            : ''
                        }
                      </div>
                      ${
                        meta.dept
                          ? `<div class="faint" style="font-size:12px;margin-top:2px;line-height:1.2" class="ellipsis">${esc(meta.dept)}</div>`
                          : ''
                      }
                    </div>
                  </div>
                </td>
                <td style="text-align:center">
                  <button type="button" class="chip-sm link-btn" data-view-sets="${esc(c.name)}" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:var(--r-xs);background:var(--bg3);border:1px solid var(--line2);cursor:pointer;color:var(--fg)" title="Xem danh sách ${c.setCount} khối bài trực thuộc">
                    <span>${c.setCount} khối</span>
                    <span style="font-size:10px;color:var(--fg3)">↗</span>
                  </button>
                </td>
                <td style="text-align:center">
                  <span class="num font-mono" style="font-weight:600;font-size:13px;color:var(--fg)">${c.problemCount} bài</span>
                </td>
                <td style="text-align:center">
                  ${getVisPill(meta, c.name)}
                </td>
                <td style="text-align:center">
                  <span class="chip-sm mono" style="font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:var(--r-xs);background:var(--bg2);color:var(--fg2);border:1px solid var(--line2)">
                    ${formatLang(meta)}
                  </span>
                </td>
                <td style="text-align:right;white-space:nowrap">
                  <div style="display:inline-flex;align-items:center;justify-content:flex-end;gap:6px;white-space:nowrap">
                    <a href="/index.html#/course/${encodeURIComponent(c.name)}" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="font-size:12px;padding:4px 9px;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;gap:4px;border-radius:var(--r-sm);flex-shrink:0" title="Mở giao diện học viên trong tab mới">
                      <span>Xem</span>
                      <span style="font-size:10px">↗</span>
                    </a>
                    <div class="row-menu" style="display:inline-block">
                      <button class="dots-btn" data-menu aria-haspopup="menu" aria-label="Thao tác" style="width:30px;height:30px;border-radius:var(--r-sm);border:1px solid var(--line2);background:var(--bg2);color:var(--fg2);display:grid;place-items:center;font-size:16px;cursor:pointer">⋯</button>
                      <div class="menu" role="menu" hidden style="min-width:220px;box-shadow:var(--shadow)">
                        <button data-share="${esc(c.name)}">
                          <span style="font-size:15px">🔗</span>
                          <span>Phân quyền & Chia sẻ</span>
                        </button>
                        <button data-edit="${esc(c.name)}">
                          <span style="font-size:15px">✏️</span>
                          <span>Chỉnh sửa thông tin</span>
                        </button>
                        <button data-edit-branding="${esc(c.name)}">
                          <span style="font-size:15px">🎨</span>
                          <span>Tùy biến Thẻ & Banner</span>
                        </button>
                        <button data-view-sets="${esc(c.name)}">
                          <span style="font-size:15px">📚</span>
                          <span>Danh sách khối bài (${c.setCount})</span>
                        </button>
                        <button type="button" data-preview-course="${esc(c.name)}">
                          <span style="font-size:15px">↗️</span>
                          <span>Xem giao diện học viên</span>
                        </button>
                        <div style="height:1px;background:var(--line);margin:4px 0"></div>
                        <button class="danger" data-del="${esc(c.name)}">
                          <span style="font-size:15px">🗑️</span>
                          <span>Xóa khóa học</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
        ${
          courses.length
            ? ''
            : '<div class="empty">Chưa có khóa học nào. Bấm <b style="color:var(--fg)">+ Tạo khóa học mới</b> để tạo khóa học hoặc lộ trình học cho sinh viên.</div>'
        }
      </div>`;
  }

  ctx.page.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) {
      query = e.target.value.trim();
      draw();
    }
  });

  ctx.page.addEventListener('click', async (e) => {
    const t = e.target;

    // Toggle menu
    const menuBtn = t.closest('[data-menu]');
    if (menuBtn) {
      e.stopPropagation();
      const m = menuBtn.nextElementSibling;
      ctx.page.querySelectorAll('.row-menu .menu').forEach((x) => x !== m && (x.hidden = true));
      m.hidden = !m.hidden;
      return;
    }
    if (!t.closest('.row-menu')) {
      ctx.page.querySelectorAll('.row-menu .menu').forEach((x) => (x.hidden = true));
    }

    // Xem danh sách khối bài tập trực thuộc
    if (t.closest('[data-view-sets]')) {
      const name = t.closest('[data-view-sets]').dataset.viewSets;
      const c = courses.find((x) => x.name === name);
      if (c) {
        openCourseSetsModal({
          course: c,
          allSets,
          onEditSets: (targetCourse) => {
            openCourseEditor({
              course: targetCourse,
              allSets,
              initialTab: 'sets',
              onSaved: () => load(),
            });
          },
        });
      }
      return;
    }

    // Chia sẻ khóa học & Cài quyền truy cập
    if (t.closest('[data-share]')) {
      const name = t.closest('[data-share]').dataset.share;
      const c = courses.find((x) => x.name === name);
      if (c) {
        openCourseShareModal({
          courseName: c.name,
          meta: c.meta || {},
          onSaved: () => load(),
        });
      }
      return;
    }

    // Tạo mới
    if (t.closest('[data-new]')) {
      openCourseEditor({
        course: null,
        allSets,
        initialTab: 'general',
        onSaved: () => load(),
      });
      return;
    }

    // Tùy biến Thẻ & Banner
    if (t.closest('[data-edit-branding]')) {
      const name = t.closest('[data-edit-branding]').dataset.editBranding;
      const c = courses.find((x) => x.name === name);
      if (c) {
        openCourseEditor({
          course: c,
          allSets,
          initialTab: 'branding',
          onSaved: () => load(),
        });
      }
      return;
    }

    // Sửa thông tin cơ bản khóa học
    if (t.closest('[data-edit]')) {
      const name = t.closest('[data-edit]').dataset.edit;
      const c = courses.find((x) => x.name === name);
      if (c) {
        openCourseEditor({
          course: c,
          allSets,
          initialTab: 'general',
          onSaved: () => load(),
        });
      }
      return;
    }

    // Xem giao diện học viên trong tab mới
    if (t.closest('[data-preview-course]')) {
      const name = t.closest('[data-preview-course]').dataset.previewCourse;
      ctx.page.querySelectorAll('.row-menu .menu').forEach((x) => (x.hidden = true));
      if (name) {
        window.open(`/index.html#/course/${encodeURIComponent(name)}`, '_blank');
      }
      return;
    }

    // Xóa khóa học
    if (t.closest('[data-del]')) {
      const name = t.closest('[data-del]').dataset.del;
      const ok = await confirmDialog({
        title: `Xóa khóa học "${name}"?`,
        body: 'Thao tác này sẽ gỡ nhóm của các khối bài tập trực thuộc (khối bài và bài tập vẫn được giữ nguyên, chỉ hủy nhóm khóa học).',
        cta: 'Xóa khóa học',
        danger: true,
      });
      if (!ok) return;

      try {
        await api('/api/admin/courses/' + encodeURIComponent(name), {
          method: 'DELETE',
        });
        toast('Đã xóa khóa học thành công!');
        load();
      } catch (err) {
        toast(err.message || 'Lỗi khi xóa khóa học', 'var(--wa)');
      }
      return;
    }
  });

  load();
}
