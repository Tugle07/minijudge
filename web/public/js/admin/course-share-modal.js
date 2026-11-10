import { api } from '../api.js';
import { esc, toast } from '../ui.js';

const PALETTE = [
  '#d97706', '#2563eb', '#7c3aed', '#db2777', '#059669',
  '#0891b2', '#4f46e5', '#ca8a04', '#dc2626', '#0d9488'
];

function getUserColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const GENERAL_ACCESS_OPTIONS = [
  {
    id: 'public',
    title: 'Public (Công khai)',
    tag: 'Public',
    tagColor: '#16a34a',
    desc: 'Hiển thị công khai trên trang chủ. Bất kỳ sinh viên nào cũng thấy và học được.',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
  },
  {
    id: 'unlisted',
    title: 'Nội bộ (Chỉ có link)',
    tag: 'Nội bộ',
    tagColor: '#0284c7',
    desc: 'Ẩn khỏi trang chủ. Bất kỳ ai có đường liên kết trực tiếp đều vào học được.',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0 7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
  },
  {
    id: 'restricted',
    title: 'Team (Username cụ thể)',
    tag: 'Team',
    tagColor: '#ea580c',
    desc: 'Chỉ các tài khoản sinh viên được thêm vào danh sách mới có quyền mở khóa học.',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`
  },
  {
    id: 'draft',
    title: 'Nháp (Chỉ Admin)',
    tag: 'Nháp',
    tagColor: '#64748b',
    desc: 'Đang biên soạn. Ẩn hoàn toàn khỏi mọi học viên, chỉ Quản trị viên mới thấy.',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`
  }
];

