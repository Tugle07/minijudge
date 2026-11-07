import { api } from '../api.js';
import { esc, toast } from '../ui.js';
import { confirmDialog } from './kit.js';
import { openCourseEditor } from './course-editor.js';

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
              <th>Tên khóa học</th>
              <th>Khối bài trực thuộc</th>
              <th class="num" style="width:90px">Số khối</th>
              <th class="num" style="width:90px">Tổng bài</th>
              <th style="width:110px;text-align:center">Trang SV</th>
              <th style="width:60px"></th>
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
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${theme.border};box-shadow:0 0 6px ${theme.border}" title="Tông màu: ${esc(theme.label)}"></span>
                    <div>
                      <button class="link-btn" data-edit="${esc(c.name)}" style="color:var(--fg);font-weight:600;font-size:14.5px;text-align:left">
                        ${esc(c.name)}
                      </button>
                      ${
                        meta.badge
                          ? `<span class="chip-sm" style="display:inline-block;margin-left:6px;font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg3);color:var(--accent);border:1px solid var(--line2)">${esc(meta.badge)}</span>`
                          : ''
                      }
                      ${
                        meta.dept
                          ? `<div class="faint" style="font-size:12px;margin-top:2px">${esc(meta.dept)}</div>`
                          : ''
                      }
                    </div>
                  </div>
                </td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;max-width:480px">
                    ${
                      c.sets.length
                        ? c.sets
                            .map(
                              (s) =>
                                `<span class="chip-sm" style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;background:var(--bg3);font-size:12px;color:var(--fg2);border:1px solid var(--line2)">${esc(s.title || s.id)}</span>`
                            )
                            .join('')
                        : '<span class="faint" style="font-size:13px">Chưa gán khối nào</span>'
                    }
                  </div>
                </td>
                <td class="num font-mono">${c.setCount}</td>
                <td class="num font-mono">${c.problemCount}</td>
                <td style="text-align:center">
                  <a href="/#/course/${encodeURIComponent(c.name)}" target="_blank" class="btn-ghost" style="font-size:12.5px;padding:3px 8px;text-decoration:none;display:inline-flex;align-items:center;gap:4px">
                    Xem ↗
                  </a>
                </td>
                <td class="row-menu">
                  <button class="dots-btn" data-menu aria-haspopup="menu" aria-label="Thao tác">⋯</button>
                  <div class="menu" role="menu" hidden>
                    <button data-edit="${esc(c.name)}">Sửa khóa học</button>
                    <a href="/#/course/${encodeURIComponent(c.name)}" target="_blank" style="text-decoration:none;color:inherit"><button>Xem trang sinh viên</button></a>
                    <button class="danger" data-del="${esc(c.name)}">Xóa khóa học</button>
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

    // Menu ⋯ dropdown toggle
    if (t.closest('[data-menu]')) {
      const row = t.closest('tr');
      const menu = row.querySelector('.menu');
      const wasHidden = menu.hidden;
      ctx.page.querySelectorAll('.menu').forEach((m) => (m.hidden = true));
      menu.hidden = !wasHidden;
      return;
    }
    if (!t.closest('.menu')) {
      ctx.page.querySelectorAll('.menu').forEach((m) => (m.hidden = true));
    }

    // New Course button
    if (t.closest('[data-new]')) {
      return openCourseEditor({ course: null, allSets, onSaved: load });
    }

    // Edit Course button
    if (t.closest('[data-edit]')) {
      const name = t.closest('[data-edit]').dataset.edit;
      const c = courses.find((x) => x.name === name);
      if (c) openCourseEditor({ course: c, allSets, onSaved: load });
      return;
    }

    // Delete Course button
    if (t.closest('[data-del]')) {
      const name = t.closest('[data-del]').dataset.del;
      const ok = await confirmDialog({
        title: `Xóa khóa học "${name}"?`,
        body: 'Các khối bài tập bên trong sẽ KHÔNG bị xóa mà chỉ được chuyển về trạng thái tự do (không thuộc khóa nào). Sinh viên vẫn xem được các khối nếu khối đang mở.',
        cta: 'Xóa khóa học',
        danger: true,
      });
      if (!ok) return;

      try {
        await api(`/api/admin/courses/${encodeURIComponent(name)}`, { method: 'DELETE' });
        toast(`Đã xóa khóa học "${name}"`);
        await load();
      } catch (err) {
        toast(err.message || 'Lỗi khi xóa khóa học');
      }
    }
  });

  await load();
}