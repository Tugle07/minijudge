import { api } from '../api.js';
import { readDraft as draftGet, saveDraft as draftSet } from '../drafts.js';
import { mountEditor } from '../editor.js';
import { badge, esc, fmtClock, fmtWhen, fmtWorkTime, langBadge, renderAvatar, renderMarkdown, statLine, toast, verdictLabel } from '../ui.js';
import { compileErrorsHtml, runResultHtml } from './problem-result.js';
import { fmtCountdown, fmtDuration, fmtTime } from './contests.js';

/* Phòng thi. Trình duyệt không khóa được cả máy, nên phòng thi làm 3 việc: bắt buộc toàn màn hình +
 * một tab, ghi lại mọi lần rời bài (chuyển tab, thoát toàn màn hình, dán code từ ngoài) để giám thị xem,
 * và khóa phần luyện tập trong giờ thi. Kết hợp với giám thị trong phòng và kiểm tra code giống nhau sau thi. */

const TEMPLATES = {
  c: '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n',
  cpp14: '#include <iostream>\n\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}\n',
  cpp: '#include <iostream>\n\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}\n',
  py: '# Đọc dữ liệu từ sys.stdin và in ra màn hình\nimport sys\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n',
  pypy3: '# Đọc dữ liệu từ sys.stdin và in ra màn hình\nimport sys\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n',
};
const LANG_LABELS = {
  c: 'C (C11)',
  cpp14: 'C++ (C++14)',
  cpp: 'C++ (C++17)',
  py: 'Python (Python 3)',
  pypy3: 'Python (PyPy 3)',
};
const HEARTBEAT_MS = 10_000;
const POLL_MS = 800;
const PASTE_LIMIT = 30;

const readDraft = (cid, label, lang = 'c') => draftGet(`exam-${cid}-${label}-${lang}`) || (lang === 'c' ? draftGet(`exam-${cid}-${label}`) : null);
const saveDraft = (cid, label, lang, code) => draftSet(`exam-${cid}-${label}-${lang}`, code);
const getLastLang = (cid, label) => draftGet(`exam-lang-${cid}-${label}`) || 'c';
const setLastLang = (cid, label, lang) => draftSet(`exam-lang-${cid}-${label}`, lang);
const pad = (n) => String(n).padStart(2, '0');
const isFullscreen = () => Boolean(document.fullscreenElement);

/* 3 tiếng bíp khi thí sinh rời bài thi (Web Audio, không cần file âm thanh).
 * Trình duyệt chỉ cho phát âm thanh sau một lần bấm của người dùng: mở khóa ở nút "Vào phòng thi". */
let audioCtx = null;
const unlockAudio = () => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
};
let lastBeep = 0;
function beep3() {
  if (!audioCtx || Date.now() - lastBeep < 1500) return;
  lastBeep = Date.now();
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime + 0.02;
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = t0 + i * 0.32;
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      gain.gain.setValueAtTime(0.22, t + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    }
  } catch {}
}
const isExtended = () => window.screen?.isExtended === true;

/* Một số trình duyệt nhúng không bao giờ trả lời requestFullscreen: chờ tối đa 2 giây để nút không bị treo. */
async function enterFullscreen() {
  if (isFullscreen()) return true;
  try {
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000));
    const r = await Promise.race([document.documentElement.requestFullscreen({ navigationUI: 'hide' }), timeout]);
    return r !== 'timeout' && isFullscreen();
  } catch {
    return false;
  }
}

const scoreText = (score, points) => (score == null ? `–/${points}` : `${Number(score.toFixed(2))}/${points}`);