export function openCourseShareModal({ courseName, meta = {}, onSaved = () => {} }) {
  let visibilityVal = meta.visibility || 'public';
  let allowUsersList = Array.isArray(meta.allowUsers)
    ? [...meta.allowUsers]
    : meta.allowUsers
      ? String(meta.allowUsers).split(/[\r\n,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/admin\.html$/, '').replace(/\/$/, '');
  const directLink = `${origin}${path}/index.html#/course/${encodeURIComponent(courseName)}`;

  // Thông tin chủ sở hữu (Admin)
  let adminName = 'Quản trị viên';
  let adminUsername = 'Admin';

  const sideUserEl = document.querySelector('.side-user');
  if (sideUserEl) {
    const nameEl = sideUserEl.querySelector('[style*="font-weight:600"]');
    const subEl = sideUserEl.querySelector('[style*="color:var(--fg3)"]');
    if (nameEl && nameEl.textContent.trim()) {
      adminName = nameEl.textContent.trim();
    }
    if (subEl && subEl.textContent.trim()) {
      const raw = subEl.textContent.trim().split('·')[0].trim();
      if (raw) adminUsername = raw;
    }
  }

  api('/api/me').then(({ user }) => {
    if (user) {
      adminUsername = user.username || adminUsername;
      adminName = user.fullName || user.username || adminName;
      const nameEl = wrap.querySelector('[data-owner-name]');
      const subEl = wrap.querySelector('[data-owner-sub]');
      if (nameEl) nameEl.textContent = `${adminName} (Bạn)`;
      if (subEl) subEl.textContent = `@${adminUsername}`;
    }
  }).catch(() => {});

  const wrap = document.createElement('div');
  wrap.className = 'dialog-wrap';
  wrap.style.cssText = `
    position: fixed; inset: 0; z-index: 95;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(2px);
    display: grid; place-items: center; padding: 16px;
  `;

  function getOpt(id) {
    return GENERAL_ACCESS_OPTIONS.find((o) => o.id === id) || GENERAL_ACCESS_OPTIONS[0];
  }

  function renderModal() {
    const currentOpt = getOpt(visibilityVal);

    wrap.innerHTML = `
      <style>
        .mj-share-dialog {
          width: min(540px, calc(100vw - 32px));
          background: var(--bg2);
          color: var(--fg);
          border-radius: var(--r-xl, 14px);
          padding: 22px;
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
          animation: mjrise .18s ease-out;
          position: relative;
        }
        @keyframes mjMenuPop {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .mj-icon-btn {
          width: 32px; height: 32px; border-radius: var(--r-sm);
          border: 1px solid var(--line2); background: var(--bg3); color: var(--fg2);
          display: grid; place-items: center; cursor: pointer;
          font-size: 16px; transition: background .12s, color .12s;
        }
        .mj-icon-btn:hover {
          background: var(--bg); color: var(--fg);
        }
        .mj-add-box {
          border: 1px solid var(--line2);
          border-radius: var(--r-sm);
          padding: 4px 6px 4px 12px;
          background: var(--bg);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: border-color .15s, box-shadow .15s;
        }
        .mj-add-box:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .mj-share-list {
          max-height: 190px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 4px;
        }
        .mj-share-list::-webkit-scrollbar {
          width: 5px;
        }
        .mj-share-list::-webkit-scrollbar-thumb {
          background: var(--line2);
          border-radius: 99px;
        }
        .mj-pop-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 100;
          min-width: 330px;
          max-width: 400px;
          background: var(--bg2);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          box-shadow: var(--shadow);
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          animation: mjMenuPop .12s ease-out;
        }
        .mj-pop-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          border-radius: var(--r-sm);
          border: 1px solid transparent;
          background: transparent;
          color: var(--fg);
          text-align: left;
          cursor: pointer;
          transition: background .12s, border-color .12s;
        }
        .mj-pop-item:hover {
          background: var(--bg3);
        }
        .mj-pop-item.active {
          background: var(--accent-soft);
          border-color: color-mix(in srgb, var(--accent) 30%, transparent);
        }
      </style>

      <div class="mj-share-dialog" role="dialog" aria-modal="true">
        
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <div style="width:38px;height:38px;border-radius:var(--r-sm);background:var(--accent-soft);color:var(--accent-text);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
              🔗
            </div>
            <div style="min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <h2 style="margin:0;font-size:16px;font-weight:700;color:var(--fg);line-height:1.3">Chia sẻ & Quyền truy cập</h2>
                <span class="chip-sm" style="font-size:11px;padding:2px 7px;border-radius:var(--r-xs);background:var(--bg3);color:var(--fg2);border:1px solid var(--line2)">Khóa học</span>
              </div>
              <div style="font-size:13px;color:var(--accent-text);font-weight:600;margin-top:2px" class="ellipsis font-mono" title="${esc(courseName)}">${esc(courseName)}</div>
            </div>
          </div>
          <button type="button" class="mj-icon-btn" data-close title="Đóng (Esc)">×</button>
        </div>

        <!-- 1. Thêm thành viên Team (Chỉ định tài khoản) -->
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--fg2);margin-bottom:6px">
            THÊM THÀNH VIÊN VÀO TEAM (CHỈ ĐỊNH TÀI KHOẢN)
          </label>
          <div class="mj-add-box">
            <span style="color:var(--fg3);font-size:14px;flex-shrink:0">👥</span>
            <input type="text" data-user-add-input class="font-mono" placeholder="Nhập username học viên rồi nhấn Enter (vd: student_alice)..." style="flex:1;border:none;background:transparent;outline:none;font-size:13px;color:var(--fg);min-width:0" />
            <button type="button" data-user-add-btn class="btn-dark" style="height:30px;padding:0 12px;font-size:12px;flex-shrink:0">
              + Thêm
            </button>
          </div>
          <div class="faint" style="font-size:11.5px;margin-top:4px">
            Nhập username và nhấn Enter. Có thể dán danh sách cách nhau bằng dấu phẩy, khoảng trắng hoặc xuống dòng.
          </div>
        </div>

        <!-- 2. Danh sách thành viên có quyền truy cập -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:700;color:var(--fg2);text-transform:uppercase;letter-spacing:0.03em">
              Danh sách thành viên (<span data-users-count>${allowUsersList.length + 1}</span>)
            </span>
          </div>

          <div class="mj-share-list" data-users-list>
            <!-- Rendered by renderUserList() -->
          </div>
        </div>

        <!-- 3. Khu vực Quyền truy cập chung (4 quyền: Public, Nội bộ, Team, Nháp) -->
        <div style="background:var(--bg);border:1px solid var(--line2);border-radius:var(--r-md);padding:12px 14px">
          <div style="font-size:11.5px;font-weight:700;color:var(--fg2);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
            Quyền truy cập khóa học
          </div>

          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
            <!-- Icon chế độ -->
            <div data-gen-icon style="width:34px;height:34px;border-radius:var(--r-sm);background:var(--bg2);border:1px solid var(--line);display:grid;place-items:center;color:var(--accent-text);flex-shrink:0;margin-top:2px">
              ${currentOpt.iconSvg}
            </div>

            <!-- Custom trigger + description -->
            <div style="flex:1;min-width:0;position:relative">
              <div style="position:relative;display:inline-block">
                <button type="button" class="btn-line" data-trigger-gen style="height:32px;padding:0 10px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer">
                  <span data-gen-label>${currentOpt.title}</span>
                  <span style="font-size:10px;color:var(--fg3)">▾</span>
                </button>

                <!-- Popover Menu 4 quyền rõ ràng -->
                <div class="mj-pop-menu" data-gen-popover style="display:none">
                  ${GENERAL_ACCESS_OPTIONS.map((opt) => `
                    <button type="button" class="mj-pop-item ${visibilityVal === opt.id ? 'active' : ''}" data-choose-vis="${opt.id}">
                      <div style="width:20px;height:20px;display:grid;place-items:center;color:${visibilityVal === opt.id ? 'var(--accent)' : 'var(--fg2)'};flex-shrink:0;margin-top:2px">
                        ${opt.iconSvg}
                      </div>
                      <div style="flex:1;min-width:0">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                          <span style="font-size:13px;font-weight:${visibilityVal === opt.id ? '700' : '600'};color:var(--fg)">${opt.title}</span>
                          <span class="chip-sm" style="font-size:10px;padding:1px 5px;border-radius:3px;background:color-mix(in srgb, ${opt.tagColor} 18%, transparent);color:${opt.tagColor}">${opt.tag}</span>
                        </div>
                        <div style="font-size:11.5px;color:var(--fg3);line-height:1.4;margin-top:2px">${opt.desc}</div>
                      </div>
                    </button>
                  `).join('')}
                </div>
              </div>

              <div data-gen-desc class="faint" style="font-size:12px;line-height:1.4;margin-top:4px">
                ${currentOpt.desc}
              </div>
            </div>

            <!-- Role badge -->
            <div style="flex-shrink:0;margin-top:4px">
              <span class="chip-sm" style="font-size:11.5px;padding:2px 8px;border-radius:var(--r-xs);background:var(--bg2);border:1px solid var(--line2);color:var(--fg2)">Học viên</span>
            </div>
          </div>
        </div>

        <!-- 4. Footer Actions -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:10px;border-top:1px solid var(--line)">
          <div style="display:flex;align-items:center;gap:8px">
            <button type="button" class="btn-line" data-copy-link style="height:36px;padding:0 14px;font-size:13px;display:inline-flex;align-items:center;gap:6px;font-weight:600;white-space:nowrap;flex-shrink:0">
              <span data-copy-icon>📋</span>
              <span data-copy-text>Sao chép liên kết</span>
            </button>
            <a href="${directLink}" target="_blank" rel="noopener noreferrer" class="btn-ghost" style="height:36px;padding:0 10px;font-size:12.5px;display:inline-flex;align-items:center;gap:4px;text-decoration:none;border-radius:var(--r-sm)" title="Mở trang khóa học phía học viên trong tab mới">
              <span>Xem thử</span>
              <span style="font-size:10px">↗</span>
            </a>
          </div>
          
          <div style="display:flex;gap:8px;align-items:center">
            <button type="button" class="btn-line" data-close style="height:36px;padding:0 16px;font-size:13.5px">Hủy</button>
            <button type="button" class="btn-dark" data-save-done style="height:36px;padding:0 20px;font-size:13.5px;font-weight:600">
              Lưu thay đổi
            </button>
          </div>
        </div>

      </div>
    `;
  }

  function renderUserList() {
    const listEl = wrap.querySelector('[data-users-list]');
    const countEl = wrap.querySelector('[data-users-count]');
    if (countEl) countEl.textContent = allowUsersList.length + 1;
    if (!listEl) return;

    let html = `
      <!-- Dòng Quản trị viên (Chủ sở hữu) -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:var(--r-sm);background:var(--bg3);border:1px solid var(--line)">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div style="width:30px;height:30px;border-radius:50%;background:#e65100;color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700;flex-shrink:0">
            ${esc(adminUsername.charAt(0).toUpperCase())}
          </div>
          <div style="min-width:0">
            <div data-owner-name style="font-size:13.5px;font-weight:600;color:var(--fg);line-height:1.2" class="ellipsis">${esc(adminName)} (Bạn)</div>
            <div data-owner-sub style="font-size:11.5px;color:var(--fg3);line-height:1.2" class="ellipsis font-mono">@${esc(adminUsername)}</div>
          </div>
        </div>
        <span class="tag-admin" style="padding:2px 8px;border-radius:var(--r-xs);font-size:11px;color:var(--fg2);background:var(--bg2);border:1px solid var(--line2)">Quản trị viên</span>
      </div>
    `;

    if (allowUsersList.length === 0) {
      html += `
        <div class="faint" style="font-size:12px;padding:8px;font-style:italic;text-align:center">
          Chưa có tài khoản nào được thêm vào Team.
        </div>
      `;
    } else {
      allowUsersList.forEach((u) => {
        html += `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:var(--r-sm);background:var(--bg2);border:1px solid var(--line2)">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div style="width:30px;height:30px;border-radius:50%;background:${getUserColor(u)};color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0">
                ${esc(u.slice(0, 2).toUpperCase())}
              </div>
              <div style="min-width:0">
                <div class="font-mono" style="font-size:13.5px;font-weight:600;color:var(--fg);line-height:1.2" class="ellipsis">${esc(u)}</div>
                <div style="font-size:11px;color:var(--fg3);line-height:1.2" class="ellipsis">Thành viên Team</div>
              </div>
            </div>
            
            <div style="position:relative;display:inline-block;flex-shrink:0">
              <button type="button" class="btn-line" data-trigger-user-menu="${esc(u)}" style="height:28px;padding:0 8px;font-size:12px;display:inline-flex;align-items:center;gap:4px">
                <span>Người xem</span>
                <span style="font-size:9px;color:var(--fg3)">▾</span>
              </button>

              <!-- Popover xóa quyền -->
              <div class="mj-pop-menu" data-user-popover="${esc(u)}" style="display:none;right:0;left:auto;min-width:160px">
                <div style="padding:6px 8px;font-size:12px;font-weight:600;color:var(--accent-text);display:flex;align-items:center;justify-content:space-between">
                  <span>Người xem</span>
                  <span>✓</span>
                </div>
                <div style="height:1px;background:var(--line);margin:2px 0"></div>
                <button type="button" data-remove-user="${esc(u)}" class="mj-pop-item" style="color:var(--wa);font-size:12px;width:100%">
                  <span>🗑️</span>
                  <span>Xóa khỏi Team</span>
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }

    listEl.innerHTML = html;
  }

  function updateGeneralAccessUI() {
    const currentOpt = getOpt(visibilityVal);
    const iconEl = wrap.querySelector('[data-gen-icon]');
    const descEl = wrap.querySelector('[data-gen-desc]');
    const labelEl = wrap.querySelector('[data-gen-label]');
    if (iconEl) iconEl.innerHTML = currentOpt.iconSvg;
    if (descEl) descEl.textContent = currentOpt.desc;
    if (labelEl) labelEl.textContent = currentOpt.title;

    wrap.querySelectorAll('[data-choose-vis]').forEach((btn) => {
      const isSelected = btn.getAttribute('data-choose-vis') === visibilityVal;
      btn.classList.toggle('active', isSelected);
    });
  }

  function addUsersFromInput() {
    const input = wrap.querySelector('[data-user-add-input]');
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    const tokens = raw.split(/[\r\n,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    let addedCount = 0;
    for (const u of tokens) {
      if (!allowUsersList.includes(u)) {
        allowUsersList.push(u);
        addedCount++;
      }
    }
    input.value = '';
    if (addedCount > 0) {
      if (visibilityVal !== 'restricted') {
        visibilityVal = 'restricted';
        updateGeneralAccessUI();
      }
      renderUserList();
      toast(`Đã thêm ${addedCount} tài khoản vào Team`);
    }
  }

  function closeAllPopovers() {
    wrap.querySelectorAll('.mj-pop-menu').forEach((p) => (p.style.display = 'none'));
  }

  renderModal();
  renderUserList();

  const close = () => {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      const openPop = wrap.querySelector('.mj-pop-menu[style*="display: flex"], .mj-pop-menu[style*="display: block"]');
      if (openPop) {
        closeAllPopovers();
      } else {
        close();
      }
    }
  };
  document.addEventListener('keydown', onKey);

  wrap.addEventListener('click', async (e) => {
    const t = e.target;

    // Click ngoài menu thì đóng menu
    if (!t.closest('.mj-pop-menu') && !t.closest('[data-trigger-gen]') && !t.closest('[data-trigger-user-menu]')) {
      closeAllPopovers();
    }

    // Đóng popup
    if (t.closest('[data-close]') || t === wrap) {
      close();
      return;
    }

    // Nút + Thêm tài khoản
    if (t.closest('[data-user-add-btn]')) {
      addUsersFromInput();
      return;
    }

    // Mở / Đóng menu Quyền truy cập chung
    if (t.closest('[data-trigger-gen]')) {
      e.stopPropagation();
      const popover = wrap.querySelector('[data-gen-popover]');
      const isOpen = popover && popover.style.display !== 'none';
      closeAllPopovers();
      if (!isOpen && popover) {
        popover.style.display = 'flex';
      }
      return;
    }

    // Chọn chế độ truy cập chung
    if (t.closest('[data-choose-vis]')) {
      const chosen = t.closest('[data-choose-vis]').getAttribute('data-choose-vis');
      visibilityVal = chosen;
      updateGeneralAccessUI();
      closeAllPopovers();
      return;
    }

    // Mở menu của từng user
    if (t.closest('[data-trigger-user-menu]')) {
      e.stopPropagation();
      const trigger = t.closest('[data-trigger-user-menu]');
      const username = trigger.getAttribute('data-trigger-user-menu');
      const popover = wrap.querySelector(`[data-user-popover="${username}"]`);
      const isOpen = popover && popover.style.display !== 'none';
      closeAllPopovers();
      if (!isOpen && popover) {
        popover.style.display = 'flex';
      }
      return;
    }

    // Xóa quyền học viên
    if (t.closest('[data-remove-user]')) {
      const username = t.closest('[data-remove-user]').getAttribute('data-remove-user');
      const idx = allowUsersList.indexOf(username);
      if (idx !== -1) {
        allowUsersList.splice(idx, 1);
        renderUserList();
        toast(`Đã xóa tài khoản @${username} khỏi Team`);
      }
      closeAllPopovers();
      return;
    }

    // Sao chép link trực tiếp
    if (t.closest('[data-copy-link]')) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(directLink);
        } else {
          const tempInp = document.createElement('input');
          tempInp.value = directLink;
          document.body.appendChild(tempInp);
          tempInp.select();
          document.execCommand('copy');
          tempInp.remove();
        }
        toast('Đã sao chép liên kết khóa học vào clipboard!');
        const copyText = wrap.querySelector('[data-copy-text]');
        const copyIcon = wrap.querySelector('[data-copy-icon]');
        if (copyText && copyIcon) {
          copyText.textContent = 'Đã sao chép!';
          copyIcon.textContent = '✓';
          setTimeout(() => {
            copyText.textContent = 'Sao chép liên kết';
            copyIcon.textContent = '📋';
          }, 2000);
        }
      } catch (err) {
        toast('Hãy dùng phím Ctrl+C để sao chép link');
      }
      return;
    }

    // Lưu thay đổi
    if (t.closest('[data-save-done]')) {
      const doneBtn = t.closest('[data-save-done]');
      doneBtn.disabled = true;
      doneBtn.textContent = 'Đang lưu…';

      try {
        await api('/api/admin/courses/' + encodeURIComponent(courseName), {
          method: 'PUT',
          body: {
            visibility: visibilityVal,
            allowUsers: allowUsersList,
          },
        });
        toast('Đã cập nhật quyền truy cập khóa học!');
        close();
        onSaved({ visibility: visibilityVal, allowUsers: allowUsersList });
      } catch (err) {
        toast(err.message || 'Lỗi khi lưu quyền truy cập', 'var(--wa)');
        doneBtn.disabled = false;
        doneBtn.textContent = 'Lưu thay đổi';
      }
    }
  });

  // Enter trong ô thêm user
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-user-add-input]')) {
      e.preventDefault();
      addUsersFromInput();
    }
  });

  document.body.append(wrap);
  const inputEl = wrap.querySelector('[data-user-add-input]');
  if (inputEl) inputEl.focus();
}
