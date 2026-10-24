import { api } from '../api.js';
import { readDraft as draftGet, saveDraft as draftSet } from '../drafts.js';
import { mountEditor } from '../editor.js';
import { highlightCode } from '../highlight.js';
import { badge, diffMeter, esc, fmtWhen, langBadge, renderMarkdown, statLine, toast, verdictLabel, verdictVar } from '../ui.js';
import { compileErrorsHtml, resultHtml, runResultHtml } from './problem-result.js';

export const TEMPLATES = {
  c: '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n',
  cpp: '#include <iostream>\n\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}\n',
  py: '# Đọc dữ liệu từ sys.stdin và in ra màn hình\nimport sys\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n',
};

export const LANG_CONFIG = {
  c: { label: 'C (C11)', ext: '.c', badge: 'C11 · gcc -O2' },
  cpp: { label: 'C++ (C++17)', ext: '.cpp', badge: 'C++17 · g++ -O2' },
  py: { label: 'Python (Python 3)', ext: '.py', badge: 'Python 3.11+' },
};

const SPINNER_SM = '<span class="spin-sm" aria-hidden="true"></span>';
const POLL_MS = 800;
const readDraft = (id, lang = 'c') => draftGet(`code-${id}-${lang}`) || (lang === 'c' ? draftGet(`code-${id}`) : null);
const saveDraft = (id, lang, code) => draftSet(`code-${id}-${lang}`, code);
const getLastLang = (id) => draftGet(`lang-${id}`) || 'c';
const setLastLang = (id, lang) => draftSet(`lang-${id}`, lang);

const MY_LABEL = { ac: ['Bạn đã AC bài này', 'var(--ac)'], tried: ['Bạn đã nộp, chưa AC', 'var(--wa)'] };

/* Dải A, B, C… trên đầu trang bài tập — thanh điều hướng nhanh như trong phòng thi.
 * Màu viền: xanh nếu đã AC, cam nếu đã thử chưa AC. Phím tắt Alt + A/B/C… nhảy sang bài tương ứng. */
function letter(i) {
  return i < 26 ? String.fromCharCode(65 + i) : `${i + 1}`;
}
function setNavHtml(p, set) {
  if (!set) return { top: '', strip: '' };
  const list = set.problems;
  const i = list.findIndex((x) => x.id === p.id);
  const prev = list[i - 1];
  const next = list[i + 1];
  const go = (x, label) => (x ? `<button class="nav-btn" data-go="#/problem/${encodeURIComponent(x.id)}" title="${esc(x.id)} — ${esc(x.title)}">${label}</button>` : `<button class="nav-btn" disabled>${label}</button>`);
  const cls = (x) => (x.my === 'ac' ? 'full' : x.my === 'tried' ? 'part' : 'todo');
  return {
    top: i < 0 ? '' : `<div class="prob-nav">${go(prev, '‹ Bài trước')}<span class="mono muted">${i + 1}/${list.length}</span>${go(next, 'Bài sau ›')}</div>`,
    strip: `
      <nav class="exam-rail set-rail" aria-label="Danh sách bài trong khối">
        <span class="rail-count"><b>${list.length} bài</b><small>Đã AC ${set.set.ac}/${set.set.count}</small></span>
        ${list
          .map((x, j) => `<button class="exam-tab ${cls(x)} ${x.id === p.id ? 'on' : ''}" data-go="#/problem/${encodeURIComponent(x.id)}" title="${esc(x.id)}. ${esc(x.title)} · Alt + ${letter(j)}" aria-label="Bài ${letter(j)}: ${esc(x.title)}">${letter(j)}</button>`)
          .join('')}
      </nav>`,
  };
}

