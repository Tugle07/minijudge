import { api } from '../api.js';
import { readDraft as draftGet, saveDraft as draftSet } from '../drafts.js';
import { mountEditor } from '../editor.js';
import { badge, esc, renderMarkdown, statLine, toast, verdictLabel } from '../ui.js';
import { compileErrorsHtml, runResultHtml } from './problem-result.js';
import { fmtCountdown, fmtDuration, fmtTime } from './contests.js';

/* Phòng thi. Trình duyệt không khóa được cả máy, nên phòng thi làm 3 việc: bắt buộc toàn màn hình +
 * một tab, ghi lại mọi lần rời bài (chuyển tab, thoát toàn màn hình, dán code từ ngoài) để giám thị xem,
 * và khóa phần luyện tập trong giờ thi. Kết hợp với giám thị trong phòng và kiểm tra code giống nhau sau thi. */

const TEMPLATE = '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n';
const HEARTBEAT_MS = 10_000;
const POLL_MS = 800;
const PASTE_LIMIT = 30;

const readDraft = (cid, label) => draftGet(`exam-${cid}-${label}`);
const saveDraft = (cid, label, code) => draftSet(`exam-${cid}-${label}`, code);
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
  const cid = Number(ctx.arg);
  const state = { info: null, offset: 0, label: null, problem: null, subs: [], alive: true, timers: [], blocked: null, ending: false };
  const cleanups = [];
  const later = (fn, ms) => state.timers.push(setTimeout(fn, ms));
  const now = () => Date.now() + state.offset;

  async function loadInfo() {
    state.info = await api(`/api/contests/${cid}`);
    state.offset = state.info.now - Date.now();
    return state.info;
  }
  const report = (type, detail = '') => api(`/api/contests/${cid}/events`, { method: 'POST', body: { type, detail: String(detail) } }).catch(() => {});

  await loadInfo();
  route();

  function route() {
    const { contest } = state.info;
    if (contest.phase === 'running' && contest.joined && !contest.finished) return state.info.otherSession ? lobby('other') : lobby('resume');
    if (contest.phase === 'running' && !contest.joined) return lobby('join');
    if (contest.phase === 'upcoming' || contest.phase === 'draft') return lobby('wait');
    return summary();
  }

  /* ---------- Sảnh chờ: luật thi, kiểm tra máy, nhập mã phòng ---------- */
  function lobby(mode) {
    const { contest } = state.info;
    const checks = [
      ['Trình duyệt hỗ trợ toàn màn hình', Boolean(document.documentElement.requestFullscreen)],
      ['Chỉ dùng một màn hình', !isExtended(), 'Rút màn hình phụ / máy chiếu trước khi vào thi'],
    ];
    ctx.view.innerHTML = `
      <main class="page exam-lobby">
        <button class="link-btn" data-go="#/contests" style="align-self:flex-start">‹ Danh sách cuộc thi</button>
        <div class="exam-lobby-card">
          <span class="faint" style="font-size:13px">${fmtTime(contest.startAt)} – ${fmtTime(contest.endAt)} · ${fmtDuration(contest.endAt - contest.startAt)} · ${contest.problemCount} bài</span>
          <h1 class="page-title">${esc(contest.title)}</h1>
          ${contest.description ? `<div class="statement" style="font-size:15px">${renderMarkdown(contest.description)}</div>` : ''}
          <div class="exam-rules">
            <b>Quy định phòng thi</b>
            <ul>
              <li>Bài làm ở chế độ <b>toàn màn hình</b>. Thoát toàn màn hình, chuyển tab hay chuyển sang ứng dụng khác đều được <b>ghi lại và báo giám thị</b>.</li>
              <li>Chỉ mở bài thi ở <b>một tab, một máy</b>. Mở ở tab/máy thứ hai sẽ bị chặn.</li>
              <li>${contest.blockPaste !== false ? 'Copy/paste trong phòng thi dùng bình thường (code của bạn, đề bài, ví dụ); <b>dán code mang từ bên ngoài vào sẽ bị chặn</b> và ghi lại.' : 'Được copy/paste tự do.'} Phần luyện tập bị khóa trong giờ thi.</li>
              <li>Mỗi bài chia nhiều subtask (nhóm test). Subtask chỉ được điểm khi <b>đúng tất cả</b> test trong nhóm; sai 1 test thì nhóm đó 0 điểm. Ví dụ subtask 1 gồm test 1–5 (40 điểm): đúng 5/5 được 40, đúng 4/5 được 0. Điểm bài là tổng các subtask đạt được, lấy lần nộp cao điểm nhất.</li>
              ${contest.beepOnLeave !== false ? '<li>Khi bạn rời bài thi (chuyển tab, đổi cửa sổ, thoát toàn màn hình), máy sẽ <b>phát 3 tiếng bíp</b>. Hãy bật loa ở mức vừa nghe.</li>' : ''}
              <li>Sau giờ thi, hệ thống so sánh code giữa các thí sinh để phát hiện bài giống nhau.</li>
            </ul>
          </div>
          <div class="exam-checks">${checks
            .map(([label, ok, hint]) => `<div class="exam-check ${ok ? 'ok' : 'bad'}"><span>${ok ? '✓' : '✗'}</span><span>${esc(label)}${!ok && hint ? `<small class="faint">${esc(hint)}</small>` : ''}</span></div>`)
            .join('')}</div>
          <div data-lobby-action></div>
          <div class="alert" data-error hidden></div>
        </div>
      </main>`;
    const box = ctx.view.querySelector('[data-lobby-action]');
    const showError = (msg) => {
      const el = ctx.view.querySelector('[data-error]');
      el.textContent = msg;
      el.hidden = !msg;
    };

    if (mode === 'wait') {
      const draw = () => {
        const left = contest.startAt - now();
        box.innerHTML = contest.phase === 'draft'
          ? '<p class="muted">Cuộc thi đang ở chế độ nháp (chỉ Admin thấy).</p>'
          : `<div class="exam-countdown"><span class="faint">Bắt đầu sau</span><b class="mono">${fmtCountdown(left)}</b></div>`;
        if (left <= 0 && contest.phase !== 'draft') loadInfo().then(route).catch(() => {});
        else if (state.alive) later(draw, 1000);
      };
      return draw();
    }
    if (!contest.allowed) {
      box.innerHTML = '<p class="bad-text">Tài khoản của bạn không có trong danh sách thí sinh. Báo giám thị nếu đây là nhầm lẫn.</p>';
      return;
    }
    const other = mode === 'other';
    box.innerHTML = `
      <form class="exam-join" data-join>
        ${mode === 'join' && contest.needCode ? '<label class="field"><span>Mã phòng thi (giám thị đọc tại lớp)</span><input class="input mono" data-code autocomplete="off" required style="text-transform:uppercase" /></label>' : ''}
        ${other ? '<p class="bad-text" style="margin:0">Bài thi của bạn đang mở ở một thiết bị/tab khác. Đóng nơi đó rồi bấm Tiếp tục, hoặc báo giám thị mở khóa.</p>' : ''}
        <button class="btn-primary" type="submit" style="height:44px">${mode === 'join' ? 'Vào phòng thi (bật toàn màn hình)' : 'Tiếp tục làm bài'}</button>
      </form>`;
    box.querySelector('[data-join]').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      if (contest.blockMultiScreen && isExtended()) return showError('Máy đang nối nhiều màn hình. Rút màn hình phụ rồi vào lại.');
      unlockAudio();
      /* Xóa clipboard khi bắt đầu làm bài: code copy sẵn từ trước không còn để dán. Cần lúc người dùng vừa bấm nút. */
      navigator.clipboard?.writeText('').catch(() => {});
      const fs = await enterFullscreen();
      try {
        await api(`/api/contests/${cid}/join`, { method: 'POST', body: { code: box.querySelector('[data-code]')?.value ?? '', extended: isExtended() } });
      } catch (err) {
        if (isFullscreen()) document.exitFullscreen().catch(() => {});
        return showError(err.message);
      }
      if (!fs) toast('Trình duyệt không bật được toàn màn hình — giám thị sẽ thấy cảnh báo');
      await loadInfo();
      exam();
    });
  }

  /* ---------- Phòng thi ---------- */
  async function exam() {
    const { contest, problems } = state.info;
    state.label = state.label || problems[0]?.label;
    ctx.view.innerHTML = `
      <div class="exam" data-exam>
        <header class="exam-bar">
          <b class="exam-title ellipsis">${esc(contest.title)}</b>
          <div class="spacer"></div>
          <span class="exam-guard" data-guard title="Trạng thái giám sát"></span>
          <span class="exam-vcount" data-vcount hidden></span>
          <span class="exam-clock mono" data-clock></span>
          <button class="btn exam-finish" data-finish>Nộp bài &amp; kết thúc</button>
        </header>
        <nav class="exam-rail" data-tabs aria-label="Danh sách bài thi"></nav>
        <div class="exam-notice" data-notice role="alert" aria-live="assertive" hidden></div>
        <div class="exam-body">
          <section class="exam-left" data-statement><div class="editor-loading">Đang tải đề…</div></section>
          <section class="exam-right">
            <div class="toolbar">
              <span class="lang-chip">C11 · gcc -O2</span>
              <span class="faint" style="font-size:12.5px" data-saved>Nháp tự lưu trên máy này</span>
              <div class="spacer"></div>
              <button class="file-btn" data-run title="Chạy với input bên dưới, không tính điểm">Chạy thử</button>
              <button class="btn-submit" data-submit title="Ctrl + Enter">Nộp bài <span class="kbd">Ctrl Enter</span></button>
            </div>
            <div class="editor" data-editor><div class="editor-loading">Đang tải trình soạn code…</div></div>
            <div class="editor-status"><span data-cursor>Dòng 1, cột 1</span><span data-lint class="lint-state"></span></div>
            <div class="exam-panel">
              <details class="exam-run" data-run-box><summary>Chạy thử với input tự nhập</summary>
                <textarea data-run-input spellcheck="false" placeholder="Nhập input…"></textarea>
                <div class="run-actions" data-run-fill></div>
                <div data-run-result></div>
              </details>
              <div data-subs></div>
            </div>
          </section>
        </div>
        <div class="exam-overlay" data-overlay hidden></div>
        <div class="exam-overlay" data-confirm hidden></div>
      </div>`;
    document.body.classList.add('exam-mode');
    const $ = (s) => ctx.view.querySelector(s);

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
    const violation = (type, detail, what) => {
      report(type, detail);
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
        ...(state.info.problems || []).map((p) => readDraft(cid, p.label)),
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
      value: readDraft(cid, state.label) ?? TEMPLATE,
      onChange: (code) => {
        if (!state.label) return;
        saveDraft(cid, state.label, code);
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
          return (await api('/api/check', { method: 'POST', body: { source } })).log;
        } catch {
          return null;
        }
      },
      onLint: (s) => {
        const el = $('[data-lint]');
        if (!el) return;
        el.className = `lint-state ${s.checking ? '' : s.errors ? 'bad' : s.warnings ? 'warn' : s.offline ? '' : 'good'}`;
        el.textContent = s.checking ? 'Đang kiểm tra cú pháp…' : s.offline ? '' : s.errors ? `${s.errors} lỗi cú pháp` : s.warnings ? `${s.warnings} cảnh báo` : 'Không có lỗi cú pháp';
      },
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
            (p) => `<button class="exam-tab ${p.label === state.label ? 'on' : ''} ${p.myScore == null ? 'todo' : p.myScore === p.points ? 'full' : 'part'}" data-label="${esc(p.label)}" title="${esc(p.label)}. ${esc(p.title || '')} · ${statusText(p)}" aria-label="Bài ${esc(p.label)}, ${statusText(p)}">${esc(p.label)}</button>`,
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
      if (state.label && editor.value) saveDraft(cid, state.label, editor.value);
      state.label = label;
      drawTabs();
      editor.value = readDraft(cid, label) ?? TEMPLATE;
      const p = await api(`/api/contests/${cid}/problems/${encodeURIComponent(label)}`);
      state.problem = p;
      $('[data-statement]').innerHTML = `
        <div class="pane-left-inner">
          <span class="exam-pos">Bài ${state.info.problems.findIndex((x) => x.label === p.label) + 1}/${state.info.problems.length}</span>
          <div class="prob-head"><h1 class="prob-title"><span class="mono">${esc(p.label)}.</span> ${esc(p.title)}</h1></div>
          <dl class="prob-facts">
            <div><dt>Thời gian</dt><dd class="num">${p.timeMs} ms</dd></div><div><dt>Bộ nhớ</dt><dd class="num">${p.memoryMb} MB</dd></div><div><dt>Điểm tối đa</dt><dd class="num">${p.points}</dd></div>
          </dl>
          <div class="exam-subtasks"><b>Thang điểm</b>
            <div class="st-bar" aria-hidden="true">${p.subtasks.map((s) => `<span style="flex-grow:${Math.max(1, s.points)}"></span>`).join('')}</div>
            ${p.subtasks.map((s, i) => `<div><span>Subtask ${i + 1}: ${esc(s.name)}${s.tests ? ` <span class="faint mono">· test ${esc(String(s.tests).replace(/-/g, '–'))}</span>` : ''}</span><b class="mono">${s.points} điểm</b></div>`).join('')}
            <p class="st-note">Mỗi subtask chỉ được điểm khi <b>đúng tất cả</b> test của subtask đó; sai 1 test thì subtask đó được 0 điểm. Điểm bài = tổng điểm các subtask đạt được, tính theo lần nộp cao điểm nhất của bạn.</p></div>
          <article class="statement">${renderMarkdown(p.statement)}</article>
          ${p.samples.length ? `<div class="samples"><h3 class="section-title">Ví dụ</h3>${p.samples.map((s, i) => `<div class="sample"><div><div class="sample-head">INPUT #${i + 1}</div><pre>${esc(s.input)}</pre></div><div><div class="sample-head">OUTPUT #${i + 1}</div><pre>${esc(s.output)}</pre></div></div>`).join('')}</div>` : ''}
          ${problemNav(p.label)}
        </div>`;
      $('[data-statement]').scrollTop = 0;
      const runInput = $('[data-run-input]');
      $('[data-run-fill]').innerHTML = `<button class="btn" data-run>Chạy</button>${p.samples.map((_, i) => `<button class="btn" data-fill="${i}">Dùng ví dụ ${i + 1}</button>`).join('')}<span class="faint" style="font-size:12.5px">Không tính điểm</span>`;
      if (runInput && !runInput.value) runInput.value = p.samples[0]?.input ?? '';
      await loadSubs();
    }
    function subHtml(s) {
      const sts = s.subtasks?.length
        ? `<div class="exam-st">${s.subtasks.map((st) => `<span class="${st.got ? 'ok' : 'no'}">${st.got ? '✓' : '✗'} ${esc(st.name)} · đúng ${st.passedTests}/${st.tests} test · <b class="mono">${st.got}/${st.points} điểm</b></span>`).join('')}</div>`
        : '';
      return `<div class="exam-sub" data-sub="${s.id}">
          <div class="exam-sub-head">${badge(s.verdict)}<span>${esc(verdictLabel(s.verdict))}</span><span class="faint mono" style="font-size:12.5px">${s.verdict === 'PENDING' ? '' : statLine(s)}</span><div class="spacer"></div>
          <b class="mono">${s.verdict === 'PENDING' ? 'Đang chấm…' : `${Number((s.score ?? 0).toFixed(2))} điểm`}</b></div>
          ${s.verdict !== 'PENDING' && s.verdict !== 'CE' ? `<span class="faint" style="font-size:12.5px">Đúng ${s.testsPassed}/${s.testCount} test</span>` : ''}
          ${sts}
          <div data-sub-extra></div>
        </div>`;
    }
    async function loadSubs() {
      const all = await api(`/api/contests/${cid}/submissions`);
      state.subs = all.filter((s) => s.label === state.label);
      $('[data-subs]').innerHTML = state.subs.length
        ? `<b style="font-size:14px">Bài nộp bài ${esc(state.label)} (${state.subs.length})</b>${state.subs.map(subHtml).join('')}`
        : '<span class="faint" style="font-size:13.5px">Chưa nộp bài này. Bấm Nộp bài (Ctrl + Enter) khi xong.</span>';
      const ce = state.subs.find((s) => s.verdict === 'CE');
      if (ce && ce === state.subs[0]) {
        const d = await api(`/api/contests/${cid}/submissions/${ce.id}`);
        const box = ctx.view.querySelector(`[data-sub="${ce.id}"] [data-sub-extra]`);
        if (box) box.innerHTML = compileErrorsHtml(d.compileLog);
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
      if (!editor.value.trim()) return toast('Mã nguồn đang trống');
      const btn = $('[data-submit]');
      btn.disabled = true;
      try {
        const { id } = await api(`/api/contests/${cid}/submit`, { method: 'POST', body: { label: state.label, source: editor.value } });
        toast('Đã nộp, đang chấm…');
        await loadSubs();
        const poll = async () => {
          if (!state.alive) return;
          const s = await api(`/api/contests/${cid}/submissions/${id}`).catch(() => null);
          if (s && s.verdict !== 'PENDING' && s.score != null) {
            await loadSubs();
            await refreshScores();
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
      const box = $('[data-run-box]');
      box.open = true;
      const out = $('[data-run-result]');
      out.innerHTML = runResultHtml({ loading: true });
      try {
        const r = await api('/api/run', { method: 'POST', body: { source: editor.value, input: $('[data-run-input]').value } });
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
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        state.hiddenCounted = false;
        if (state.unloading) {
          /* keepalive: yêu cầu vẫn được gửi xong dù trang đang đóng. */
          fetch(`/api/contests/${cid}/events`, {
            method: 'POST', keepalive: true, credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ type: 'tab_hidden', detail: 'Tải lại hoặc đóng trang thi' }),
          }).catch(() => {});
        }
        else if (!state.ending) {
          violation('tab_hidden', 'Rời trang thi', 'bạn đã rời khỏi trang thi');
          leaveBeep();
        }
      } else if (hiddenAt) {
        const sec = Math.round((Date.now() - hiddenAt) / 1000);
        report('tab_visible', `Quay lại sau ${sec} giây`);
        const box = $('[data-notice] .notice-text b');
        if (box) box.textContent = `Hệ thống vừa ghi nhận: bạn đã rời khỏi trang thi trong ${sec} giây`;
        hiddenAt = 0;
      }
      guardState();
    };
    let blurBeepTimer = null;
    const onBlur = () => {
      if (document.hidden) return;
      blurAt = Date.now();
      /* Chỉ bíp khi rời cửa sổ quá 1,5 giây, tránh kêu oan vì thông báo hệ thống thoáng qua. */
      clearTimeout(blurBeepTimer);
      blurBeepTimer = setTimeout(() => blurAt && !document.hasFocus() && leaveBeep(), 1500);
    };
    const onFocus = () => {
      clearTimeout(blurBeepTimer);
      if (blurAt && Date.now() - blurAt > 1500 && !state.ending) {
        const sec = Math.round((Date.now() - blurAt) / 1000);
        violation('blur', `Chuyển sang cửa sổ khác ${sec} giây`, `bạn đã chuyển sang cửa sổ khác trong ${sec} giây`);
      }
      blurAt = 0;
    };
    const onKey = (e) => {
      const k = e.key?.toLowerCase();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (e.ctrlKey && k === 'u')) {
        e.preventDefault();
        const combo = e.key === 'F12' ? 'F12' : `Ctrl+${e.shiftKey ? 'Shift+' : ''}${e.key.toUpperCase()}`;
        violation('devtools_key', combo, `bạn vừa bấm phím ${combo} (mở công cụ trình duyệt, đã bị chặn)`);
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
        if (e.data?.from === tabId) return;
        if (e.data?.t === 'ping' && !state.blocked) channel.postMessage({ t: 'pong', from: tabId });
        if (e.data?.t === 'pong') {
          state.blocked = { title: 'Bài thi đã mở ở một tab khác', body: 'Chỉ được làm bài ở một tab. Hãy đóng tab này và quay về tab đang làm bài.' };
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
      if (!state.alive || state.blocked) return;
      try {
        await api(`/api/contests/${cid}/heartbeat`, { method: 'POST', body: { fullscreen: isFullscreen(), visible: !document.hidden, extended: isExtended() } });
      } catch (err) {
        handleError(err);
      }
      later(heartbeat, HEARTBEAT_MS);
    }
    function clock() {
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
      if (t.closest('[data-submit]')) return submit();
      if (t.closest('[data-run]')) return runCustom();
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
    document.body.classList.remove('exam-mode');
    if (isFullscreen()) await document.exitFullscreen().catch(() => {});
    cleanups.splice(0).forEach((fn) => fn());
    await loadInfo().catch(() => {});
    summary();
  }

  /* ---------- Sau giờ thi / đã nộp bài ---------- */
  async function summary() {
    const { contest } = state.info;
    const info = state.info;
    let board = null;
    if (contest.canSeeBoard) board = await api(`/api/contests/${cid}/results`).catch(() => null);
    ctx.view.innerHTML = `
      <main class="page" style="max-width:900px">
        <button class="link-btn" data-go="#/contests" style="align-self:flex-start">‹ Danh sách cuộc thi</button>
        <div style="display:flex;flex-direction:column;gap:6px">
          <h1 class="page-title">${esc(contest.title)}</h1>
          <p class="muted" style="margin:0">${contest.phase === 'ended' ? 'Cuộc thi đã kết thúc.' : 'Bạn đã nộp bài và kết thúc.'} ${contest.joined ? '' : 'Bạn không tham gia cuộc thi này.'}</p>
        </div>
        ${info.problems.length ? `
          <div class="table" role="table">
            <div class="trow thead exam-sum-cols"><span>Bài</span><span>Tên bài</span><span class="right">Số lần nộp</span><span class="right">Điểm</span></div>
            ${info.problems.map((p) => `<div class="trow exam-sum-cols"><b class="mono">${esc(p.label)}</b><span class="ellipsis">${esc(p.title)}</span><span class="right mono muted">${p.tries}</span><b class="right mono">${scoreText(p.myScore, p.points)}</b></div>`).join('')}
            <div class="trow exam-sum-cols"><span></span><b>Tổng điểm</b><span></span><b class="right mono" style="font-size:16px">${Number(info.total.toFixed(2))}/${info.problems.reduce((s, p) => s + p.points, 0)}</b></div>
          </div>` : ''}
        <div data-board>${board ? boardHtml(board) : contest.phase === 'ended' ? '<p class="faint">Kết quả chung sẽ hiện ở đây khi giáo viên công bố.</p>' : '<p class="faint">Bảng xếp hạng hiện sau khi bạn hoàn tất bài làm.</p>'}</div>
      </main>`;
    /* Trong giờ thi bảng xếp hạng là trực tiếp: tự cập nhật 15 giây một lần. */
    if (board && board.phase === 'running') {
      const refresh = async () => {
        if (!state.alive) return;
        const fresh = await api(`/api/contests/${cid}/results`).catch(() => null);
        const box = ctx.view.querySelector('[data-board]');
        if (fresh && box) box.innerHTML = boardHtml(fresh);
        if (fresh?.phase === 'running') later(refresh, 15_000);
      };
      later(refresh, 15_000);
    }
  }

  function boardHtml(b) {
    const cols = `48px minmax(170px,1fr) repeat(${b.problems.length},72px) 84px`;
    const max = b.problems.reduce((s, p) => s + p.points, 0);
    const live = b.phase === 'running';
    const working = b.rows.filter((r) => !r.finished).length;
    const cell = (c, p) => {
      if (c.score == null) return '<span class="right faint">·</span>';
      const cls = c.score >= p.points ? 'full' : c.score > 0 ? 'part' : 'zero';
      return `<span class="right mono board-cell ${cls}" title="${c.tries} lần nộp">${Number(c.score.toFixed(2))}</span>`;
    };
    return `
      <div class="board-head">
        <h2 class="section-title">Bảng xếp hạng${live ? ' <span class="board-live">trực tiếp</span>' : ''}</h2>
        <span class="faint" style="font-size:13px">${b.rows.length} thí sinh${live ? ` · ${working} bạn đang làm bài, cập nhật mỗi 15 giây` : ''} · bằng điểm thì ai đạt điểm đó sớm hơn xếp trên</span>
      </div>
      <div class="rank-scroll"><div class="table" style="min-width:${48 + 170 + b.problems.length * 72 + 84 + 64}px">
        <div class="trow thead" style="grid-template-columns:${cols}"><span>#</span><span>Thí sinh</span>${b.problems.map((p) => `<span class="right" title="${esc(p.title)}">${esc(p.label)} <small class="faint">/${p.points}</small></span>`).join('')}<span class="right">Tổng /${max}</span></div>
        ${b.rows
          .map(
            (r) => `<div class="trow ${r.username === ctx.user.username ? 'me' : ''}" style="grid-template-columns:${cols}">
              <b class="mono">${r.rank}</b>
              <span class="rank-user"><span class="ellipsis" style="font-weight:550">${esc(r.fullName || r.username)}${r.username === ctx.user.username ? ' <span class="me-tag">· bạn</span>' : ''}</span><small>${r.fullName ? `<span class="mono">${esc(r.username)}</span> · ` : ''}${r.finished ? 'đã kết thúc' : 'đang làm bài'}</small></span>
              ${r.cells.map((c, i) => cell(c, b.problems[i])).join('')}
              <b class="right mono">${Number(r.total.toFixed(2))}</b></div>`,
          )
          .join('') || '<div class="empty">Chưa có thí sinh.</div>'}
      </div></div>`;
  }

  return () => {
    state.alive = false;
    state.timers.forEach(clearTimeout);
    cleanups.splice(0).forEach((fn) => fn());
    document.body.classList.remove('exam-mode');
    if (isFullscreen()) document.exitFullscreen().catch(() => {});
  };
}
