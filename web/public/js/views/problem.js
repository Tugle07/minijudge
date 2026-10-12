import { api } from '../api.js';
import { mountEditor } from '../editor.js';
import { highlightC } from '../highlight.js';
import { badge, diffColor, esc, fmtWhen, renderMarkdown, statLine, toast, verdictLabel, verdictVar } from '../ui.js';
import { compileErrorsHtml, resultHtml, runResultHtml } from './problem-result.js';

const TEMPLATE = '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n';
const SPINNER_SM = '<span class="spin-sm" aria-hidden="true"></span>';
const POLL_MS = 800;
const draftKey = (id) => `mj-code-${id}`;
const readDraft = (id) => {
  try {
    return localStorage.getItem(draftKey(id));
  } catch {
    return null;
  }
};
const saveDraft = (id, code) => {
  try {
    localStorage.setItem(draftKey(id), code);
  } catch {}
};

const MY_LABEL = { ac: ['✓ Đã AC', 'var(--ac)'], tried: ['Đã thử, chưa AC', 'var(--wa)'] };

/* Điều hướng trong khối: bài trước / sau và dải các bài có màu theo trạng thái của mình. */
function setNavHtml(p, set) {
  if (!set) return { top: '', strip: '' };
  const list = set.problems;
  const i = list.findIndex((x) => x.id === p.id);
  const prev = list[i - 1];
  const next = list[i + 1];
  const go = (x, label) => (x ? `<button class="nav-btn" data-go="#/problem/${encodeURIComponent(x.id)}" title="${esc(x.id)} — ${esc(x.title)}">${label}</button>` : `<button class="nav-btn" disabled>${label}</button>`);
  return {
    top: i < 0 ? '' : `<div class="prob-nav">${go(prev, '‹ Bài trước')}<span class="mono muted">${i + 1}/${list.length}</span>${go(next, 'Bài sau ›')}</div>`,
    strip: `
      <div class="set-strip">
        <div class="set-strip-head"><b>${esc(set.set.title)}</b><span class="muted">${set.set.ac}/${set.set.count} bài đã AC</span></div>
        <div class="strip">${list
          .map((x) => `<button class="strip-item ${x.my} ${x.id === p.id ? 'on' : ''}" data-go="#/problem/${encodeURIComponent(x.id)}" title="${esc(x.title)}"><span class="mono">${esc(x.id)}</span><span class="ellipsis">${esc(x.title)}</span></button>`)
          .join('')}</div>
      </div>`,
  };
}

function statementHtml(p, set) {
  const chip = (html) => `<span class="info-chip">${html}</span>`;
  const nav = setNavHtml(p, set);
  const me = set?.problems.find((x) => x.id === p.id);
  const mine = MY_LABEL[p.my];
  const samples = p.samples
    .map(
      (s, i) => `
      <div class="sample">
        <div><div class="sample-head">INPUT #${i + 1}<button data-copy="${i}:input">Sao chép</button></div><pre>${esc(s.input)}</pre></div>
        <div><div class="sample-head">OUTPUT #${i + 1}<button data-copy="${i}:output">Sao chép</button></div><pre>${esc(s.output)}</pre></div>
      </div>`,
    )
    .join('');
  return `
    <div class="prob-top">
      <nav class="crumbs" aria-label="breadcrumb">
        <button class="link-btn" data-go="#/home">Bài tập</button><span>›</span>
        ${p.set ? `<button class="link-btn" data-go="#/set/${encodeURIComponent(p.set.id)}">${esc(p.set.short)}</button><span>›</span>` : ''}
        <span class="current">${esc(p.id)}</span>
      </nav>
      ${nav.top}
    </div>
    <div class="prob-head">
      <h1 class="prob-title">${esc(p.title)} <span class="prob-id mono">${esc(p.id)}</span></h1>
      ${mine ? `<span class="pill" style="color:${mine[1]};background:color-mix(in oklch, ${mine[1]} 14%, transparent)">${mine[0]}</span>` : ''}
    </div>
    <div class="info-chips">
      ${chip(`Thời gian <b>${p.timeMs} ms</b>`)}${chip(`Bộ nhớ <b>${p.memoryMb} MB</b>`)}${chip(`<b>${p.tests}</b> test`)}
      <span class="info-chip" style="color:${diffColor(p.difficulty)}">● ${esc(p.difficulty)}</span>
      ${me ? chip(`<b>${me.solved}</b> bạn đã AC · ${me.acRate}% lớp`) : ''}
    </div>
    <article class="statement">${renderMarkdown(p.statement)}</article>
    ${samples ? `<div class="samples"><h3 class="section-title">Ví dụ</h3>${samples}</div>` : ''}
    ${p.hint ? `<div class="hint"><button data-hint aria-expanded="false"><span>💡 Gợi ý</span><span>Xem gợi ý</span></button><div class="hint-body" hidden>${renderMarkdown(p.hint)}</div></div>` : ''}
    ${nav.strip}`;
}