export async function render(ctx) {
  const cid = Number(String(ctx.arg || '').split('?')[0]);
  const state = { info: null, offset: 0, label: null, problem: null, subs: [], alive: true, timers: [], blocked: null, ending: false, preview: false };
  let currentBoard = null;
  let boardSearchQuery = '';
  const cleanups = [];
  const later = (fn, ms) => state.timers.push(setTimeout(fn, ms));
  const now = () => Date.now() + state.offset;

  async function loadInfo() {
    try {
      state.info = await api(`/api/contests/${cid}`);
      state.offset = state.info.now - Date.now();
      return state.info;
    } catch (err) {
      const isRestricted = err.status === 403 || err.data?.code === 'restricted';
      const msg = isRestricted
        ? 'Cuộc thi này được đặt ở chế độ riêng tư, chỉ thí sinh được chỉ định mới có thể tham gia.'
        : (err.message || 'Không tìm thấy cuộc thi');
      ctx.view.innerHTML = `
        <main class="page" style="max-width:720px;padding-top:48px">
          <div class="empty-box" style="padding:40px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px">
            <span style="font-size:42px">${isRestricted ? '🔒' : '🔍'}</span>
            <b style="font-size:16px">${esc(msg)}</b>
            <button class="btn" data-go="#/contests" style="margin-top:8px">Về danh sách cuộc thi</button>
          </div>
        </main>`;
      return null;
    }
  }
  const report = (type, detail = '') => (state.preview ? Promise.resolve() : api(`/api/contests/${cid}/events`, { method: 'POST', body: { type, detail: String(detail) } }).catch(() => {}));

  const loaded = await loadInfo();
  if (loaded) await route();

  async function route() {
    const { contest } = state.info;
    const isAdmin = ctx.user?.role === 'admin';
    const isPreviewParam = (ctx.query?.get('preview') === '1') || (new URLSearchParams(window.location.hash.split('?')[1] || '').get('preview') === '1');

    if (isAdmin && isPreviewParam) {
      return exam(true);
    }
    if ((contest.phase === 'running' || (isAdmin && contest.phase === 'draft')) && contest.joined && !contest.finished) {
      return state.info.otherSession ? lobby('other') : lobby('resume');
    }
    if ((contest.phase === 'running' || (isAdmin && contest.phase === 'draft')) && !contest.joined) {
      return lobby('join');
    }
    if (contest.phase === 'upcoming' || contest.phase === 'draft') return lobby('wait');
    return summary();
  }

  /* ---------- Sảnh chờ: luật thi, kiểm tra máy, nhập mã phòng ---------- */
  function lobby(mode) {
    const { contest } = state.info;
    const touchOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
    const checks = [
      ...(contest.desktopOnly !== false ? [['Đang dùng máy tính (không phải điện thoại / máy tính bảng)', !touchOnly, 'Cuộc thi này chỉ làm trên máy tính của phòng thi']] : []),
      ['Trình duyệt hỗ trợ toàn màn hình', Boolean(document.documentElement.requestFullscreen)],
      ['Chỉ dùng một màn hình', !isExtended(), 'Rút màn hình phụ / máy chiếu trước khi vào thi'],
    ];

    const sDate = new Date(contest.startAt);
    const eDate = new Date(contest.endAt);
    const timeRange = `${pad(sDate.getHours())}:${pad(sDate.getMinutes())} – ${pad(eDate.getHours())}:${pad(eDate.getMinutes())}`;
    const dateStr = `${pad(sDate.getDate())}/${pad(sDate.getMonth() + 1)}/${sDate.getFullYear()}`;
    const durationStr = fmtDuration(contest.endAt - contest.startAt);

    ctx.view.innerHTML = `
      <main class="page exam-lobby">
        <button class="link-btn" data-go="#/contests" style="align-self:flex-start">‹ Danh sách cuộc thi</button>
        <div class="exam-lobby-card">
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="pill" style="background:var(--accent);color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;padding:2px 8px;">Kỳ thi chính thức</span>
              ${contest.phase === 'draft' ? '<span class="pill" style="background:var(--tle);color:#fff;font-size:12px;font-weight:600;">Chế độ nháp (Admin)</span>' : ''}
            </div>
            <h1 class="page-title" style="margin:4px 0 0;font-size:26px;">${esc(contest.title)}</h1>
          </div>

          <!-- Bảng tóm tắt thông số kỳ thi -->
          <div class="exam-info-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;padding:16px;background:var(--bg3);border-radius:var(--r-md);border:1px solid var(--line2);">
            <div style="display:flex;flex-direction:column;gap:3px;">
              <span class="faint" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Ngày thi</span>
              <b class="mono" style="font-size:15px;color:var(--fg);">${dateStr}</b>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <span class="faint" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Khung giờ thi</span>
              <b class="mono" style="font-size:15px;color:var(--accent);">${timeRange}</b>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <span class="faint" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Thời lượng</span>
              <b class="mono" style="font-size:15px;color:var(--fg);">${durationStr}</b>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <span class="faint" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Số lượng bài</span>
              <b class="mono" style="font-size:15px;color:var(--fg);">${contest.problemCount} bài lập trình</b>
            </div>
          </div>

          ${contest.description ? `<div class="statement" style="font-size:14.5px;padding:12px 14px;background:var(--bg3);border-radius:var(--r-md);border-left:4px solid var(--accent);">${renderMarkdown(contest.description)}</div>` : ''}

          <!-- Nội quy phòng thi cơ bản -->
          <div class="exam-rules" style="padding:16px 18px;border-radius:var(--r-md);background:var(--bg3);font-size:14px;line-height:1.6;border:1px solid var(--line2);">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:12px;">
              <b style="font-size:15px;color:var(--fg);display:flex;align-items:center;gap:8px;">
                <span>📋</span> NỘI QUY PHÒNG THI
              </b>
              <span class="pill" style="background:color-mix(in oklch, var(--wa) 16%, transparent);color:var(--wa);font-size:11.5px;font-weight:700;">BẮT BUỘC</span>
            </div>
            
            <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;color:var(--fg2);">
              <li>Thí sinh phải làm bài <b>độc lập và nghiêm túc</b>, tuyệt đối tuân thủ hướng dẫn của cán bộ coi thi.</li>
              <li>Nghiêm cấm mọi hành vi gian lận, trao đổi bài hoặc sử dụng tài liệu, thiết bị trái quy định.</li>
              <li>Chỉ làm bài trên máy tính được chỉ định trong phòng thi; không tự ý thoát hoặc can thiệp vào hệ thống thi.</li>
              <li>Hệ thống tự động giám sát toàn bộ tiến trình thi. Mọi vi phạm sẽ bị xử lý kỷ luật theo Quy chế đào tạo.</li>
            </ul>
          </div>

          <!-- Khối Cam kết quy định phòng thi -->
          <div class="exam-agreement-card" style="padding:15px 18px;background:color-mix(in oklch, var(--accent) 8%, var(--bg2));border:1.5px solid color-mix(in oklch, var(--accent) 35%, var(--line2));border-radius:var(--r-md);">
            <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;font-size:14px;line-height:1.5;user-select:none;">
              <input type="checkbox" data-agree style="width:19px;height:19px;margin-top:2px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;" />
              <span style="font-weight:600;color:var(--fg);">
                Tôi đã đọc, hiểu rõ nội quy phòng thi và <b style="color:var(--accent);">cam kết tự giác, nghiêm túc thực hiện bài thi</b>. Tôi chịu hoàn toàn trách nhiệm nếu vi phạm quy chế.
              </span>
            </label>
          </div>

          ${ctx.user?.role === 'admin' ? `
            <div style="padding:14px 18px;border-radius:var(--r-md);background:var(--bg3);border:1.5px dashed var(--accent);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:10px 0;">
              <div>
                <b style="color:var(--accent);font-size:14.5px;display:flex;align-items:center;gap:6px;"><span>👁️</span> Chế độ xem trước phòng thi (Admin)</b>
                <div class="faint" style="font-size:13px;margin-top:2px;">Xem trước giao diện làm bài, đọc đề, subtask và chạy thử code như thí sinh (không tính điểm, không khóa màn hình).</div>
              </div>
              <button type="button" class="btn-primary" data-admin-preview style="display:inline-flex;align-items:center;gap:6px;font-weight:600;padding:8px 16px;white-space:nowrap;">Vào xem trước phòng thi</button>
            </div>` : ''}
          <div data-lobby-action></div>
          <div class="alert" data-error hidden></div>
        </div>
      </main>`;
    const box = ctx.view.querySelector('[data-lobby-action]');
    const agreeCheck = ctx.view.querySelector('[data-agree]');
    const showError = (msg) => {
      const el = ctx.view.querySelector('[data-error]');
      el.textContent = msg;
      el.hidden = !msg;
    };

    ctx.view.querySelector('[data-admin-preview]')?.addEventListener('click', (e) => {
      e.preventDefault();
      exam(true);
    });

    if (mode === 'wait') {
      const draw = () => {
        const left = contest.startAt - now();
        box.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:4px;">
            <div class="exam-countdown" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:20px;border-radius:var(--r-md);background:var(--bg3);border:1px solid var(--line2);">
              <span class="faint" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Cuộc thi bắt đầu sau</span>
              <b class="mono" style="font-size:36px;color:var(--accent);">${fmtCountdown(left)}</b>
            </div>
            <p class="faint" style="margin:0;font-size:13.5px;text-align:center;" data-wait-hint>
              Vui lòng tích ô cam kết ở trên. Khi hết thời gian đếm ngược, ô nhập mã phòng thi sẽ tự động mở để bạn vào thi.
            </p>
          </div>`;
        if (left <= 0 && contest.phase !== 'draft') loadInfo().then(route).catch(() => {});
        else if (state.alive) later(draw, 1000);
      };
      draw();
      agreeCheck?.addEventListener('change', () => {
        const hint = box.querySelector('[data-wait-hint]');
        if (hint) {
          if (agreeCheck.checked) {
            hint.style.color = 'var(--ac)';
            hint.innerHTML = '✓ Đã xác nhận cam kết. Khi hết giờ đếm ngược, bạn có thể nhập mã phòng thi ngay.';
          } else {
            hint.style.color = '';
            hint.innerHTML = 'Vui lòng tích ô cam kết ở trên. Khi hết thời gian đếm ngược, ô nhập mã phòng thi sẽ tự động mở để bạn vào thi.';
          }
        }
      });
      return;
    }

    if (!contest.allowed) {
      box.innerHTML = '<p class="bad-text">Tài khoản của bạn không có trong danh sách thí sinh. Báo giám thị nếu đây là nhầm lẫn.</p>';
      return;
    }

    const other = mode === 'other';
    const isJoin = mode === 'join';
    box.innerHTML = `
      <form class="exam-join" data-join style="display:flex;flex-direction:column;gap:14px;margin-top:4px;">
        ${contest.needCode ? `
          <div data-code-section style="display:flex;flex-direction:column;gap:6px;opacity:0.45;pointer-events:none;transition:opacity 0.2s ease;">
            <label class="field" style="margin:0;">
              <span style="font-weight:600;font-size:14.5px;">Mã phòng thi <span class="faint" style="font-weight:normal;font-size:13px;">(giám thị công bố tại phòng thi)</span></span>
              <input class="input mono" data-code autocomplete="off" placeholder="NHẬP MÃ PHÒNG THI" style="text-transform:uppercase;font-size:16px;letter-spacing:0.08em;font-weight:700;height:46px;" disabled required />
            </label>
            <span data-code-hint style="font-size:13px;color:var(--wa);display:flex;align-items:center;gap:6px;">
              ⚠️ Bạn cần tích chọn ô cam kết quy định ở trên để mở khóa ô nhập mã phòng thi.
            </span>
          </div>
        ` : ''}

        ${other ? '<p class="bad-text" style="margin:0">Bài thi của bạn đang mở ở một thiết bị/tab khác. Đóng nơi đó rồi bấm Tiếp tục, hoặc báo giám thị mở khóa.</p>' : ''}

        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn-primary" type="submit" data-join-btn style="height:46px;font-size:15px;font-weight:600;" disabled>
            ${isJoin ? (contest.needCode ? 'Xác nhận mã &amp; Vào phòng thi (Toàn màn hình)' : 'Vào phòng thi (bật toàn màn hình)') : mode === 'resume' ? 'Tiếp tục làm bài' : 'Vào phòng thi (Chế độ xem trước Admin)'}
          </button>
          ${mode === 'resume' ? `
            <button class="btn-line" type="button" data-finish-from-lobby style="height:44px;font-size:14px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px">
              🏆 Hoàn tất bài thi &amp; Xem bảng xếp hạng
            </button>
          ` : ''}
        </div>

        ${contest.phase === 'draft' ? '<p class="faint" style="margin:0;font-size:13px;text-align:center;">🛠️ Cuộc thi đang ở chế độ nháp (chỉ Admin thấy). Bạn có thể vào xem trước đề và giao diện làm bài.</p>' : ''}
      </form>`;

    const codeSection = box.querySelector('[data-code-section]');
    const codeInput = box.querySelector('[data-code]');
    const codeHint = box.querySelector('[data-code-hint]');
    const joinBtn = box.querySelector('[data-join-btn]');

    agreeCheck?.addEventListener('change', () => {
      const ok = agreeCheck.checked;
      if (codeSection) {
        codeSection.style.opacity = ok ? '1' : '0.45';
        codeSection.style.pointerEvents = ok ? 'auto' : 'none';
      }
      if (codeInput) {
        codeInput.disabled = !ok;
        if (ok) setTimeout(() => codeInput.focus(), 50);
      }
      if (codeHint) {
        if (ok) {
          codeHint.style.color = 'var(--ac)';
          codeHint.innerHTML = '✓ Đã xác nhận cam kết. Hãy nhập mã phòng thi do giám thị đọc để bắt đầu.';
        } else {
          codeHint.style.color = 'var(--wa)';
          codeHint.innerHTML = '⚠️ Bạn cần tích chọn ô cam kết quy định ở trên để mở ô nhập mã phòng thi.';
        }
      }
      if (joinBtn) {
        joinBtn.disabled = !ok;
      }
    });

    box.querySelector('[data-join]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      if (!agreeCheck?.checked) {
        return showError('Bạn cần tích chọn cam kết thực hiện đúng quy chế thi trước khi vào phòng.');
      }
      if (contest.blockMultiScreen && isExtended()) return showError('Máy đang nối nhiều màn hình. Rút màn hình phụ rồi vào lại.');
      unlockAudio();
      /* Xóa clipboard khi bắt đầu làm bài: code copy sẵn từ trước không còn để dán. Cần lúc người dùng vừa bấm nút. */
      navigator.clipboard?.writeText('').catch(() => {});
      const fs = await enterFullscreen();
      try {
        await api(`/api/contests/${cid}/join`, { method: 'POST', body: { code: box.querySelector('[data-code]')?.value ?? '', extended: isExtended(), touch: touchOnly } });
      } catch (err) {
        if (isFullscreen()) document.exitFullscreen().catch(() => {});
        return showError(err.message);
      }
      if (!fs) toast('Trình duyệt không bật được toàn màn hình — giám thị sẽ thấy cảnh báo');
      await loadInfo();
      exam();
    });

    box.querySelector('[data-finish-from-lobby]')?.addEventListener('click', async () => {
      if (confirm('Bạn có chắc chắn muốn nộp bài kết thúc và xem bảng xếp hạng? Sau khi kết thúc, bạn sẽ không thể nộp bài thêm.')) {
        try {
          await api(`/api/contests/${cid}/finish`, { method: 'POST' });
          await loadInfo();
          summary();
        } catch (err) {
          showError(err.message);
        }
      }
    });
  }

  /* ---------- Phòng thi ---------- */
  async function exam(isPreview = false) {
    state.preview = isPreview;
    const { contest, problems } = state.info;
    const allowedLangs = Array.isArray(state.info.allowedLangs) && state.info.allowedLangs.length ? state.info.allowedLangs : ['c'];
    state.allowedLangs = allowedLangs;
    state.label = state.label || problems[0]?.label;
    state.lang = getLastLang(cid, state.label) || 'c';
    if (!allowedLangs.includes(state.lang)) state.lang = allowedLangs[0];
    ctx.view.innerHTML = `
      ${isPreview ? `
        <div class="exam-preview-bar" style="background:#0f172a;color:#f1f5f9;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;font-size:13px;position:sticky;top:0;z-index:9999;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="pill" style="background:var(--accent);color:#fff;font-size:11.5px;font-weight:700;padding:2px 8px;">XEM TRƯỚC (ADMIN)</span>
            <span>Bạn đang xem trước giao diện thi của thí sinh. Đề bài, test mẫu và biên dịch chạy thử bình thường · Không khóa màn hình, không tính điểm.</span>
          </div>
          <button class="btn-line" data-exit-preview style="color:#fff;border-color:#64748b;height:28px;font-size:12px;padding:0 12px;display:inline-flex;align-items:center;">‹ Thoát xem trước</button>
        </div>` : ''}
      <div class="exam" data-exam>
        <header class="exam-bar">
          <b class="exam-title ellipsis">${esc(contest.title)}${isPreview ? ' <span class="pill" style="background:var(--accent);color:#fff;font-size:11px;margin-left:6px">Xem trước</span>' : ''}</b>
          <div class="spacer"></div>
          <span class="exam-guard" data-guard title="Trạng thái giám sát"></span>
          <span class="exam-vcount" data-vcount hidden></span>
          <span class="exam-clock mono" data-clock></span>
          ${isPreview ? '<button class="btn-line" data-exit-preview style="height:32px;font-size:12.5px;">Thoát xem trước</button>' : '<button class="btn exam-finish" data-finish>Nộp bài &amp; kết thúc</button>'}
        </header>
        <nav class="exam-rail" data-tabs aria-label="Danh sách bài thi"></nav>
        <div class="exam-notice" data-notice role="alert" aria-live="assertive" hidden></div>
        <div class="exam-body">
          <section class="exam-left" data-statement><div class="editor-loading">Đang tải đề…</div></section>
          <div class="exam-sep" data-sep role="separator" aria-orientation="vertical" aria-label="Kéo để chỉnh độ rộng" tabindex="0"></div>
          <section class="exam-right">
            <div class="toolbar">
              ${allowedLangs.length > 1
                ? `<select class="lang-select" data-lang aria-label="Ngôn ngữ lập trình" style="background:var(--bg3);color:var(--fg);border:1px solid var(--line);border-radius:var(--r-sm);font-weight:600;font-size:13px;padding:4px 8px;cursor:pointer;">
                    ${allowedLangs.map((l) => `<option value="${l}" ${state.lang === l ? 'selected' : ''}>${LANG_LABELS[l] || l}</option>`).join('')}
                  </select>`
                : `<span class="lang-chip">C11 · gcc -O2</span>`
              }
              <span class="faint" style="font-size:12.5px" data-saved>Nháp tự lưu trên máy này</span>
              <div class="spacer"></div>
              <button class="btn-submit" data-submit title="Ctrl + Enter">Nộp bài <span class="kbd">Ctrl Enter</span></button>
            </div>
            <div class="editor" data-editor><div class="editor-loading">Đang tải trình soạn code…</div></div>
            <div class="editor-status">
              <span data-cursor>Dòng 1, cột 1</span>
              <span class="diag-pills" aria-label="Kết quả kiểm tra cú pháp">
                <span class="diag-pill err" data-diag-err title="Số lỗi cú pháp"><span class="diag-i" aria-hidden="true">⊘</span><b data-diag-err-n>0</b></span>
                <span class="diag-pill warn" data-diag-warn title="Số cảnh báo"><span class="diag-i" aria-hidden="true">△</span><b data-diag-warn-n>0</b></span>
              </span>
            </div>
            <div class="editor-sep" data-editor-sep role="separator" aria-orientation="horizontal" aria-label="Kéo xuống để mở rộng khung code" tabindex="0"></div>
            <div class="exam-io">
              <div class="io-col">
                <div class="io-head"><b>inp.txt</b><span class="io-tools" data-fill-tools></span></div>
                <textarea data-run-input spellcheck="false" placeholder="Nhập dữ liệu rồi bấm Chạy thử"></textarea>
              </div>
              <div class="io-col">
                <div class="io-head"><b>out.txt</b><button class="btn-dark io-run" data-run>Chạy thử</button></div>
                <div class="io-output" data-run-result></div>
              </div>
            </div>
            <div class="exam-latest" data-subs></div>
          </section>
        </div>
        <div class="exam-overlay" data-overlay hidden></div>
        <div class="exam-overlay" data-confirm hidden></div>
      </div>`;
    document.body.classList.add('exam-mode');
    const $ = (s) => ctx.view.querySelector(s);

    /* Kéo thanh giữa đề bài và trình soạn code để chia màn hình theo ý. Lưu lại cho lần sau. */
    const sep = $('[data-sep]');
    const body = ctx.view.querySelector('.exam-body');
    const initial = parseFloat(localStorage.getItem('mj-exam-split')) || 46;
    body.style.setProperty('--left-w', Math.max(25, Math.min(70, initial)) + '%');
    sep.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      sep.setPointerCapture(ev.pointerId);
      sep.classList.add('dragging');
      const rect = body.getBoundingClientRect();
      const onMove = (e) => {
        const pct = Math.max(25, Math.min(70, ((e.clientX - rect.left) / rect.width) * 100));
        body.style.setProperty('--left-w', pct.toFixed(2) + '%');
      };
      const onUp = () => {
        sep.classList.remove('dragging');
        sep.removeEventListener('pointermove', onMove);
        sep.removeEventListener('pointerup', onUp);
        try { localStorage.setItem('mj-exam-split', parseFloat(body.style.getPropertyValue('--left-w')) || 46); } catch {}
      };
      sep.addEventListener('pointermove', onMove);
      sep.addEventListener('pointerup', onUp);
    });

    /* Thanh ngang dưới khung code: kéo xuống để làm editor cao hơn. */
    const eSep = $('[data-editor-sep]');
    const right = ctx.view.querySelector('.exam-right');
    const savedH = parseFloat(localStorage.getItem('mj-editor-h'));
    if (savedH > 160 && savedH < innerHeight * 0.75) right.style.setProperty('--editor-h', savedH + 'px');
    eSep?.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      eSep.setPointerCapture(ev.pointerId);
      eSep.classList.add('dragging');
      const ed = right.querySelector('.editor');
      const start = ev.clientY;
      const h0 = ed.getBoundingClientRect().height;
      const onMove = (e) => {
        const h = Math.max(160, Math.min(innerHeight * 0.75, h0 + (e.clientY - start)));
        right.style.setProperty('--editor-h', h + 'px');
      };
      const onUp = () => {
        eSep.classList.remove('dragging');
        eSep.removeEventListener('pointermove', onMove);
        eSep.removeEventListener('pointerup', onUp);
        try { localStorage.setItem('mj-editor-h', parseInt(right.style.getPropertyValue('--editor-h')) || 320); } catch {}
      };
      eSep.addEventListener('pointermove', onMove);
      eSep.addEventListener('pointerup', onUp);
    });

    /* Báo cho thí sinh biết ngay khi hệ thống ghi nhận vi phạm: nói rõ chuyện gì, lần thứ mấy, và cách xử lý nếu là nhầm lẫn. */
    state.vcount = state.info.myViolations || 0;
    const beepOn = contest.beepOnLeave !== false;
    const leaveBeep = () => beepOn && !state.ending && !state.unloading && beep3();
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    const drawVcount = () => {
      const el = $('[data-vcount]');
      if (!el) return;
      el.hidden = !state.vcount;
      el.textContent = `Đã ghi nhận ${state.vcount} lần rời bài`;
      el.title = 'Số lần hệ thống ghi nhận bạn rời bài thi (chuyển tab, đổi cửa sổ, thoát toàn màn hình, dán code từ ngoài…)';
    };
    let lastViolationAt = 0;
    const violation = (type, detail, what) => {
      report(type, detail);
      /* Nhiều tín hiệu trong cùng một lần rời (< 3 giây) chỉ tính 1 lần, khớp với cách server đếm. */
      const merged = Date.now() - lastViolationAt < 3000;
      lastViolationAt = Date.now();
      if (merged) return;
      state.vcount += 1;
      drawVcount();
      const box = $('[data-notice]');
      if (!box) return;
      const nth = state.vcount === 1 ? 'Đây là lần đầu tiên' : `Đây là lần thứ ${state.vcount}`;
      box.innerHTML = `
        <div class="notice-text">
          <b>Hệ thống vừa ghi nhận: ${esc(what)}</b>
          <span>${nth} trong buổi thi, thông tin đã được gửi cho giám thị. Nếu do máy lỗi hoặc thông báo tự bật lên, hãy giơ tay báo giám thị để được ghi chú. Bạn cứ tiếp tục làm bài bình thường.</span>
        </div>
        <button class="btn" data-notice-ok>Đã hiểu</button>`;
      box.hidden = false;
      box.classList.remove('flash');
      void box.offsetWidth;
      box.classList.add('flash');
    };
    drawVcount();

    /* --- Trình soạn code: chỉ chặn dán code mang từ ngoài vào. Copy/paste trong phòng thi dùng bình thường:
     * đoạn vừa copy/cut trong trang, code đang viết ở mọi bài, đề bài và ví dụ đều được dán. --- */
    const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const internalCopies = new Set();
    /* Bắt ở pha bubble để lấy đúng nội dung CodeMirror đã đặt vào clipboard (kể cả dòng ngoài màn hình). */
    const rememberCopy = (e) => {
      /* Copy từ ô nhập input (vd. vừa dán code lạ vào đó) không được tính là "copy trong phòng thi". */
      if (e.target?.closest?.('textarea, input')) return;
      const text = e.clipboardData?.getData('text/plain') || String(window.getSelection?.() || '');
      if (norm(text)) internalCopies.add(norm(text));
    };
    document.addEventListener('copy', rememberCopy);
    document.addEventListener('cut', rememberCopy);
    cleanups.push(() => {
      document.removeEventListener('copy', rememberCopy);
      document.removeEventListener('cut', rememberCopy);
    });
    const insideExam = (t) => {
      const haystack = [
        (() => { try { return editor.value; } catch { return ''; } })(),
        ...(state.info.problems || []).flatMap((p) => ['c', 'cpp', 'py'].map((l) => readDraft(cid, p.label, l))),
        state.problem?.statement,
        ...(state.problem?.samples || []).flatMap((s) => [s.input, s.output]),
      ].map(norm).join('\n');
      return internalCopies.has(t) || haystack.includes(t);
    };
    const editorHost = $('[data-editor]');
    const blockPaste = (e) => {
      if (contest.blockPaste === false) return;
      const text = (e.clipboardData || e.dataTransfer)?.getData('text') ?? '';
      if (text.trim().length <= PASTE_LIMIT || insideExam(norm(text))) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      violation('paste_blocked', `${text.length} ký tự`, `bạn vừa dán ${text.length} ký tự từ bên ngoài vào bài thi (đã bị chặn)`);
    };
    editorHost.addEventListener('paste', blockPaste, true);
    editorHost.addEventListener('drop', blockPaste, true);

    let savedTimer;
    const editor = await mountEditor(editorHost, {
      value: readDraft(cid, state.label, state.lang) ?? TEMPLATES[state.lang] ?? TEMPLATES.c,
      onChange: (code) => {
        if (!state.label) return;
        saveDraft(cid, state.label, state.lang, code);
        const el = $('[data-saved]');
        if (!el) return;
        el.textContent = 'Đã lưu nháp';
        clearTimeout(savedTimer);
        savedTimer = setTimeout(() => (el.textContent = 'Nháp tự lưu trên máy này'), 1500);
      },
      onSubmit: () => submit(),
      onRun: () => runCustom(),
      onCursor: ({ line, col, lines }) => {
        const el = $('[data-cursor]');
        if (el) el.textContent = `Dòng ${line}, cột ${col} · ${lines} dòng`;
      },
      onCheck: async (source) => {
        try {
          return (await api('/api/check', { method: 'POST', body: { source, lang: state.lang } })).log;
        } catch {
          return null;
        }
      },
      onLint: (s) => {
        const err = $('[data-diag-err]');
        const warn = $('[data-diag-warn]');
        if (!err || !warn) return;
        const en = Number(s.errors) || 0;
        const wn = Number(s.warnings) || 0;
        err.querySelector('[data-diag-err-n]').textContent = en;
        warn.querySelector('[data-diag-warn-n]').textContent = wn;
        err.classList.toggle('on', en > 0);
        warn.classList.toggle('on', wn > 0);
      },
    });

    const langSel = $('[data-lang]');
    langSel?.addEventListener('change', (e) => {
      const newLang = e.target.value;
      if (newLang === state.lang) return;
      if (state.label && editor.value) saveDraft(cid, state.label, state.lang, editor.value);
      state.lang = newLang;
      setLastLang(cid, state.label, newLang);
      editor.value = readDraft(cid, state.label, state.lang) ?? TEMPLATES[state.lang] ?? TEMPLATES.c;
      editor.recheck?.();
    });

    if (editor.assist) editor.setAssist?.(false);
    cleanups.push(() => editor.destroy?.());

    /* --- Đề bài + bài nộp --- */
    /* Thanh chọn bài: luôn hiện đủ số bài + trạng thái từng bài để thí sinh không bỏ sót bài. */
    const statusText = (p) => (p.myScore == null ? 'Chưa nộp' : `${scoreText(p.myScore, p.points)} điểm`);
    function drawTabs() {
      const list = state.info.problems;
      const done = list.filter((p) => p.myScore != null).length;
      $('[data-tabs]').innerHTML = `
        <span class="rail-count"><b>${list.length} bài</b><small>Đã nộp ${done}/${list.length}</small></span>
        ${list
          .map(
            (p) => `<button class="exam-tab ${p.label === state.label ? 'on' : ''} ${p.myScore == null ? 'todo' : p.myScore === p.points ? 'full' : 'part'}" data-label="${esc(p.label)}" title="${esc(p.label)}. ${esc(p.title || '')} · ${statusText(p)}" aria-label="Bài ${esc(p.label)}, ${statusText(p)}">${esc(p.label)}${p.myScore == null ? '' : `<small class="tab-score">${Number(p.myScore.toFixed(1))}</small>`}</button>`,
          )
          .join('')}`;
    }
    /* Nút sang bài trước / bài tiếp theo ở cuối đề. */
    function problemNav(label) {
      const list = state.info.problems;
      const i = list.findIndex((p) => p.label === label);
      const prev = list[i - 1];
      const next = list[i + 1];
      return `<div class="exam-nav">
          ${prev ? `<button class="btn" data-label="${esc(prev.label)}">← Bài ${esc(prev.label)}</button>` : '<span></span>'}
          ${next ? `<button class="btn-primary exam-next" data-label="${esc(next.label)}">Bài tiếp theo: ${esc(next.label)} →</button>` : '<span class="faint" style="font-size:13.5px">Đây là bài cuối cùng.</span>'}
        </div>`;
    }
    async function openProblem(label) {
      if (state.label && editor.value) saveDraft(cid, state.label, state.lang, editor.value);
      state.label = label;
      state.lang = getLastLang(cid, label) || 'c';
      if (!state.allowedLangs.includes(state.lang)) state.lang = state.allowedLangs[0];
      const langSel = $('[data-lang]');
      if (langSel) langSel.value = state.lang;
      drawTabs();
      editor.value = readDraft(cid, label, state.lang) ?? TEMPLATES[state.lang] ?? TEMPLATES.c;
      const p = await api(`/api/contests/${cid}/problems/${encodeURIComponent(label)}`);
      state.problem = p;
      $('[data-statement]').innerHTML = `
        <div class="pane-left-inner">
          <span class="exam-pos">Bài ${state.info.problems.findIndex((x) => x.label === p.label) + 1}/${state.info.problems.length}</span>
          <div class="prob-head"><h1 class="prob-title"><span class="mono">${esc(p.label)}.</span> ${esc(p.title)}</h1></div>
          <dl class="prob-facts">
            <div><dt>Thời gian</dt><dd class="num">${p.timeMs} ms</dd></div><div><dt>Bộ nhớ</dt><dd class="num">${p.memoryMb} MB</dd></div><div><dt>Điểm tối đa</dt><dd class="num">${p.points}</dd></div>
            <div><dt>Thang điểm</dt><dd><a href="#st-${esc(p.label)}" data-jump-st class="num">${p.subtasks.length} subtask ↓</a></dd></div>
          </dl>
          <article class="statement">${renderMarkdown(p.statement)}</article>
          ${p.samples.length ? `<div class="samples"><h3 class="section-title">Ví dụ</h3>${p.samples.map((s, i) => `<div class="sample"><div><div class="sample-head">INPUT #${i + 1}</div><pre>${esc(s.input)}</pre></div><div><div class="sample-head">OUTPUT #${i + 1}</div><pre>${esc(s.output)}</pre></div></div>`).join('')}</div>` : ''}
          <div class="exam-subtasks" id="st-${esc(p.label)}"><b>Thang điểm</b>
            <div class="st-bar" aria-hidden="true">${p.subtasks.map((s) => `<span style="flex-grow:${Math.max(1, s.points)}"></span>`).join('')}</div>
            ${p.subtasks.map((s, i) => `<div><span>Subtask ${i + 1}: ${esc(s.name)}${s.tests ? ` <span class="faint mono">· test ${esc(String(s.tests).replace(/-/g, '–'))}</span>` : ''}${s.note ? `<small class="st-desc">${esc(s.note)}</small>` : ''}</span><b class="mono">${s.points} điểm</b></div>`).join('')}
            <p class="st-note">Mỗi subtask chỉ được điểm khi <b>đúng tất cả</b> test của subtask đó; sai 1 test thì subtask đó được 0 điểm. Điểm bài = tổng điểm các subtask đạt được, tính theo lần nộp cao điểm nhất của bạn.</p></div>
          ${problemNav(p.label)}
        </div>`;
      $('[data-statement]').scrollTop = 0;
      const runInput = $('[data-run-input]');
$('[data-fill-tools]').innerHTML = p.samples.map((_, i) => `<button class="chip" data-fill="${i}">Dùng ví dụ ${i + 1}</button>`).join('') + '<button class="chip" data-clear-input title="Xoá input">Xoá</button>';
      if (runInput && !runInput.value) runInput.value = p.samples[0]?.input ?? '';
      /* Chuyển sang bài khác thì xoá kết quả "Chạy thử" cũ để không nhầm. */
      $('[data-run-result]').innerHTML = runResultHtml();
      await loadSubs();
    }
    /* Thẻ bài nộp: không còn mở panel log biên dịch (lỗi hiện trực tiếp trong trình soạn code). */
    function subHtml(s) {
      const sts = s.subtasks?.length
        ? `<div class="exam-st">${s.subtasks.map((st) => `<span class="${st.got ? 'ok' : 'no'}">${st.got ? '✓' : '✗'} ${esc(st.name)} · đúng ${st.passedTests}/${st.tests} test · <b class="mono">${st.got}/${st.points} điểm</b></span>`).join('')}</div>`
        : '';
      return `<div class="exam-sub" data-sub="${s.id}">
          <div class="exam-sub-head">${badge(s.verdict)}${langBadge(s.lang)}<span>${esc(verdictLabel(s.verdict))}</span><span class="faint mono" style="font-size:12.5px">${s.verdict === 'PENDING' ? '' : statLine(s)}</span><div class="spacer"></div>
          <b class="mono">${s.verdict === 'PENDING' ? 'Đang chấm…' : `${Number((s.score ?? 0).toFixed(2))} điểm`}</b></div>
          ${s.verdict !== 'PENDING' && s.verdict !== 'CE' ? `<span class="faint" style="font-size:12.5px">Đúng ${s.testsPassed}/${s.testCount} test</span>` : ''}
          ${sts}
        </div>`;
    }
    async function loadSubs() {
      const all = await api(`/api/contests/${cid}/submissions`);
      state.subs = all.filter((s) => s.label === state.label);
      $('[data-subs]').innerHTML = state.subs.length
        ? `<div class="exam-subs-head"><b>Bài nộp bài ${esc(state.label)} (${state.subs.length})</b>${(() => {
            const cur = state.info.problems.find((x) => x.label === state.label);
            return cur?.myScore != null ? `<span>Điểm bài này: <b class="mono">${Number(cur.myScore.toFixed(2))}/${cur.points}</b> <span class="faint">(lần nộp cao nhất)</span></span>` : '';
          })()}</div>${subHtml(state.subs[0])}${
            state.subs.length > 1
              ? `<details class="exam-older"><summary>${state.subs.length - 1} lần nộp trước</summary>${state.subs
                  .slice(1)
                  .map((s) => `<div class="exam-older-row">${badge(s.verdict)}${langBadge(s.lang)}<span class="faint mono">${fmtWhen(s.createdAt)}</span><div class="spacer"></div><b class="mono">${s.verdict === 'PENDING' ? 'Đang chấm…' : `${Number((s.score ?? 0).toFixed(2))} điểm`}</b></div>`)
                  .join('')}</details>`
              : ''
          }`
        : '<span class="faint" style="font-size:13.5px">Chưa nộp bài này. Bấm Nộp bài (Ctrl + Enter) khi xong.</span>';
      /* Lỗi biên dịch chỉ hiện gạch chân trong trình soạn code, không mở panel. */
      const ce = state.subs.find((s) => s.verdict === 'CE');
      if (ce && ce === state.subs[0]) {
        const d = await api(`/api/contests/${cid}/submissions/${ce.id}`);
        editor.showDiagnostics?.(d.compileLog);
      }
      return all;
    }
    async function refreshScores() {
      await loadInfo();
      drawTabs();
    }

    async function submit() {
      if (state.ending) return;
      if (state.preview) {
        toast('Chế độ xem trước: Mã nguồn không lưu vào kết quả thi thật. Hãy bấm "Chạy thử" để kiểm tra bài làm.', 'var(--accent)');
        return;
      }
      if (!editor.value.trim()) return toast('Mã nguồn đang trống');
      const btn = $('[data-submit]');
      btn.disabled = true;
      try {
        const { id } = await api(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: state.label, source: editor.value, lang: state.lang } });
        toast('Đã nộp, đang chấm…');
        await loadSubs();
        const poll = async () => {
          if (!state.alive) return;
          const s = await api(`/api/contests/${cid}/submissions/${id}`).catch(() => null);
          if (s && s.verdict !== 'PENDING' && s.score != null) {
            await refreshScores();
            await loadSubs();
            return toast(`Bài ${s.label}: ${Number(s.score.toFixed(2))} điểm`);
          }
          later(poll, POLL_MS);
        };
        later(poll, POLL_MS);
      } catch (err) {
        handleError(err);
      } finally {
        btn.disabled = false;
      }
    }
    async function runCustom() {
      const out = $('[data-run-result]');
      out.innerHTML = runResultHtml({ loading: true });
      try {
        const r = await api('/api/run', { method: 'POST', body: { source: editor.value, input: $('[data-run-input]').value, lang: state.lang } });
        out.innerHTML = runResultHtml(r);
        if (r.verdict === 'CE') editor.showDiagnostics?.(r.compile_log);
      } catch (err) {
        out.innerHTML = runResultHtml({ error: err.message });
      }
    }

    /* --- Đồng hồ, giám sát --- */
    let hiddenAt = 0;
    let blurAt = 0;
    function guardState() {
      if (state.preview) {
        const guard = $('[data-guard]');
        if (guard) {
          guard.className = 'exam-guard ok';
          guard.textContent = '● Xem trước';
          guard.title = 'Chế độ xem trước dành cho Admin';
        }
        return;
      }
      const fs = isFullscreen();
      const visible = !document.hidden;
      const ok = fs && visible && !state.blocked;
      const guard = $('[data-guard]');
      if (guard) {
        guard.className = `exam-guard ${ok ? 'ok' : 'bad'}`;
        guard.textContent = ok ? 'Đang giám sát' : 'Rời bài thi';
      }
      const overlay = $('[data-overlay]');
      if (!overlay) return;
      if (state.blocked) {
        overlay.hidden = false;
        overlay.innerHTML = `<div class="exam-overlay-box"><b>${esc(state.blocked.title)}</b><p>${esc(state.blocked.body)}</p>${state.blocked.action || ''}</div>`;
      } else if (!fs) {
        overlay.hidden = false;
        overlay.innerHTML = `<div class="exam-overlay-box"><b>Bạn đã thoát chế độ toàn màn hình</b><p>Việc này đã được ghi lại và báo cho giám thị${state.vcount ? ` (đã ghi nhận ${state.vcount} lần rời bài)` : ''}. Bấm nút bên dưới để quay lại làm bài, thời gian làm bài vẫn đang chạy.</p><button class="btn-primary" data-refs>Quay lại bài thi</button></div>`;
      } else overlay.hidden = true;
    }
    const onFs = () => {
      if (!isFullscreen() && !state.ending) {
        violation('fullscreen_exit', '', 'bạn đã thoát chế độ toàn màn hình');
        leaveBeep();
      }
      else if (isFullscreen()) report('fullscreen_enter', '');
      guardState();
    };
    /* Mỗi lần rời bài là một "lượt rời": 1 dòng khi rời + 1 dòng khi quay lại, tính 1 vi phạm.
     * Trình duyệt báo "ẩn trang" và "mất focus" riêng cho cùng một lần rời, nên gộp lại để không ghi trùng. */
    let away = null;
    let blurTimer = null;
    const awayText = (kind) => (kind === 'tab_hidden' ? 'bạn đã rời khỏi trang thi' : 'bạn đã chuyển sang cửa sổ khác');
    const startAway = (kind, at = Date.now()) => {
      if (away || state.ending || state.unloading) return;
      away = { kind, at };
      violation(kind, kind === 'tab_hidden' ? 'Rời trang thi (chuyển tab hoặc thu nhỏ)' : 'Chuyển sang cửa sổ khác', awayText(kind));
      leaveBeep();
    };
    const endAway = () => {
      clearTimeout(blurTimer);
      if (document.hidden || !document.hasFocus()) return;
      blurAt = 0;
      if (!away) return;
      const sec = Math.max(1, Math.round((Date.now() - away.at) / 1000));
      report('tab_visible', `Quay lại sau ${sec} giây`);
      const b = $('[data-notice] .notice-text b');
      if (b) b.textContent = `Hệ thống vừa ghi nhận: ${awayText(away.kind)} trong ${sec} giây`;
      away = null;
    };
    const onVis = () => {
      if (document.hidden) {
        if (state.unloading) {
          /* keepalive: yêu cầu vẫn được gửi xong dù trang đang đóng. */
          fetch(`/api/contests/${cid}/events`, {
            method: 'POST', keepalive: true, credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type: 'tab_hidden', detail: 'Tải lại hoặc đóng trang thi' }),
          }).catch(() => {});
        } else startAway('tab_hidden', blurAt || Date.now());
      } else endAway();
      guardState();
    };
    const onBlur = () => {
      if (document.hidden || away) return;
      blurAt = Date.now();
      /* Rời cửa sổ dưới 1,5 giây (thông báo hệ thống thoáng qua) không tính. */
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        if (!document.hasFocus() && !document.hidden) startAway('blur', blurAt);
      }, 1500);
    };
    const onFocus = () => endAway();
    const onKey = (e) => {
      const k = e.key?.toLowerCase();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (e.ctrlKey && k === 'u')) {
        e.preventDefault();
        const combo = e.key === 'F12' ? 'F12' : `Ctrl+${e.shiftKey ? 'Shift+' : ''}${e.key.toUpperCase()}`;
        violation('devtools_key', combo, `bạn vừa bấm phím ${combo} (mở công cụ trình duyệt, đã bị chặn)`);
        return;
      }
      /* Alt + A/B/C/… nhảy nhanh tới bài tương ứng. Bỏ qua khi con trỏ ở trong trình soạn code hoặc ô nhập. */
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const t = e.target;
        if (t && t.closest && t.closest('.cm-editor, textarea, input, [contenteditable]')) return;
        const K = (e.key || '').toUpperCase();
        if (K.length === 1 && K >= 'A' && K <= 'Z') {
          const items = ctx.view.querySelectorAll('[data-tabs] [data-label]');
          const btn = items[K.charCodeAt(0) - 65];
          if (btn) {
            e.preventDefault();
            btn.click();
          }
        }
      }
    };
    const onMenu = (e) => {
      e.preventDefault();
      report('context_menu', '');
      toast('Chuột phải bị tắt trong giờ thi');
    };
    const onLeave = (e) => {
      /* Chrome báo "ẩn trang" trước pagehide; đánh dấu từ beforeunload. Nếu học viên chọn ở lại thì gỡ cờ sau 1 giây. */
      state.unloading = true;
      setTimeout(() => (state.unloading = false), 1000);
      if (state.ending) return;
      e.preventDefault();
      e.returnValue = '';
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('contextmenu', onMenu);
    window.addEventListener('beforeunload', onLeave);
    cleanups.push(() => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('contextmenu', onMenu);
      window.removeEventListener('beforeunload', onLeave);
    });

    /* Một tab: tab mới mở sau sẽ thấy tab cũ trả lời và tự khóa. */
    const tabId = Math.random().toString(36).slice(2);
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(`mj-exam-${cid}`) : null;
    if (channel) {
      channel.onmessage = (e) => {
        if (state.preview || e.data?.from === tabId) return;
        if (e.data?.t === 'ping' && !state.blocked) channel.postMessage({ t: 'pong', from: tabId });
        if (e.data?.t === 'pong') {
          state.blocked = {
            title: 'Bài thi đã mở ở một tab khác',
            body: 'Chỉ được làm bài ở một tab. Hãy đóng các tab khác rồi bấm nút bên dưới để tiếp tục.',
            action: '<button class="btn-primary" style="margin-top:8px" onclick="location.reload()">Đã đóng tab khác — Tải lại bài thi</button>',
          };
          violation('second_tab', 'Mở bài thi ở tab thứ hai', 'bài thi đang được mở ở một tab thứ hai');
          guardState();
        }
      };
      channel.postMessage({ t: 'ping', from: tabId });
      cleanups.push(() => channel.close());
    }

    function handleError(err) {
      if (err.status === 423) {
        state.blocked = { title: 'Bài thi đang mở ở nơi khác', body: err.message, action: '<button class="btn" data-go="#/contests">Về danh sách cuộc thi</button>' };
        guardState();
      } else if (err.status === 409) {
        loadInfo().then(() => (state.info.contest.phase === 'running' && !state.info.contest.finished ? toast(err.message) : leave()));
      } else toast(err.message);
    }

    async function heartbeat() {
      if (!state.alive || state.blocked || state.preview) return;
      try {
        await api(`/api/contests/${cid}/heartbeat`, { method: 'POST', body: { fullscreen: isFullscreen(), visible: !document.hidden, extended: isExtended() } });
      } catch (err) {
        handleError(err);
      }
      later(heartbeat, HEARTBEAT_MS);
    }
    async function clock() {
      if (!state.alive) return;
      const left = contest.endAt - now();
      const el = $('[data-clock]');
      if (el) {
        el.textContent = fmtCountdown(left);
        el.classList.toggle('low', left < 5 * 60_000);
      }
      if (left <= 0) {
        state.ending = true;
        toast('Hết giờ làm bài');
        if (!state.preview) {
          await api(`/api/contests/${cid}/finish`, { method: 'POST' }).catch(() => {});
        }
        return leave();
      }
      later(clock, 1000);
    }

    ctx.view.addEventListener('click', async (e) => {
      const t = e.target;
      const tab = t.closest('[data-label]');
      if (tab) {
        $('[data-confirm]').hidden = true;
        return openProblem(tab.dataset.label).catch(handleError);
      }
      if (t.closest('[data-exit-preview]')) {
        state.ending = true;
        document.body.classList.remove('exam-mode');
        cleanups.splice(0).forEach((fn) => fn());
        return (location.hash = '#/contests');
      }
      if (t.closest('[data-submit]')) return submit();
      /* Link "6 subtask ↓" trong phần thông tin bài: cuộn tới thang điểm, không đổi địa chỉ trang. */
      if (t.closest('[data-jump-st]')) {
        e.preventDefault();
        return ctx.view.querySelector('.exam-subtasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (t.closest('[data-run]')) return runCustom();
      if (t.closest('[data-clear-input]')) {
        const inp = $('[data-run-input]');
        inp.value = '';
        $('[data-run-result]').innerHTML = runResultHtml();
        return inp.focus();
      }
      if (t.closest('[data-refs]')) {
        await enterFullscreen();
        return guardState();
      }
      if (t.closest('[data-notice-ok]')) return ($('[data-notice]').hidden = true);
      const fill = t.closest('[data-fill]');
      if (fill && state.problem) {
        const inp = $('[data-run-input]');
        inp.value = state.problem.samples[Number(fill.dataset.fill)]?.input ?? '';
        return inp.focus();
      }
      const box = $('[data-confirm]');
      if (t.closest('[data-cancel-finish]')) return (box.hidden = true);
      if (t.closest('[data-finish]')) {
        /* Hộp xác nhận ngay trong trang (confirm() của trình duyệt có thể làm thoát toàn màn hình). */
        const list = state.info.problems;
        const todo = list.filter((p) => p.myScore == null);
        box.innerHTML = `<div class="exam-overlay-box exam-confirm-box">
            <b>Nộp bài và kết thúc?</b>
            ${todo.length ? `<p class="bad-text" style="margin:0">Bạn còn <b>${todo.length}</b> bài chưa nộp: ${todo.map((p) => esc(p.label)).join(', ')}.</p>` : '<p style="margin:0">Bạn đã nộp đủ các bài.</p>'}
            <div class="confirm-list">${list.map((p) => `<button class="confirm-row ${p.myScore == null ? 'todo' : ''}" data-label="${esc(p.label)}"><b class="mono">${esc(p.label)}</b><span class="ellipsis">${esc(p.title || '')}</span><span>${statusText(p)}</span></button>`).join('')}</div>
            <p style="margin:0">Sau khi kết thúc sẽ <b>không nộp thêm được nữa</b>, kể cả khi còn giờ.</p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              <button class="btn-primary" data-cancel-finish>Quay lại làm bài</button>
              <button class="btn exam-finish" data-finish-yes>Kết thúc bài thi</button>
            </div></div>`;
        box.hidden = false;
        return;
      }
      if (t.closest('[data-finish-yes]')) {
        box.hidden = true;
        try {
          state.ending = true;
          await api(`/api/contests/${cid}/finish`, { method: 'POST' });
          leave();
        } catch (err) {
          state.ending = false;
          handleError(err);
        }
      }
    });

    drawTabs();
    guardState();
    clock();
    heartbeat();
    if (state.label) await openProblem(state.label).catch(handleError);
  }

  async function leave() {
    state.ending = true;
    state.alive = false;
    state.timers.forEach(clearTimeout);
    state.timers = [];
    document.body.classList.remove('exam-mode');
    if (isFullscreen()) await document.exitFullscreen().catch(() => {});
    cleanups.splice(0).forEach((fn) => fn());
    await loadInfo().catch(() => {});
    await summary();
  }

  /* ---------- Sau giờ thi / đã nộp bài ---------- */
  async function summary() {
    const { contest } = state.info;
    const info = state.info;
    const isAdmin = ctx.user?.role === 'admin';
    let board = null;
    if (contest.canSeeBoard || contest.phase === 'ended') {
      try {
        board = await api(`/api/contests/${cid}/results`);
        currentBoard = board;
      } catch (err) {
        console.error('Failed to fetch contest leaderboard:', err);
      }
    }
    ctx.view.innerHTML = `
      <main class="page contest-page" style="max-width:1360px;width:100%;">
        <button class="link-btn" data-go="#/contests" style="align-self:flex-start">‹ Danh sách cuộc thi</button>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h1 class="page-title" style="margin:0">${esc(contest.title)}</h1>
            ${isAdmin ? '<span class="pill" style="background:var(--accent);color:var(--on-accent);font-size:12px;font-weight:600;">Xem trước Admin</span>' : ''}
          </div>
          <p class="muted" style="margin:0">${contest.phase === 'ended' ? 'Cuộc thi đã kết thúc.' : 'Bạn đã nộp bài và kết thúc.'} ${contest.joined ? '' : isAdmin ? 'Bạn không tham gia thi với tư cách thí sinh.' : 'Bạn không tham gia cuộc thi này.'}</p>
        </div>
        ${info.problems.length ? `
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <span class="pill" style="background:var(--bg3);border:1px solid var(--line2);font-size:13.5px;padding:5px 12px;color:var(--fg);">
                Điểm bài làm của bạn: <b class="mono" style="color:var(--accent);font-size:15px">${Number(info.total.toFixed(2))}/${info.problems.reduce((s, p) => s + p.points, 0)}</b>
              </span>
              <button class="link-btn" data-toggle-mysummary style="font-size:13px;color:var(--accent);font-weight:600;display:inline-flex;align-items:center;gap:4px">
                <span data-toggle-label>Xem chi tiết từng bài của bạn ▾</span>
              </button>
            </div>
            <div data-my-summary-table hidden style="margin-top:6px">
              <div class="table" role="table" style="max-width:800px">
                <div class="trow thead exam-sum-cols"><span>Bài</span><span>Tên bài</span><span class="right">Số lần nộp</span><span class="right">Điểm</span></div>
                ${info.problems.map((p) => `<div class="trow exam-sum-cols"><b class="mono">${esc(p.label)}</b><span class="ellipsis">${esc(p.title)}</span><span class="right mono muted">${p.tries}</span><b class="right mono">${scoreText(p.myScore, p.points)}</b></div>`).join('')}
                <div class="trow exam-sum-cols"><span></span><b>Tổng điểm</b><span></span><b class="right mono" style="font-size:16px">${Number(info.total.toFixed(2))}/${info.problems.reduce((s, p) => s + p.points, 0)}</b></div>
              </div>
            </div>
          </div>` : ''}
        <div data-board>${board ? boardHtml(board, boardSearchQuery) : contest.phase === 'ended' ? '<p class="faint">Kết quả chung sẽ hiện ở đây khi giáo viên công bố.</p>' : '<p class="faint">Bảng xếp hạng hiện sau khi bạn hoàn tất bài làm.</p>'}</div>
      </main>`;

    const toggleBtn = ctx.view.querySelector('[data-toggle-mysummary]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const table = ctx.view.querySelector('[data-my-summary-table]');
        const label = ctx.view.querySelector('[data-toggle-label]');
        if (table) {
          table.hidden = !table.hidden;
          if (label) label.textContent = table.hidden ? 'Xem chi tiết từng bài của bạn ▾' : 'Thu gọn chi tiết bài ▴';
        }
      });
    }

    ctx.view.addEventListener('input', (e) => {
      if (e.target.matches('[data-board-search]')) {
        boardSearchQuery = e.target.value;
        const rowsBox = ctx.view.querySelector('[data-board-rows]');
        if (rowsBox && currentBoard) {
          const q = boardSearchQuery.trim().toLowerCase();
          const filteredRows = currentBoard.rows.filter(
            (r) => !q || (r.fullName && r.fullName.toLowerCase().includes(q)) || (r.username && r.username.toLowerCase().includes(q))
          );
          const layout = getBoardLayout(currentBoard.problems.length);
          rowsBox.innerHTML = renderBoardRows(filteredRows, currentBoard, layout);
        }
      }
    });

    /* Trong giờ thi bảng xếp hạng là trực tiếp: tự cập nhật 10 giây một lần. */
    if (board && board.phase === 'running') {
      const refresh = async () => {
        if (!state.alive) return;
        const fresh = await api(`/api/contests/${cid}/results`).catch(() => null);
        if (fresh) {
          currentBoard = fresh;
          const rowsBox = ctx.view.querySelector('[data-board-rows]');
          if (rowsBox) {
            const q = boardSearchQuery.trim().toLowerCase();
            const filteredRows = fresh.rows.filter(
              (r) => !q || (r.fullName && r.fullName.toLowerCase().includes(q)) || (r.username && r.username.toLowerCase().includes(q))
            );
            const layout = getBoardLayout(fresh.problems.length);
            rowsBox.innerHTML = renderBoardRows(filteredRows, fresh, layout);
          }
        }
        if (fresh?.phase === 'running') later(refresh, 10000);
      };
      later(refresh, 10000);
    }
  }

  function getBoardLayout(pCount) {
    const probCols = pCount > 0 ? ` repeat(${pCount}, 56px)` : '';
    const cols = `42px minmax(170px, 1.2fr)${probCols} 72px 76px 80px 46px`;
    const gap = 10;
    const padding = 32;
    const minW = 42 + 170 + pCount * 56 + 72 + 76 + 80 + 46 + (pCount + 5) * gap + padding;
    return { cols, minW, gap };
  }

  function renderBoardRows(rows, b, layout) {
    if (!rows.length) {
      return '<div class="empty" style="padding:24px 16px;text-align:center;color:var(--fg3)">Không tìm thấy thí sinh phù hợp.</div>';
    }
    const { cols, gap } = layout;
    const cell = (c, p) => {
      if (c.score == null) return '<span class="center" style="color:var(--fg3);opacity:0.35;font-size:14px;display:flex;justify-content:center">—</span>';
      const isFull = c.score >= p.points;
      const isPart = c.score > 0 && !isFull;
      if (isFull) {
        return `<span class="center" style="display:flex;justify-content:center"><span class="mono" style="display:inline-flex;align-items:center;justify-content:center;min-width:40px;padding:2px 5px;border-radius:5px;font-weight:700;font-size:12px;background:rgba(34,197,94,0.14);color:#22c55e;border:1px solid rgba(34,197,94,0.3)" title="${c.tries} lần nộp">${Number(c.score.toFixed(2))}</span></span>`;
      }
      if (isPart) {
        return `<span class="center" style="display:flex;justify-content:center"><span class="mono" style="display:inline-flex;align-items:center;justify-content:center;min-width:40px;padding:2px 5px;border-radius:5px;font-weight:700;font-size:12px;background:rgba(245,158,11,0.14);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)" title="${c.tries} lần nộp">${Number(c.score.toFixed(2))}</span></span>`;
      }
      return `<span class="center" style="display:flex;justify-content:center"><span class="mono" style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;padding:2px 5px;border-radius:5px;font-weight:600;font-size:12px;background:rgba(239,68,68,0.08);color:#ef4444;border:1px solid rgba(239,68,68,0.22)" title="${c.tries} lần nộp">0</span></span>`;
    };

    return rows
      .map((r) => {
        const isMe = Boolean(ctx.user && r.username === ctx.user.username);
        const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
        const rankDisplay = medal
          ? `<span style="font-size:18px;line-height:1" title="Hạng ${r.rank}">${medal}</span>`
          : `<span class="mono" style="font-size:13px;font-weight:600;color:var(--fg3)">${r.rank}</span>`;

        return `
        <div class="trow ${isMe ? 'me' : ''}" style="grid-template-columns:${cols};gap:${gap}px;padding:10px 16px;align-items:center;${!isMe && r.rank === 1 ? 'background:rgba(245,158,11,0.03);' : ''}">
          <div class="center" style="display:flex;align-items:center;justify-content:center">${rankDisplay}</div>
          <a href="#/profile/${encodeURIComponent(r.username)}" class="rank-user" style="text-decoration:none;color:inherit;display:flex !important;flex-direction:row !important;align-items:center !important;gap:9px;min-width:0;" title="Xem hồ sơ ${esc(r.fullName || r.username)}">
            ${renderAvatar(r.username, r.avatar, 30, r.fullName)}
            <div style="display:flex;flex-direction:column;min-width:0;line-height:1.25">
              <span class="ellipsis" style="font-weight:700;font-size:13px;color:var(--fg);">${esc(r.fullName || r.username)}${isMe ? ' <span class="me-tag" style="background:var(--accent);color:var(--on-accent);padding:1px 5px;border-radius:4px;font-size:10px;margin-left:4px;font-weight:700;">BẠN</span>' : ''}</span>
              <small class="muted" style="font-size:11px;display:flex;align-items:center;gap:4px;margin-top:1px">
                ${r.fullName ? `<span class="mono" style="opacity:0.85">${esc(r.username)}</span> · ` : ''}
                <span style="color:${r.finished ? 'var(--ok)' : 'var(--wa)'};font-weight:500;white-space:nowrap">
                  ${r.finished ? '✓ đã nộp' : '⚡ đang làm'}
                </span>
              </small>
            </div>
          </a>
          ${r.cells.map((c, i) => cell(c, b.problems[i])).join('')}
          <div class="center" style="display:flex;justify-content:center;align-items:center">
            <b class="mono" style="color:var(--accent);font-size:13.5px;font-weight:800;background:color-mix(in oklch, var(--accent) 12%, transparent);padding:2px 8px;border-radius:6px;border:1px solid color-mix(in oklch, var(--accent) 25%, transparent)">${Number(r.total.toFixed(2))}</b>
          </div>
          <span class="center mono faint" style="font-size:12px;white-space:nowrap;display:flex;justify-content:center;align-items:center">${fmtWorkTime(r.workDurationMs)}</span>
          <span class="center mono faint" style="font-size:12px;white-space:nowrap;display:flex;justify-content:center;align-items:center">${r.finishAt ? fmtClock(r.finishAt) : '—'}</span>
          <span class="center mono muted" style="font-size:12px;display:flex;justify-content:center;align-items:center">${r.totalTries ?? 0}</span>
        </div>`;
      })
      .join('');
  }

  function boardHtml(b, query = boardSearchQuery) {
    const layout = getBoardLayout(b.problems.length);
    const max = b.problems.reduce((s, p) => s + p.points, 0);
    const live = b.phase === 'running';
    const working = b.rows.filter((r) => !r.finished).length;

    const q = (query || '').trim().toLowerCase();
    const filteredRows = b.rows.filter(
      (r) => !q || (r.fullName && r.fullName.toLowerCase().includes(q)) || (r.username && r.username.toLowerCase().includes(q))
    );

    const renderContestPodium = (rows, maxPoints) => {
      if (!rows || rows.length < 2) return '';
      const u1 = rows[0];
      const u2 = rows[1];
      const u3 = rows[2] || null;

      const renderPillar = (u, rank) => {
        if (!u) return '<div class="podium-pillar rank-3" style="opacity:0.35"></div>';
        const name = esc(u.fullName || u.username);
        const username = esc(u.username);
        const isRank1 = rank === 1;
        const avatarSize = isRank1 ? 72 : rank === 2 ? 62 : 56;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
        const rankLabel = rank === 1 ? 'QUÁN QUÂN' : rank === 2 ? 'Á QUÂN' : 'QUÝ QUÂN';
        const score = Number(u.total.toFixed(2));
        const workTime = fmtWorkTime(u.workDurationMs);

        return `
          <div class="podium-pillar rank-${rank}">
            <div class="podium-person">
              ${isRank1 ? '<span class="podium-crown">👑</span>' : ''}
              <div class="podium-avatar-wrap">
                ${renderAvatar(u.username, u.avatar, avatarSize, u.fullName)}
                <span class="podium-medal-badge">${medal}</span>
              </div>
              <div class="podium-info">
                <span class="podium-name" title="${name}">${name}</span>
                <span class="podium-handle">@${username}</span>
                <span class="podium-score">${score}/${maxPoints} đ ${workTime ? `· ${workTime}` : ''}</span>
              </div>
            </div>
            <div class="podium-step step-${rank}">
              <span class="podium-rank-num">${rank}</span>
              <span class="podium-rank-label">${rankLabel}</span>
            </div>
          </div>
        `;
      };

      return `
        <div class="podium-container">
          <div class="podium-stage">
            ${renderPillar(u2, 2)}
            ${renderPillar(u1, 1)}
            ${renderPillar(u3, 3)}
          </div>
          <div class="podium-base-bar"></div>
        </div>
      `;
    };

    return `
      <div style="margin-top:16px">
        ${renderContestPodium(b.rows, max)}

        <div class="board-head" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <h2 class="section-title" style="margin:0">Bảng xếp hạng${live ? ' <span class="board-live">trực tiếp</span>' : ''}</h2>
            <span class="chip-sm" style="background:var(--bg3);border:1px solid var(--line2);font-size:12px;padding:2px 8px;border-radius:99px;color:var(--fg2)">${b.rows.length} thí sinh${live ? ` · ${working} bạn đang làm bài` : ''}</span>
          </div>
          <input class="ctl" data-board-search placeholder="🔍 Tìm theo tên hoặc MSSV…" value="${esc(query || '')}" style="width:240px;height:34px;font-size:12.5px" />
        </div>

        <div class="rank-scroll" style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--r-lg);">
          <div class="table" style="min-width:${layout.minW}px;width:100%;border-radius:var(--r-lg);overflow:hidden;">
            <div class="trow thead" style="grid-template-columns:${layout.cols};gap:${layout.gap}px;padding:10px 16px;align-items:center;">
              <span class="center">#</span>
              <span>Thí sinh</span>
              ${b.problems.map((p) => `<span class="center" style="display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2;font-size:12px;white-space:nowrap" title="${esc(p.title)}"><b style="color:var(--fg);font-size:13px">${esc(p.label)}</b><small class="faint" style="font-size:10px">/${p.points}</small></span>`).join('')}
              <span class="center" style="font-weight:700">Tổng</span>
              <span class="center" title="Thời gian làm bài thực tế từ lúc vào phòng thi">Làm bài</span>
              <span class="center" title="Thời điểm hoàn thành bài thi hoặc nộp bài đạt điểm">Hoàn tất</span>
              <span class="center" title="Tổng số lần nộp bài">Nộp</span>
            </div>
            <div data-board-rows style="display:flex;flex-direction:column;width:100%;min-width:100%;">
              ${renderBoardRows(filteredRows, b, layout)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return () => {
    state.alive = false;
    state.timers.forEach(clearTimeout);
    cleanups.splice(0).forEach((fn) => fn());
    document.body.classList.remove('exam-mode');
    if (isFullscreen()) document.exitFullscreen().catch(() => {});
  };
}
