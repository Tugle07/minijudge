import { api } from '../api.js';
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

const draftKey = (cid, label) => `mj-exam-${cid}-${label}`;
const readDraft = (cid, label) => {
  try {
    return localStorage.getItem(draftKey(cid, label));
  } catch {
    return null;
  }
};
const saveDraft = (cid, label, code) => {
  try {
    localStorage.setItem(draftKey(cid, label), code);
  } catch {}
};
const isFullscreen = () => Boolean(document.fullscreenElement);
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
          <span class="faint" style="font-size:13px">${fmtTime(contest.startAt)} → ${fmtTime(contest.endAt)} · ${fmtDuration(contest.endAt - contest.startAt)} · ${contest.problemCount} bài</span>
          <h1 class="page-title">${esc(contest.title)}</h1>
          ${contest.description ? `<div class="statement" style="font-size:15px">${renderMarkdown(contest.description)}</div>` : ''}
          <div class="exam-rules">
            <b>Quy định phòng thi</b>
            <ul>
              <li>Bài làm ở chế độ <b>toàn màn hình</b>. Thoát toàn màn hình, chuyển tab hay chuyển sang ứng dụng khác đều được <b>ghi lại và báo giám thị</b>.</li>
              <li>Chỉ mở bài thi ở <b>một tab, một máy</b>. Mở ở tab/máy thứ hai sẽ bị chặn.</li>
              <li>Không dán code từ bên ngoài vào trình soạn thảo. Phần luyện tập bị khóa trong giờ thi.</li>
              <li>Mỗi bài chia nhiều subtask; đúng hết các test của subtask thì được điểm subtask đó. Điểm của bài là lần nộp cao điểm nhất.</li>
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
          <nav class="exam-tabs" data-tabs></nav>
          <div class="spacer"></div>
          <span class="exam-guard" data-guard title="Trạng thái giám sát"></span>
          <span class="exam-clock mono" data-clock></span>
          <button class="btn" data-finish>Nộp bài &amp; kết thúc</button>
        </header>
        <div class="exam-body">
          <section class="exam-left" data-statement><div class="editor-loading">Đang tải đề…</div></section>
          <section class="exam-right">
            <div class="toolbar">
              <span class="lang-chip">C11 · gcc -O2</span>
              <span class="faint" style="font-size:12.5px" data-saved>Nháp tự lưu trên máy này</span>
              <div class="spacer"></div>
              <button class="file-btn" data-run title="Chạy với input bên dưới, không tính điểm">▷ Chạy thử</button>
              <button class="btn-submit" data-submit title="Ctrl + Enter">Nộp bài <span class="kbd">⌃↵</span></button>
            </div>
            <div class="editor" data-editor><div class="editor-loading">Đang tải trình soạn code…</div></div>
            <div class="editor-status"><span data-cursor>Dòng 1, cột 1</span><span data-lint class="lint-state"></span></div>
            <div class="exam-panel">
              <details class="exam-run" data-run-box><summary>Chạy thử với input tự nhập</summary>
                <textarea data-run-input spellcheck="false" placeholder="Nhập input…"></textarea>
                <div data-run-result></div>
              </details>
              <div data-subs></div>
            </div>
          </section>
        </div>
        <div class="exam-overlay" data-overlay hidden></div>
      </div>`;
    document.body.classList.add('exam-mode');
    const $ = (s) => ctx.view.querySelector(s);

    /* --- Trình soạn code: chặn dán code từ ngoài (chỉ cho dán đoạn đã sao chép ngay trong phòng thi) --- */
    const internalCopies = new Set();
    const rememberCopy = () => {
      const text = String(window.getSelection?.() || '').trim();
      if (text) internalCopies.add(text);
    };
    document.addEventListener('copy', rememberCopy, true);
    document.addEventListener('cut', rememberCopy, true);
    cleanups.push(() => {
      document.removeEventListener('copy', rememberCopy, true);
      document.removeEventListener('cut', rememberCopy, true);
    });
    const editorHost = $('[data-editor]');
    const blockPaste = (e) => {
      const text = (e.clipboardData || e.dataTransfer)?.getData('text') ?? '';
      if (text.trim().length <= PASTE_LIMIT || internalCopies.has(text.trim())) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      toast('Không được dán code từ bên ngoài vào bài thi');
      report('paste_blocked', `${text.length} ký tự`);
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
        el.textContent = 'Đã lưu nháp ✓';
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
        el.textContent = s.checking ? 'Đang kiểm tra cú pháp…' : s.offline ? '' : s.errors ? `✗ ${s.errors} lỗi cú pháp` : s.warnings ? `⚠ ${s.warnings} cảnh báo` : '✓ Không có lỗi cú pháp';
      },
    });
    if (editor.assist) editor.setAssist?.(false);
    cleanups.push(() => editor.destroy?.());

    /* --- Đề bài + bài nộp --- */
    function drawTabs() {
      $('[data-tabs]').innerHTML = state.info.problems
        .map((p) => `<button class="exam-tab ${p.label === state.label ? 'on' : ''} ${p.myScore === p.points ? 'full' : p.myScore ? 'part' : ''}" data-label="${esc(p.label)}"><b>${esc(p.label)}</b><span class="mono">${scoreText(p.myScore, p.points)}</span></button>`)
        .join('');
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
          <div class="prob-head"><h1 class="prob-title"><span class="mono">${esc(p.label)}.</span> ${esc(p.title)}</h1></div>
          <div class="info-chips">
            <span class="info-chip">⏱ ${p.timeMs} ms</span><span class="info-chip">▤ ${p.memoryMb} MB</span><span class="info-chip">★ ${p.points} điểm</span>
          </div>
          <div class="exam-subtasks"><b>Thang điểm</b>${p.subtasks.map((s, i) => `<div><span>Subtask ${i + 1}: ${esc(s.name)}</span><b class="mono">${s.points} điểm</b></div>`).join('')}</div>
          <article class="statement">${renderMarkdown(p.statement)}</article>
          ${p.samples.length ? `<div class="samples"><h3 class="section-title">Ví dụ</h3>${p.samples.map((s, i) => `<div class="sample"><div><div class="sample-head">INPUT #${i + 1}</div><pre>${esc(s.input)}</pre></div><div><div class="sample-head">OUTPUT #${i + 1}</div><pre>${esc(s.output)}</pre></div></div>`).join('')}</div>` : ''}
        </div>`;
      const runInput = $('[data-run-input]');
      if (runInput && !runInput.value) runInput.value = p.samples[0]?.input ?? '';
      await loadSubs();
    }
    function subHtml(s) {
      const sts = s.subtasks?.length
        ? `<div class="exam-st">${s.subtasks.map((st) => `<span class="${st.got ? 'ok' : 'no'}" title="${esc(st.name)}: đúng ${st.passedTests}/${st.tests} test">${st.got ? '✓' : '✗'} ${esc(st.name)} <b class="mono">${st.got}/${st.points}</b></span>`).join('')}</div>`
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
        guard.textContent = ok ? '● Đang giám sát' : '● Rời bài thi';
      }
      const overlay = $('[data-overlay]');
      if (!overlay) return;
      if (state.blocked) {
        overlay.hidden = false;
        overlay.innerHTML = `<div class="exam-overlay-box"><b>${esc(state.blocked.title)}</b><p>${esc(state.blocked.body)}</p>${state.blocked.action || ''}</div>`;
      } else if (!fs) {
        overlay.hidden = false;
        overlay.innerHTML = `<div class="exam-overlay-box"><b>Bạn đã thoát chế độ toàn màn hình</b><p>Việc này đã được ghi lại và báo cho giám thị. Bấm nút bên dưới để quay lại làm bài.</p><button class="btn-primary" data-refs>Quay lại bài thi</button></div>`;
      } else overlay.hidden = true;
    }
    const onFs = () => {
      if (!isFullscreen() && !state.ending) report('fullscreen_exit', '');
      else if (isFullscreen()) report('fullscreen_enter', '');
      guardState();
    };
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        report('tab_hidden', 'Rời trang thi');
      } else if (hiddenAt) {
        report('tab_visible', `Quay lại sau ${Math.round((Date.now() - hiddenAt) / 1000)} giây`);
        hiddenAt = 0;
      }
      guardState();
    };
    const onBlur = () => {
      if (!document.hidden) blurAt = Date.now();
    };
    const onFocus = () => {
      if (blurAt && Date.now() - blurAt > 1500) report('blur', `Chuyển sang cửa sổ khác ${Math.round((Date.now() - blurAt) / 1000)} giây`);
      blurAt = 0;
    };
    const onKey = (e) => {
      const k = e.key?.toLowerCase();
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (e.ctrlKey && k === 'u')) {
        e.preventDefault();
        report('devtools_key', e.key === 'F12' ? 'F12' : `Ctrl+${e.shiftKey ? 'Shift+' : ''}${e.key.toUpperCase()}`);
      }
    };
    const onMenu = (e) => {
      e.preventDefault();
      report('context_menu', '');
    };
    const onLeave = (e) => {
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
          report('second_tab', 'Mở bài thi ở tab thứ hai');
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
        el.textContent = `⏳ ${fmtCountdown(left)}`;
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
      if (tab) return openProblem(tab.dataset.label).catch(handleError);
      if (t.closest('[data-submit]')) return submit();
      if (t.closest('[data-run]')) return runCustom();
      if (t.closest('[data-refs]')) {
        await enterFullscreen();
        return guardState();
      }
      if (t.closest('[data-finish]')) {
        const done = state.info.problems.filter((p) => p.myScore != null).length;
        if (!confirm(`Nộp bài và kết thúc? Bạn đã làm ${done}/${state.info.problems.length} bài. Sau khi kết thúc sẽ không nộp thêm được nữa.`)) return;
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
    if (contest.phase === 'ended' && contest.resultsPublished) board = await api(`/api/contests/${cid}/results`).catch(() => null);
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
        ${board ? `
          <h2 class="section-title">Bảng kết quả</h2>
          <div class="rank-scroll"><div class="table">
            <div class="trow thead" style="grid-template-columns:52px minmax(160px,1fr) repeat(${board.problems.length},64px) 80px"><span>#</span><span>Thí sinh</span>${board.problems.map((p) => `<span class="right">${esc(p.label)}</span>`).join('')}<span class="right">Tổng</span></div>
            ${board.rows.map((r) => `<div class="trow ${r.username === ctx.user.username ? 'me' : ''}" style="grid-template-columns:52px minmax(160px,1fr) repeat(${board.problems.length},64px) 80px"><b class="mono">${r.rank}</b><span class="mono ellipsis">${esc(r.username)}</span>${r.cells.map((c) => `<span class="right mono muted">${c.score == null ? '·' : Number(c.score.toFixed(2))}</span>`).join('')}<b class="right mono">${Number(r.total.toFixed(2))}</b></div>`).join('')}
          </div></div>` : contest.phase === 'ended' ? '<p class="faint">Kết quả chung sẽ hiện ở đây khi giáo viên công bố.</p>' : '<p class="faint">Kết quả chung sẽ được công bố sau khi cuộc thi kết thúc.</p>'}
      </main>`;
  }

  return () => {
    state.alive = false;
    state.timers.forEach(clearTimeout);
    cleanups.splice(0).forEach((fn) => fn());
    document.body.classList.remove('exam-mode');
    if (isFullscreen()) document.exitFullscreen().catch(() => {});
  };
}
