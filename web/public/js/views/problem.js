import { api } from '../api.js';
import { mountEditor } from '../editor.js';
import { highlightC } from '../highlight.js';
import { badge, diffColor, esc, fmtWhen, renderMarkdown, statLine, toast, verdictLabel, verdictVar } from '../ui.js';
import { resultHtml, runResultHtml } from './problem-result.js';

const TEMPLATE = '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n';
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

function statementHtml(p) {
  const chip = (html) => `<span class="info-chip">${html}</span>`;
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
    <nav class="crumbs" aria-label="breadcrumb">
      <button class="link-btn" data-go="#/home">Bài tập</button><span>›</span>
      ${p.set ? `<button class="link-btn" data-go="#/set/${encodeURIComponent(p.set.id)}">${esc(p.set.short)}</button><span>›</span>` : ''}
      <span class="current">${esc(p.id)}</span>
    </nav>
    <h1 class="prob-title">${esc(p.id)} — ${esc(p.title)}</h1>
    <div class="info-chips">
      ${chip(`Thời gian <b>${p.timeMs} ms</b>`)}${chip(`Bộ nhớ <b>${p.memoryMb} MB</b>`)}${chip(`<b>${p.tests}</b> test`)}
      <span class="info-chip" style="color:${diffColor(p.difficulty)}">● ${esc(p.difficulty)}</span>
    </div>
    <div class="statement">${renderMarkdown(p.statement)}</div>
    ${samples ? `<div class="samples"><h3 class="section-title">Ví dụ</h3>${samples}</div>` : ''}
    ${p.hint ? `<div class="hint"><button data-hint aria-expanded="false"><span>Gợi ý</span><span>Xem gợi ý</span></button><div class="hint-body" hidden>${renderMarkdown(p.hint)}</div></div>` : ''}`;
}

export async function render(ctx) {
  const p = await api(`/api/problems/${encodeURIComponent(ctx.arg || '')}`);
  const state = {
    tab: ctx.extra === 'history' ? 'history' : 'submit',
    panel: 'result',
    result: { phase: 'idle' },
    run: null,
    history: [],
    detail: null,
    timer: null,
    alive: true,
  };

  ctx.view.innerHTML = `
    <div class="split" data-split>
      <section class="pane-left" aria-label="Đề bài"><div class="pane-left-inner">${statementHtml(p)}</div></section>
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
            <div class="spacer"></div>
            <label class="file-btn">↑ Tải file .c<input type="file" accept=".c,text/x-c,text/plain" data-file /></label>
            <button class="file-btn" data-run-go title="Ctrl + '">▷ Chạy thử</button>
            <button class="btn-submit wide-only" data-submit title="Ctrl + Enter">Nộp bài <span class="kbd">⌃↵</span></button>
          </div>
          <div class="editor" data-editor></div>
          <div class="result" aria-live="polite">
            <div class="result-tabs" role="tablist">
              <button role="tab" data-ptab="result">Kết quả chấm</button>
              <button role="tab" data-ptab="run">Chạy thử</button>
            </div>
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
  const editor = mountEditor($('[data-editor]'), {
    value: readDraft(p.id) ?? TEMPLATE,
    onChange: (code) => saveDraft(p.id, code),
    onSubmit: () => submit(),
    onRun: () => runCustom(),
  });
  const runInput = $('[data-run-input]');
  runInput.value = p.samples[0]?.input ?? '';

  function drawPanel() {
    ctx.view.querySelectorAll('[data-ptab]').forEach((b) => b.classList.toggle('on', b.dataset.ptab === state.panel));
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
    ctx.view.removeEventListener('click', onClick);
  };
}