function statementHtml(p, set) {
  const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
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
      ${mine ? `<span class="pill" style="color:${mine[1]}">${mine[0]}</span>` : ''}
    </div>
    <dl class="prob-facts">
      ${fact('Thời gian', `<span class="num">${p.timeMs} ms</span>`)}${fact('Bộ nhớ', `<span class="num">${p.memoryMb} MB</span>`)}${fact('Số test', `<span class="num">${p.tests}</span>`)}
      ${fact('Độ khó', diffMeter(p.difficulty))}
      ${me ? fact('Lớp đã AC', `<span class="num">${me.solved}</span> bạn · <span class="num">${me.acRate}%</span>`) : ''}
    </dl>
    <article class="statement">${renderMarkdown(p.statement)}</article>
    ${samples ? `<div class="samples"><h3 class="section-title">Ví dụ</h3>${samples}</div>` : ''}
    ${p.hint ? `<div class="hint"><button data-hint aria-expanded="false"><span>Gợi ý</span><span>Xem gợi ý</span></button><div class="hint-body" hidden>${renderMarkdown(p.hint)}</div></div>` : ''}`;
}

export async function render(ctx) {
  const p = await api(`/api/problems/${encodeURIComponent(ctx.arg || '')}`);
  const set = p.set ? await api(`/api/sets/${encodeURIComponent(p.set.id)}`).catch(() => null) : null;
  const initialLang = getLastLang(p.id) || 'c';
  const state = {
    lang: initialLang,
    samples: p.samples.map(() => ({ status: 'idle' })),
    tab: ctx.extra === 'history' ? 'history' : 'submit',
    result: { phase: 'idle' },
    run: null,
    history: [],
    detail: null,
    timer: null,
    alive: true,
  };

  const nav = setNavHtml(p, set);
  ctx.view.innerHTML = `
    ${nav.strip}
    <div class="split exam-body" data-split>
      <section class="pane-left exam-left" aria-label="Đề bài"><div class="pane-left-inner">${statementHtml(p, set)}</div></section>
      <div class="exam-sep" data-sep role="separator" aria-orientation="vertical" aria-label="Kéo để chỉnh độ rộng" tabindex="0"></div>
      <section class="pane-right exam-right" aria-label="Soạn mã và nộp bài">
        <div class="mobile-head narrow-only">
          <button class="link-btn" data-close-editor style="color:var(--fg);height:36px">‹ Đề bài</button>
          <span class="mono muted" style="font-size:14px">${esc(p.id)}${LANG_CONFIG[initialLang]?.ext || '.c'}</span>
          <button class="btn-primary" data-submit style="height:36px;padding:0 14px;font-size:14px">Nộp bài</button>
        </div>
        <header class="toolbar">
          <select class="lang-select" data-lang aria-label="Ngôn ngữ lập trình" style="background:var(--bg3);color:var(--fg);border:1px solid var(--line);border-radius:var(--r-sm);font-weight:600;font-size:13px;padding:4px 8px;cursor:pointer;">
            <option value="c" ${state.lang === 'c' ? 'selected' : ''}>C (C11)</option>
            <option value="cpp" ${state.lang === 'cpp' ? 'selected' : ''}>C++ (C++17)</option>
            <option value="py" ${state.lang === 'py' ? 'selected' : ''}>Python (Python 3)</option>
          </select>
          <div class="zoom" role="group" aria-label="Cỡ chữ"><button data-zoom="-1" title="Chữ nhỏ hơn">A−</button><button data-zoom="1" title="Chữ lớn hơn">A+</button></div>
          <button class="file-btn" data-reset title="Xóa code, quay về khung mẫu">Khung mẫu</button>
          <label class="file-btn" data-upload-label>Tải file ${LANG_CONFIG[state.lang]?.ext || '.c'}<input type="file" accept="${LANG_CONFIG[state.lang]?.ext || '.c'},text/plain" data-file /></label>
          <span class="faint wide-only" style="font-size:12.5px" data-saved>Nháp tự lưu trên máy này</span>
          <div class="spacer"></div>
          <button class="btn-submit wide-only" data-submit title="Ctrl + Enter">Nộp bài <span class="kbd">Ctrl Enter</span></button>
        </header>
        <div class="editor" data-editor><div class="editor-loading">Đang tải trình soạn code…</div></div>
        <div class="editor-status">
          <span data-cursor>Dòng 1, cột 1</span>
          <label class="assist-toggle wide-only" title="Gợi ý từ khóa và hàm C khi gõ"><input type="checkbox" data-assist role="switch" /><span class="sw" aria-hidden="true"></span><span>Gợi ý code</span></label>
          <span class="diag-pills" aria-label="Kết quả kiểm tra cú pháp">
            <span class="diag-pill err" data-diag-err title="Số lỗi cú pháp"><span class="diag-i" aria-hidden="true">⊘</span><b data-diag-err-n>0</b></span>
            <span class="diag-pill warn" data-diag-warn title="Số cảnh báo"><span class="diag-i" aria-hidden="true">△</span><b data-diag-warn-n>0</b></span>
          </span>
          <span class="keys wide-only" style="margin-left:auto;font-size:12px;color:var(--fg3)"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> nộp · <kbd>Ctrl</kbd>+<kbd>'</kbd> chạy</span>
        </div>
        <div class="editor-sep" data-editor-sep role="separator" aria-orientation="horizontal" aria-label="Kéo xuống để mở rộng khung code" tabindex="0"></div>
        <div class="exam-io">
          <div class="io-col">
            <div class="io-head">
              <b>inp.txt</b>
              <span class="io-tools" data-fill-tools>
                ${p.samples.map((_, i) => `<button class="chip" data-fill="${i}">Dùng ví dụ ${i + 1}</button>`).join('')}
                <button class="chip" data-clear-input title="Xoá input">Xoá</button>
              </span>
            </div>
            <textarea data-run-input spellcheck="false" placeholder="Nhập dữ liệu rồi bấm Chạy thử"></textarea>
          </div>
          <div class="io-col">
            <div class="io-head">
              <b>out.txt</b>
              <button class="btn-dark io-run" data-run-go title="Ctrl + '">Chạy thử</button>
            </div>
            <div class="io-output" data-run-result></div>
          </div>
        </div>
        <div class="result-tabs" role="tablist" style="margin-top:12px">
          <button class="on" role="tab" data-rtab="submit">Kết quả chấm</button>
          ${p.samples.length > 1 ? '<button role="tab" data-rtab="samples">Chạy tất cả ví dụ</button>' : ''}
          <button role="tab" data-rtab="history">Bài nộp của tôi (<span data-hcount>0</span>)</button>
        </div>
        <div data-tab-content="submit" class="exam-latest" style="margin-top:4px">
          <div class="result" data-result></div>
        </div>
        ${p.samples.length > 1 ? '<div data-tab-content="samples" class="exam-latest" style="margin-top:4px" hidden><div class="result" data-samples></div></div>' : ''}
        <div data-panel="history" class="history exam-latest" style="margin-top:4px" hidden></div>
      </section>
    </div>
    <div class="mobile-bar narrow-only"><span data-mobile-verdict></span><button class="btn-primary" data-open-editor>Viết code</button></div>`;

  const $ = (sel) => ctx.view.querySelector(sel);
  let savedTimer = null;
  const editor = await mountEditor($('[data-editor]'), {
    value: readDraft(p.id, state.lang) ?? TEMPLATES[state.lang] ?? TEMPLATES.c,
    onChange: (code) => {
      saveDraft(p.id, state.lang, code);
      const el = $('[data-saved]');
      if (el) el.textContent = 'Đã lưu nháp';
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => {
        if (el) el.textContent = 'Nháp tự lưu trên máy này';
      }, 1500);
    },
    onSubmit: () => submit(),
    onRun: () => runCustom(),
    onCursor: ({ line, col, lines }) => {
      const cur = $('[data-cursor]');
      if (cur) cur.textContent = `Dòng ${line}, cột ${col} · ${lines} dòng`;
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

  const assistCheck = $('[data-assist]');
  if (assistCheck && editor.setAssist) {
    assistCheck.checked = editor.assist;
    assistCheck.addEventListener('change', (e) => {
      editor.setAssist(e.target.checked);
      toast(e.target.checked ? 'Đã bật gợi ý code' : 'Đã tắt gợi ý code');
    });
  }

  const runInput = $('[data-run-input]');
  if (runInput && !runInput.value) runInput.value = p.samples[0]?.input ?? '';
  const runOutput = $('[data-run-result]');
  if (runOutput) runOutput.innerHTML = runResultHtml();

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
        <div class="run-actions"><button class="btn-run-all" data-run-samples ${running ? 'disabled' : ''}>Chạy ${state.samples.length} test ví dụ</button>${summary}</div>
        ${state.samplesCE != null ? compileErrorsHtml(state.samplesCE) : `<div class="sample-runs">${state.samples.map(card).join('')}</div>`}
      </div>`;
  }

  async function runSamples() {
    if (state.samples.some((s) => s.status === 'running')) return;
    if (!editor.value.trim()) return toast('Mã nguồn đang trống');
    state.tab = 'samples';
    state.samples = p.samples.map(() => ({ status: 'running' }));
    state.samplesCE = null;
    drawTabs();
    for (let i = 0; i < p.samples.length && state.alive; i++) {
      try {
        const input = p.samples[i].input;
        const r = await api('/api/run', { method: 'POST', body: { problemId: p.id, source: editor.value, input, lang: state.lang } });
        if (r.verdict === 'CE') {
          editor.showDiagnostics?.(r.compile_log);
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
      if (state.alive && state.tab === 'samples') {
        const el = $('[data-samples]');
        if (el) el.innerHTML = samplesHtml();
      }
    }
    if (state.alive && state.tab === 'samples') {
      const el = $('[data-samples]');
      if (el) el.innerHTML = samplesHtml();
    }
  }

  async function runCustom() {
    if (state.run?.loading) return;
    if (!editor.value.trim()) return toast('Mã nguồn đang trống');
    state.run = { loading: true };
    const out = $('[data-run-result]');
    if (out) out.innerHTML = runResultHtml({ loading: true });
    ctx.view.querySelectorAll('[data-run-go]').forEach((b) => (b.disabled = true));
    try {
      state.run = await api('/api/run', { method: 'POST', body: { problemId: p.id, source: editor.value, input: runInput.value, lang: state.lang } });
      if (state.alive && state.run.compile_log) {
        editor.showDiagnostics?.(state.run.compile_log);
      }
    } catch (err) {
      state.run = { error: err.message };
    }
    ctx.view.querySelectorAll('[data-run-go]').forEach((b) => (b.disabled = false));
    if (state.alive && out) out.innerHTML = runResultHtml(state.run);
  }

  function drawTabs() {
    ctx.view.querySelectorAll('[data-rtab]').forEach((b) => b.classList.toggle('on', b.dataset.rtab === state.tab));
    const submitEl = $('[data-tab-content="submit"]');
    if (submitEl) submitEl.hidden = state.tab !== 'submit';
    const samplesEl = $('[data-tab-content="samples"]');
    if (samplesEl) {
      samplesEl.hidden = state.tab !== 'samples';
      if (state.tab === 'samples') {
        const sbox = $('[data-samples]');
        if (sbox) sbox.innerHTML = samplesHtml();
      }
    }
    const histEl = $('[data-panel="history"]');
    if (histEl) histEl.hidden = state.tab !== 'history';
  }

  function drawResult() {
    const rbox = $('[data-result]');
    if (rbox) rbox.innerHTML = resultHtml(state.result, p.tests);
    const judging = state.result.phase === 'judging';
    ctx.view.querySelectorAll('[data-submit]').forEach((b) => (b.disabled = judging));
    const v = state.result.sub?.verdict;
    const mv = $('[data-mobile-verdict]');
    if (mv) mv.innerHTML = state.result.phase === 'done' ? badge(v) : '';
  }

  function drawHistory() {
    const hc = $('[data-hcount]');
    if (hc) hc.textContent = state.history.length;
    const panel = $('[data-panel="history"]');
    if (!panel) return;
    if (state.detail) {
      const s = state.detail;
      panel.innerHTML = `
        <div class="sub-detail">
          <div class="sub-detail-head">
            <button class="link-btn" data-back-history>‹ Tất cả bài nộp</button>
            <span class="mono faint" style="font-size:13px">#${s.id} · ${langBadge(s.lang)} · ${fmtWhen(s.createdAt)}</span>
            <button class="btn" data-load-code style="height:30px;font-size:13px">Nạp code này vào trình soạn</button>
          </div>
          <div class="result" style="max-height:none">${resultHtml({ phase: s.verdict === 'PENDING' ? 'judging' : 'done', sub: s }, p.tests)}</div>
          <pre class="sub-code">${highlightCode(s.source, s.lang || 'c').html}</pre>
        </div>`;
      return;
    }
    panel.innerHTML = state.history.length
      ? state.history
          .map(
            (h) => `
          <div class="history-row clickable" data-sub="${h.id}" role="button" tabindex="0" title="Xem chi tiết và code">
            <span class="mono faint">#${h.id}</span>
            <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
              <span style="display:flex;align-items:center;gap:6px;">
                ${langBadge(h.lang)}
                <span class="vtext" style="--v:${verdictVar(h.verdict)};font-weight:500">${badge(h.verdict)}${esc(verdictLabel(h.verdict))}</span>
              </span>
              <span class="faint" style="font-size:13px">${fmtWhen(h.created_at)}</span>
            </span>
            <span class="mono muted right" style="font-size:13px">${statLine(h)}</span>
          </div>`,
          )
          .join('')
      : '<p class="faint" style="font-size:14px;padding:8px">Bạn chưa nộp bài này.</p>';
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
      editor.showDiagnostics?.(sub.compileLog);
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
    Object.assign(state, { tab: 'submit', result: { phase: 'judging' } });
    drawTabs();
    drawResult();
    try {
      const { id } = await api('/api/submissions', { method: 'POST', body: { problemId: p.id, source: editor.value, lang: state.lang } });
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
      const { id, source, lang } = state.detail;
      if (lang && lang !== state.lang) {
        state.lang = lang;
        const lSel = $('[data-lang]');
        if (lSel) lSel.value = lang;
        setLastLang(p.id, lang);
      }
      editor.value = source;
      Object.assign(state, { tab: 'submit', detail: null });
      drawTabs();
      drawHistory();
      return toast(`Đã nạp code của bài nộp #${id} (${LANG_CONFIG[state.lang]?.label || state.lang})`);
    }
    const goto = t.closest('[data-goto-line]');
    if (goto) {
      document.body.classList.add('editor-open');
      return editor.gotoLine(Number(goto.dataset.gotoLine));
    }
    const zoom = t.closest('[data-zoom]');
    if (zoom) return editor.zoom(Number(zoom.dataset.zoom));
    if (t.closest('[data-reset]')) {
      const tpl = TEMPLATES[state.lang] || TEMPLATES.c;
      if (editor.value !== tpl && !confirm(`Xóa code hiện tại và quay về khung mẫu ${LANG_CONFIG[state.lang]?.label || ''}?`)) return;
      editor.value = tpl;
      return editor.focus();
    }
    if (t.closest('[data-run-samples]')) return runSamples();
    if (t.closest('[data-submit]')) return submit();
    if (t.closest('[data-run-go]')) return runCustom();
    const fill = t.closest('[data-fill]');
    if (fill) {
      const inp = $('[data-run-input]');
      inp.value = p.samples[Number(fill.dataset.fill)]?.input ?? '';
      $('[data-run-result]').innerHTML = runResultHtml();
      return inp.focus();
    }
    if (t.closest('[data-clear-input]')) {
      const inp = $('[data-run-input]');
      inp.value = '';
      $('[data-run-result]').innerHTML = runResultHtml();
      return inp.focus();
    }
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

  const langSelect = $('[data-lang]');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      const newLang = e.target.value;
      if (newLang === state.lang) return;
      saveDraft(p.id, state.lang, editor.value);
      state.lang = newLang;
      setLastLang(p.id, newLang);
      const code = readDraft(p.id, newLang) || TEMPLATES[newLang] || TEMPLATES.c;
      editor.value = code;
      const cfg = LANG_CONFIG[newLang] || LANG_CONFIG.c;
      const fileInput = $('[data-file]');
      if (fileInput) fileInput.accept = `${cfg.ext},text/plain`;
      const upLabel = $('[data-upload-label]');
      if (upLabel) upLabel.childNodes[0].nodeValue = `Tải file ${cfg.ext}`;
      const mobLabel = $('.mobile-head .mono.muted');
      if (mobLabel) mobLabel.textContent = `${p.id}${cfg.ext}`;
      toast(`Đã chuyển sang ${cfg.label}`);
    });
  }

  $('[data-file]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    let detected = null;
    if (name.endsWith('.cpp') || name.endsWith('.cc') || name.endsWith('.cxx')) detected = 'cpp';
    else if (name.endsWith('.py')) detected = 'py';
    else if (name.endsWith('.c')) detected = 'c';
    if (detected && detected !== state.lang) {
      state.lang = detected;
      const lSel = $('[data-lang]');
      if (lSel) lSel.value = detected;
      setLastLang(p.id, detected);
      const cfg = LANG_CONFIG[detected] || LANG_CONFIG.c;
      const upLabel = $('[data-upload-label]');
      if (upLabel) upLabel.childNodes[0].nodeValue = `Tải file ${cfg.ext}`;
      const mobLabel = $('.mobile-head .mono.muted');
      if (mobLabel) mobLabel.textContent = `${p.id}${cfg.ext}`;
    }
    editor.value = await file.text();
    toast(`Đã tải ${file.name}`);
    e.target.value = '';
  });

  const sep = $('[data-sep]');
  const body = ctx.view.querySelector('[data-split]');
  const initial = parseFloat(localStorage.getItem('mj-split-w') || localStorage.getItem('mj-exam-split')) || 46;
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
    const onUp = (e) => {
      sep.removeEventListener('pointermove', onMove);
      sep.removeEventListener('pointerup', onUp);
      sep.classList.remove('dragging');
      try {
        sep.releasePointerCapture(e.pointerId);
        const val = parseFloat(body.style.getPropertyValue('--left-w')) || 46;
        localStorage.setItem('mj-split-w', val);
        localStorage.setItem('mj-exam-split', val);
      } catch {}
    };
    sep.addEventListener('pointermove', onMove);
    sep.addEventListener('pointerup', onUp);
  });

  sep.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const cur = parseFloat(body.style.getPropertyValue('--left-w')) || 46;
    const next = Math.max(25, Math.min(70, cur + (e.key === 'ArrowLeft' ? -3 : 3)));
    body.style.setProperty('--left-w', next.toFixed(2) + '%');
    localStorage.setItem('mj-split-w', next);
    localStorage.setItem('mj-exam-split', next);
  });

  /* Thanh ngang dưới khung code: kéo xuống để làm editor cao hơn. */
  const eSep = $('[data-editor-sep]');
  const paneRight = ctx.view.querySelector('.pane-right');
  const savedH = parseFloat(localStorage.getItem('mj-editor-h'));
  if (savedH > 160 && savedH < innerHeight * 0.75) paneRight.style.setProperty('--editor-h', savedH + 'px');
  eSep?.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    eSep.setPointerCapture(ev.pointerId);
    eSep.classList.add('dragging');
    const ed = paneRight.querySelector('.editor');
    const start = ev.clientY;
    const h0 = ed.getBoundingClientRect().height;
    const onMove = (e) => {
      const h = Math.max(160, Math.min(innerHeight * 0.75, h0 + (e.clientY - start)));
      paneRight.style.setProperty('--editor-h', h + 'px');
    };
    const onUp = () => {
      eSep.classList.remove('dragging');
      eSep.removeEventListener('pointermove', onMove);
      eSep.removeEventListener('pointerup', onUp);
      try { localStorage.setItem('mj-editor-h', parseInt(paneRight.style.getPropertyValue('--editor-h')) || 320); } catch {}
    };
    eSep.addEventListener('pointermove', onMove);
    eSep.addEventListener('pointerup', onUp);
  });

  drawTabs();
  drawResult();
  drawHistory();
  loadHistory();

  /* Alt + A/B/C/… nhảy sang bài tương ứng trong khối, miễn con trỏ không ở trong trình soạn code hay ô nhập. */
  const onKey = (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (!p.set) return;
    const t = e.target;
    if (t && t.closest && t.closest('.cm-editor, textarea, input, [contenteditable]')) return;
    const k = (e.key || '').toUpperCase();
    if (k.length !== 1 || k < 'A' || k > 'Z') return;
    const idx = k.charCodeAt(0) - 65;
    const items = ctx.view.querySelectorAll('.set-rail [data-go]');
    const btn = items[idx];
    if (btn) {
      e.preventDefault();
      btn.click();
    }
  };
  document.addEventListener('keydown', onKey);

  return () => {
    state.alive = false;
    clearTimeout(state.timer);
    clearTimeout(savedTimer);
    editor.destroy?.();
    ctx.view.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
  };
}