export async function render(ctx) {
  const p = await api(`/api/problems/${encodeURIComponent(ctx.arg || '')}`);
  const set = p.set ? await api(`/api/sets/${encodeURIComponent(p.set.id)}`).catch(() => null) : null;
  const state = {
    samples: p.samples.map(() => ({ status: 'idle' })),
    tab: ctx.extra === 'history' ? 'history' : 'submit',
    panel: p.samples.length ? 'samples' : 'result',
    result: { phase: 'idle' },
    run: null,
    history: [],
    detail: null,
    timer: null,
    alive: true,
  };

  ctx.view.innerHTML = `
    <div class="split" data-split>
      <section class="pane-left" aria-label="Đề bài"><div class="pane-left-inner">${statementHtml(p, set)}</div></section>
      <div class="divider wide-only" role="separator" aria-orientation="vertical" aria-label="Kéo để đổi độ rộng" tabindex="0"><span></span></div>
      <section class="pane-right" aria-label="Nộp bài">
        <div class="mobile-head narrow-only">
          <button class="link-btn" data-close-editor style="color:var(--fg);height:36px">‹ Đề bài</button>
          <span class="mono muted" style="font-size:14px">${esc(p.id)}.c</span>
          <button class="btn-primary" data-submit style="height:36px;padding:0 14px;font-size:14px">Nộp bài</button>
        </div>
        <div class="rtabs" role="tablist">
          <button role="tab" data-rtab="submit">Nộp bài</button>
          <button role="tab" data-rtab="history">Bài nộp của tôi <span class="count" data-hcount>0</span></button>
        </div>
        <div data-panel="submit" style="display:contents">
          <div class="toolbar">
            <span class="lang-chip">C11 · gcc -O2</span>
            <div class="zoom" role="group" aria-label="Cỡ chữ"><button data-zoom="-1" title="Chữ nhỏ hơn">A−</button><button data-zoom="1" title="Chữ lớn hơn">A+</button></div>
            <label class="assist-toggle" title="Gợi ý từ khóa, hàm thư viện và khung mẫu (for, main, printf…) khi gõ. Người mới nên tắt để tự nhớ cú pháp."><input type="checkbox" data-assist role="switch" /><span class="sw" aria-hidden="true"></span>Gợi ý code</label>
            <div class="spacer"></div>
            <button class="file-btn" data-reset title="Xóa code, quay về khung mẫu">↺ Mẫu</button>
            <label class="file-btn">↑ Tải file .c<input type="file" accept=".c,text/x-c,text/plain" data-file /></label>
            <button class="file-btn" data-run-go title="Ctrl + '">▷ Chạy thử</button>
            <button class="btn-submit wide-only" data-submit title="Ctrl + Enter">Nộp bài <span class="kbd">⌃↵</span></button>
          </div>
          <div class="editor" data-editor><div class="editor-loading">Đang tải trình soạn code…</div></div>
          <div class="editor-status">
            <span data-cursor>Dòng 1, cột 1</span>
            <span data-saved>Nháp tự lưu trên máy này</span>
            <span data-lint class="lint-state"></span>
            <span class="keys wide-only"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> nộp · <kbd>Ctrl</kbd>+<kbd>'</kbd> chạy thử · <kbd>Ctrl</kbd>+<kbd>F</kbd> tìm · <kbd>Ctrl</kbd>+<kbd>Space</kbd> gợi ý</span>
          </div>
          <div class="result" aria-live="polite">
            <div class="result-tabs" role="tablist">
              ${p.samples.length ? '<button role="tab" data-ptab="samples">Test ví dụ</button>' : ''}
              <button role="tab" data-ptab="run">Chạy thử</button>
              <button role="tab" data-ptab="result">Kết quả chấm</button>
            </div>
            <div data-samples hidden></div>
            <div data-result></div>
            <div data-run hidden>
              <div class="run-box">
                <textarea data-run-input spellcheck="false" placeholder="Nhập input để chạy thử…" aria-label="Input chạy thử"></textarea>
                <div class="run-actions">
                  <button class="btn" data-run-go>▷ Chạy</button>
                  ${p.samples.map((_, i) => `<button class="btn" data-fill="${i}">Dùng ví dụ ${i + 1}</button>`).join('')}
                  <span class="faint" style="font-size:12.5px">Không tính vào bài nộp</span>
                </div>
              </div>
              <div data-run-result></div>
            </div>
          </div>
        </div>
        <div class="history" data-panel="history"></div>
      </section>
    </div>
    <div class="mobile-bar narrow-only"><span data-mobile-verdict></span><button class="btn-primary" data-open-editor>Viết code</button></div>`;

  const $ = (sel) => ctx.view.querySelector(sel);
  let savedTimer = null;
  const editor = await mountEditor($('[data-editor]'), {
    value: readDraft(p.id) ?? TEMPLATE,
    onChange: (code) => {
      saveDraft(p.id, code);
      const el = $('[data-saved]');
      el.textContent = 'Đã lưu nháp ✓';
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (el.textContent = 'Nháp tự lưu trên máy này'), 1500);
    },
    onSubmit: () => submit(),
    onRun: () => runCustom(),
    onCursor: ({ line, col, lines }) => ($('[data-cursor]').textContent = `Dòng ${line}, cột ${col} · ${lines} dòng`),
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
      el.textContent = s.checking
        ? 'Đang kiểm tra cú pháp…'
        : s.offline
          ? ''
          : s.errors
            ? `✗ ${s.errors} lỗi cú pháp${s.warnings ? `, ${s.warnings} cảnh báo` : ''} — rê chuột vào dấu đỏ để xem`
            : s.warnings
              ? `⚠ ${s.warnings} cảnh báo`
              : '✓ Không có lỗi cú pháp';
    },
  });
  $('[data-assist]').checked = editor.assist;
  $('[data-assist]').addEventListener('change', (e) => {
    editor.setAssist(e.target.checked);
    toast(e.target.checked ? 'Đã bật gợi ý code' : 'Đã tắt gợi ý code — tự gõ để nhớ cú pháp nhé');
  });
  const runInput = $('[data-run-input]');
  runInput.value = p.samples[0]?.input ?? '';

  const tokens = (s) => String(s ?? '').trim().split(/\s+/).join(' ');
  function samplesHtml() {
    const running = state.samples.some((s) => s.status === 'running');
    const done = state.samples.filter((s) => s.status === 'pass' || s.status === 'fail' || s.status === 'error');
    const pass = state.samples.filter((s) => s.status === 'pass').length;
    const summary = state.samplesCE != null
      ? '<span class="bad-text">Code chưa biên dịch được — sửa các lỗi bên dưới</span>'
      : done.length === state.samples.length
      ? `<span class="${pass === done.length ? 'ok-text' : 'bad-text'}">${pass}/${done.length} test ví dụ đúng${pass === done.length ? ' — sẵn sàng nộp bài!' : ''}</span>`
      : '<span class="faint">Chạy code với các test ví dụ trong đề, không tính vào bài nộp.</span>';
    const card = (s, i) => {
      const icon = { idle: '○', running: SPINNER_SM, pass: '✓', fail: '✗', error: '!' }[s.status];
      const body = s.status === 'fail'
        ? `<div class="sample-cmp"><div><span>Đáp án</span><pre>${esc(p.samples[i].output)}</pre></div><div><span>Output của bạn</span><pre>${esc(s.output) || '<span class="faint">(không in gì)</span>'}</pre></div></div>`
        : s.status === 'error'
          ? `<div class="sample-err">${esc(s.message)}</div>`
          : '';
      return `<div class="sample-run ${s.status}"><div class="sample-run-head"><span class="sr-icon">${icon}</span><b>Ví dụ ${i + 1}</b><span class="faint mono">${s.time != null ? `${s.time} ms` : ''}</span></div>${body}</div>`;
    };
    return `
      <div class="samples-panel">
        <div class="run-actions"><button class="btn-run-all" data-run-samples ${running ? 'disabled' : ''}>▷ Chạy ${state.samples.length} test ví dụ</button>${summary}</div>
        ${state.samplesCE != null ? compileErrorsHtml(state.samplesCE) : `<div class="sample-runs">${state.samples.map(card).join('')}</div>`}
      </div>`;
  }

  async function runSamples() {
    if (state.samples.some((s) => s.status === 'running')) return;
    if (!editor.value.trim()) return toast('Mã nguồn đang trống');
    Object.assign(state, { tab: 'submit', panel: 'samples' });
    state.samples = p.samples.map(() => ({ status: 'running' }));
    state.samplesCE = null;
    drawTabs();
    drawPanel();
    for (let i = 0; i < p.samples.length && state.alive; i++) {
      try {
        const input = p.samples[i].input;
        const r = await api('/api/run', { method: 'POST', body: { problemId: p.id, source: editor.value, input } });
        if (r.verdict === 'CE') {
          editor.showDiagnostics(r.compile_log);
          state.samples = state.samples.map(() => ({ status: 'error' }));
          state.samplesCE = r.compile_log || '';
          break;
        }
        state.samples[i] = r.verdict === 'OK'
          ? { status: tokens(r.output) === tokens(p.samples[i].output) ? 'pass' : 'fail', output: r.output, time: r.time_ms }
          : { status: 'error', message: `${verdictLabel(r.verdict)} (${r.verdict})`, time: r.time_ms };
      } catch (err) {
        state.samples[i] = { status: 'error', message: err.message };
      }
      if (state.alive) drawPanel();
    }
    if (state.alive) drawPanel();
  }

  function drawPanel() {
    ctx.view.querySelectorAll('[data-ptab]').forEach((b) => b.classList.toggle('on', b.dataset.ptab === state.panel));
    $('[data-samples]').hidden = state.panel !== 'samples';
    if (state.panel === 'samples') $('[data-samples]').innerHTML = samplesHtml();
    $('[data-result]').hidden = state.panel !== 'result';
    $('[data-run]').hidden = state.panel !== 'run';
    $('[data-run-result]').innerHTML = runResultHtml(state.run);
    ctx.view.querySelectorAll('[data-run-go]').forEach((b) => (b.disabled = Boolean(state.run?.loading)));
  }

  async function runCustom() {
    if (state.run?.loading) return;
    if (!editor.value.trim()) return toast('Mã nguồn đang trống');
    Object.assign(state, { tab: 'submit', panel: 'run', run: { loading: true } });
    drawTabs();
    drawPanel();
    try {
      state.run = await api('/api/run', { method: 'POST', body: { problemId: p.id, source: editor.value, input: runInput.value } });
      if (state.alive) editor.showDiagnostics(state.run.compile_log);
    } catch (err) {
      state.run = { error: err.message };
    }
    if (state.alive) drawPanel();
  }

  function drawTabs() {
    ctx.view.querySelectorAll('[data-rtab]').forEach((b) => b.classList.toggle('on', b.dataset.rtab === state.tab));
    $('[data-panel="submit"]').hidden = state.tab !== 'submit';
    $('[data-panel="submit"]').style.display = state.tab === 'submit' ? 'contents' : 'none';
    $('[data-panel="history"]').hidden = state.tab !== 'history';
  }
  function drawResult() {
    $('[data-result]').innerHTML = resultHtml(state.result, p.tests);
    const judging = state.result.phase === 'judging';
    ctx.view.querySelectorAll('[data-submit]').forEach((b) => (b.disabled = judging));
    const v = state.result.sub?.verdict;
    $('[data-mobile-verdict]').innerHTML = state.result.phase === 'done' ? badge(v) : '';
  }
  function drawHistory() {
    $('[data-hcount]').textContent = state.history.length;
    if (state.detail) {
      const s = state.detail;
      $('[data-panel="history"]').innerHTML = `
        <div class="sub-detail">
          <div class="sub-detail-head">
            <button class="link-btn" data-back-history>‹ Tất cả bài nộp</button>
            <span class="mono faint" style="font-size:13px">#${s.id} · ${fmtWhen(s.createdAt)}</span>
            <button class="btn" data-load-code style="height:30px;font-size:13px">↺ Nạp code này vào trình soạn</button>
          </div>
          <div class="result" style="max-height:none;border:1px solid var(--line);border-radius:var(--r-md)">${resultHtml({ phase: s.verdict === 'PENDING' ? 'judging' : 'done', sub: s }, p.tests)}</div>
          <pre class="sub-code">${highlightC(s.source).html}</pre>
        </div>`;
      return;
    }
    $('[data-panel="history"]').innerHTML = state.history.length
      ? state.history
          .map(
            (h) => `
          <div class="history-row clickable" data-sub="${h.id}" role="button" tabindex="0" title="Xem chi tiết và code">
            <span class="mono faint">#${h.id}</span>
            <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
              <span class="vtext" style="--v:${verdictVar(h.verdict)};font-weight:500">${badge(h.verdict)}${esc(verdictLabel(h.verdict))}</span>
              <span class="faint" style="font-size:13px">${fmtWhen(h.created_at)}</span>
            </span>
            <span class="mono muted right" style="font-size:13px">${statLine(h)}</span>
          </div>`,
          )
          .join('')
      : '<p class="faint" style="font-size:14px">Bạn chưa nộp bài này.</p>';
  }
  async function loadHistory() {
    state.history = await api(`/api/submissions?problem=${encodeURIComponent(p.id)}`);
    if (state.alive) drawHistory();
  }

  async function poll(id) {
    try {
      const sub = await api(`/api/submissions/${id}`);
      if (!state.alive) return;
      if (sub.verdict === 'PENDING') {
        state.timer = setTimeout(() => poll(id), POLL_MS);
        return;
      }
      state.result = { phase: 'done', sub };
      drawResult();
      editor.showDiagnostics(sub.compileLog);
      loadHistory();
    } catch (err) {
      state.result = { phase: 'idle' };
      drawResult();
      toast(err.message);
    }
  }

  async function submit() {
    if (state.result.phase === 'judging') return;
    if (!editor.value.trim()) return toast('Mã nguồn đang trống');
    Object.assign(state, { tab: 'submit', panel: 'result', result: { phase: 'judging' } });
    drawTabs();
    drawPanel();
    drawResult();
    try {
      const { id } = await api('/api/submissions', { method: 'POST', body: { problemId: p.id, source: editor.value } });
      poll(id);
    } catch (err) {
      state.result = { phase: 'idle' };
      drawResult();
      toast(err.message);
    }
  }

  const onClick = async (e) => {
    const t = e.target;
    const subRow = t.closest('[data-sub]');
    if (subRow) {
      state.detail = await api(`/api/submissions/${subRow.dataset.sub}`);
      return drawHistory();
    }
    if (t.closest('[data-back-history]')) return (state.detail = null), drawHistory();
    if (t.closest('[data-load-code]')) {
      const { id, source } = state.detail;
      editor.value = source;
      Object.assign(state, { tab: 'submit', detail: null });
      drawTabs();
      drawHistory();
      return toast(`Đã nạp code của bài nộp #${id}`);
    }
    const goto = t.closest('[data-goto-line]');
    if (goto) {
      document.body.classList.add('editor-open');
      return editor.gotoLine(Number(goto.dataset.gotoLine));
    }
    const zoom = t.closest('[data-zoom]');
    if (zoom) return editor.zoom(Number(zoom.dataset.zoom));
    if (t.closest('[data-reset]')) {
      if (editor.value !== TEMPLATE && !confirm('Xóa code hiện tại và quay về khung mẫu?')) return;
      editor.value = TEMPLATE;
      return editor.focus();
    }
    if (t.closest('[data-run-samples]')) return runSamples();
    if (t.closest('[data-submit]')) return submit();
    if (t.closest('[data-run-go]')) return runCustom();
    const ptab = t.closest('[data-ptab]');
    if (ptab) return (state.panel = ptab.dataset.ptab), drawPanel();
    const fill = t.closest('[data-fill]');
    if (fill) return (runInput.value = p.samples[Number(fill.dataset.fill)].input), runInput.focus();
    const tab = t.closest('[data-rtab]');
    if (tab) return (state.tab = tab.dataset.rtab), drawTabs();
    if (t.closest('[data-open-editor]')) return document.body.classList.add('editor-open'), editor.focus();
    if (t.closest('[data-close-editor]')) return document.body.classList.remove('editor-open');
    const hint = t.closest('[data-hint]');
    if (hint) {
      const body = hint.nextElementSibling;
      body.hidden = !body.hidden;
      hint.setAttribute('aria-expanded', String(!body.hidden));
      hint.lastElementChild.textContent = body.hidden ? 'Xem gợi ý' : 'Thu gọn';
      return;
    }
    const copy = t.closest('[data-copy]');
    if (copy) {
      const [i, key] = copy.dataset.copy.split(':');
      try {
        await navigator.clipboard.writeText(p.samples[Number(i)][key]);
      } catch {}
      copy.textContent = 'Đã chép';
      setTimeout(() => (copy.textContent = 'Sao chép'), 1400);
    }
  };
  ctx.view.addEventListener('click', onClick);
  $('[data-file]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    editor.value = await file.text();
    toast(`Đã tải ${file.name}`);
    e.target.value = '';
  });

  const split = $('[data-split]');
  const left = $('.pane-left');
  const setSplit = (pct) => left.style.setProperty('--split', `${Math.min(70, Math.max(30, pct))}%`);
  const divider = $('.divider');
  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rect = split.getBoundingClientRect();
    const move = (ev) => setSplit(((ev.clientX - rect.left) / rect.width) * 100);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
  divider.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const cur = parseFloat(left.style.getPropertyValue('--split')) || 50;
    setSplit(cur + (e.key === 'ArrowLeft' ? -3 : 3));
  });

  drawTabs();
  drawPanel();
  drawResult();
  drawHistory();
  loadHistory();

  return () => {
    state.alive = false;
    clearTimeout(state.timer);
    clearTimeout(savedTimer);
    editor.destroy?.();
    ctx.view.removeEventListener('click', onClick);
  };
}
