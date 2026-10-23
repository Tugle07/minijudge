import { explainHtml, parseGccLog } from './gcc-explain.js';

/* Trình soạn code C dùng CodeMirror 6 (đóng gói sẵn ở /vendor/codemirror.js, chỉ tải khi mở trang làm bài).
 * Nếu không tải được thư viện thì dùng textarea đơn giản để vẫn làm bài được. */
const KEYWORDS = 'auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false NULL'.split(' ');
const LIB = {
  'stdio.h': 'printf scanf puts gets fgets fputs putchar getchar fopen fclose fprintf fscanf fread fwrite fseek ftell rewind feof sprintf sscanf',
  'string.h': 'strlen strcpy strncpy strcat strncat strcmp strncmp strchr strrchr strstr strtok strcspn memset memcpy memmove',
  'stdlib.h': 'malloc calloc realloc free qsort abs llabs atoi atoll atof exit rand srand',
  'math.h': 'sqrt pow fabs floor ceil round log log10 sin cos',
  'ctype.h': 'isalpha isdigit isalnum isspace isupper islower toupper tolower',
};
const FONT_KEY = 'mj-editor-font';
const ASSIST_KEY = 'mj-editor-assist';

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Log gcc → diagnostics của CodeMirror, kèm giải thích tiếng Việt trong tooltip. */
function gccDiagnostics(log, doc) {
  return parseGccLog(log)
    .filter((e) => e.line > 0)
    .map((e) => {
      const line = doc.line(Math.min(Math.max(1, e.line), doc.lines));
      let from = Math.min(line.from + Math.max(0, e.col - 1), line.to);
      let to = Math.min(doc.length, from + ((line.text.slice(from - line.from).match(/^[\w.]+/) || [''])[0].length || 1));
      /* "expected ';' before X": gcc chỉ vào token sau, còn chỗ thiếu ; là cuối đoạn code phía trước. */
      /* gcc có thể viết "expected ';' before" hoặc "expected ',' or ';' before". */
      if (/expected (?:'[^']*' or )*';' before/.test(e.message.replace(/[‘’]/g, "'"))) {
        const before = doc.sliceString(0, from).replace(/\s+$/, '');
        if (before.length) (to = before.length), (from = before.length - 1);
      }
      return {
        from,
        to: Math.max(to, from),
        severity: e.severity,
        message: e.explain || e.message,
        renderMessage: () => {
          const el = document.createElement('div');
          el.className = 'cm-diag-vi';
          el.innerHTML = e.explain ? `<div>${explainHtml(e.explain, escHtml)}</div><small>gcc: ${escHtml(e.message)}</small>` : `<div>${escHtml(e.message)}</div>`;
          return el;
        },
      };
    });
}

async function loadCodeMirror() {
  try {
    return await import('../vendor/codemirror.js');
  } catch {
    return null;
  }
}

function plainEditor(container, { value, onChange, onSubmit, onRun }) {
  container.innerHTML = '<textarea class="code-plain" spellcheck="false" wrap="off" aria-label="Trình soạn code C"></textarea>';
  const ta = container.firstElementChild;
  ta.value = value;
  ta.addEventListener('input', () => onChange(ta.value));
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') return e.preventDefault(), onSubmit();
    if ((e.ctrlKey || e.metaKey) && e.key === "'") return e.preventDefault(), onRun();
  });
  return {
    get value() {
      return ta.value;
    },
    set value(v) {
      ta.value = v;
      onChange(v);
    },
    focus: () => ta.focus(),
    showDiagnostics() {},
    zoom() {},
    assist: false,
    setAssist() {},
    gotoLine() {
      ta.focus();
    },
  };
}

export async function mountEditor(container, { value, onChange, onSubmit, onRun, onCursor, onCheck, onLint }) {
  const CM = await loadCodeMirror();
  if (!CM) return plainEditor(container, { value, onChange, onSubmit, onRun });
  const { EditorView, EditorState, Compartment, cpp, keymap, indentWithTab, indentUnit, HighlightStyle, syntaxHighlighting, tags: t, setDiagnostics, lintGutter, linter, autocompletion, completeAnyWord, snippetCompletion } = CM;
  /* Như basicSetup của CodeMirror nhưng tách riêng gợi ý code để bật/tắt được. */
  const coreSetup = [
    CM.lineNumbers(), CM.highlightActiveLineGutter(), CM.highlightSpecialChars(), CM.history(), CM.foldGutter(),
    CM.drawSelection(), CM.dropCursor(), EditorState.allowMultipleSelections.of(true), CM.indentOnInput(),
    CM.bracketMatching(), CM.closeBrackets(), CM.rectangularSelection(), CM.crosshairCursor(),
    CM.highlightActiveLine(), CM.highlightSelectionMatches(),
    keymap.of([...CM.closeBracketsKeymap, ...CM.defaultKeymap, ...CM.searchKeymap, ...CM.historyKeymap, ...CM.foldKeymap, ...CM.completionKeymap, ...CM.lintKeymap]),
  ];
  const report = (diags) => {
    onLint?.({ errors: diags.filter((d) => d.severity === 'error').length, warnings: diags.filter((d) => d.severity === 'warning').length });
    return diags;
  };
  /* Kiểm tra cú pháp trên server sau khi ngừng gõ 2,5 giây. Lỗi ở dòng đang có con trỏ (đang gõ dở) tạm ẩn,
   * rời dòng đó mới hiện. Di chuyển con trỏ chỉ lọc lại kết quả đã có, không gửi thêm yêu cầu lên server. */
  let lastCheck = { src: null, log: null };
  const liveCheck = onCheck
    ? linter(
        async (view) => {
          const src = view.state.doc.toString();
          if (!src.trim()) return report([]);
          let log = lastCheck.src === src ? lastCheck.log : null;
          if (log == null) {
            onLint?.({ checking: true });
            log = await onCheck(src);
            if (log == null) return (onLint?.({ offline: true }), []);
            lastCheck = { src, log };
          }
          if (view.state.doc.toString() !== src) return [];
          const typingLine = view.state.doc.lineAt(view.state.selection.main.head).number;
          const diags = gccDiagnostics(log, view.state.doc).filter(
            (d) => !(d.severity === 'error' && view.state.doc.lineAt(d.from).number === typingLine),
          );
          return report(diags);
        },
        { delay: 300, needsRefresh: (update) => update.selectionSet && !update.docChanged },
      )
    : [];

  const snippets = [
    snippetCompletion('#include <${stdio.h}>', { label: '#include', detail: 'thư viện', type: 'keyword' }),
    snippetCompletion('int main(void) {\n\t${}\n\treturn 0;\n}', { label: 'main', detail: 'hàm main', type: 'function' }),
    snippetCompletion('for (int ${i} = 0; ${i} < ${n}; ${i}++) {\n\t${}\n}', { label: 'for', detail: 'vòng lặp', type: 'keyword' }),
    snippetCompletion('while (${điều_kiện}) {\n\t${}\n}', { label: 'while', detail: 'vòng lặp', type: 'keyword' }),
    snippetCompletion('if (${điều_kiện}) {\n\t${}\n}', { label: 'if', detail: 'rẽ nhánh', type: 'keyword' }),
    snippetCompletion('printf("${%d}\\n", ${x});', { label: 'printf', detail: 'stdio.h', type: 'function' }),
    snippetCompletion('scanf("${%d}", &${x});', { label: 'scanf', detail: 'stdio.h', type: 'function' }),
    snippetCompletion('typedef struct {\n\t${}\n} ${Ten};', { label: 'typedef struct', detail: 'cấu trúc', type: 'keyword' }),
  ];
  const words = [
    ...KEYWORDS.map((label) => ({ label, type: 'keyword' })),
    ...Object.entries(LIB).flatMap(([h, list]) => list.split(' ').map((label) => ({ label, type: 'function', detail: h }))),
  ].filter((w) => !snippets.some((s) => s.label === w.label));
  const cSource = (ctx) => {
    const word = ctx.matchBefore(/#?\w*/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;
    return { from: word.from, options: [...snippets, ...words], validFor: /^#?\w*$/ };
  };

  const highlight = HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.modifier, t.operatorKeyword], color: 'var(--skw)' },
    { tag: [t.typeName, t.standard(t.typeName)], color: 'var(--sty)' },
    { tag: [t.string, t.character], color: 'var(--sst)' },
    { tag: [t.number, t.bool, t.null], color: 'var(--snu)' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--scm)', fontStyle: 'italic' },
    { tag: [t.processingInstruction, t.meta], color: 'var(--sp)' },
    { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: 'var(--sfn)' },
  ]);
  const theme = EditorView.theme({
    '&': { height: '100%', backgroundColor: 'var(--bg)', color: 'var(--fg)' },
    '.cm-scroller': { fontFamily: 'var(--font-code)', lineHeight: '1.6' },
    '.cm-content': { caretColor: 'var(--fg)', padding: '10px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--fg)', borderLeftWidth: '2px' },
    '.cm-gutters': { backgroundColor: 'var(--bg)', color: 'var(--fg3)', border: 'none', borderRight: '1px solid var(--line)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--bg3)', color: 'var(--fg)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in oklch, var(--bg3) 55%, transparent)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'color-mix(in oklch, var(--ring) 32%, transparent) !important' },
    '.cm-selectionMatch': { backgroundColor: 'color-mix(in oklch, var(--ring) 16%, transparent)' },
    '&.cm-focused .cm-matchingBracket': { backgroundColor: 'color-mix(in oklch, var(--ac) 25%, transparent)', outline: 'none' },
    '.cm-tooltip': { backgroundColor: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: '8px', boxShadow: 'var(--shadow)', overflow: 'hidden' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--bg3)', color: 'var(--fg)' },
    '.cm-completionDetail': { color: 'var(--fg3)', fontStyle: 'normal', marginLeft: '10px' },
    '.cm-panels': { backgroundColor: 'var(--bg2)', color: 'var(--fg)', borderTop: '1px solid var(--line)' },
    '.cm-panel input, .cm-panel button': { font: 'inherit', fontSize: '13px' },
    '.cm-textfield': { backgroundColor: 'var(--bg)', border: '1px solid var(--line2)', borderRadius: '6px', color: 'var(--fg)' },
    '.cm-button': { backgroundImage: 'none', backgroundColor: 'var(--bg3)', border: '1px solid var(--line2)', borderRadius: '6px', color: 'var(--fg)' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--bg3)', border: 'none', color: 'var(--fg2)' },
    '.cm-diagnostic-error': { borderLeftColor: 'var(--wa)' },
    '.cm-diagnostic-warning': { borderLeftColor: 'var(--tle)' },
  });

  let size = 14;
  let assist = false;
  try {
    size = Number(localStorage.getItem(FONT_KEY)) || 14;
    assist = localStorage.getItem(ASSIST_KEY) === '1';
  } catch {}
  const assistConf = new Compartment();
  const assistExt = (on) => (on ? autocompletion({ override: [cSource, completeAnyWord], icons: false }) : []);
  const fontConf = new Compartment();
  const fontTheme = (px) => EditorView.theme({ '.cm-scroller': { fontSize: `${px}px` } });

  container.innerHTML = '';
  const view = new EditorView({
    parent: container,
    state: EditorState.create({
      doc: value,
      extensions: [
        /* Đặt trước coreSetup để được ưu tiên: defaultKeymap gán sẵn Ctrl+Enter = chèn dòng trống. */
        keymap.of([
          { key: 'Mod-Enter', run: () => (onSubmit(), true) },
          { key: "Mod-'", run: () => (onRun(), true) },
          { key: 'Mod-s', run: () => true, preventDefault: true },
          indentWithTab,
        ]),
        coreSetup,
        cpp(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        assistConf.of(assistExt(assist)),
        lintGutter(),
        liveCheck,
        syntaxHighlighting(highlight),
        theme,
        fontConf.of(fontTheme(size)),
        EditorView.contentAttributes.of({ 'aria-label': 'Trình soạn code C' }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.doc.toString());
          if (onCursor && (u.docChanged || u.selectionSet)) {
            const head = u.state.selection.main.head;
            const line = u.state.doc.lineAt(head);
            onCursor({ line: line.number, col: head - line.from + 1, lines: u.state.doc.lines });
          }
        }),
      ],
    }),
  });
  onCursor?.({ line: 1, col: 1, lines: view.state.doc.lines });

  return {
    get value() {
      return view.state.doc.toString();
    },
    set value(v) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
      view.dispatch(setDiagnostics(view.state, []));
    },
    focus: () => view.focus(),
    /* Đánh dấu lỗi/cảnh báo gcc ngay trên dòng code; trả về số lỗi tìm được. */
    showDiagnostics(log) {
      const diags = report(gccDiagnostics(log, view.state.doc));
      view.dispatch(setDiagnostics(view.state, diags));
      const first = diags.find((d) => d.severity === 'error') || diags[0];
      if (first) view.dispatch({ selection: { anchor: first.from }, scrollIntoView: true });
      return diags.length;
    },
    /* Bật/tắt gợi ý code (từ khóa, hàm thư viện, khung mẫu). Mặc định tắt để người mới tự gõ. */
    get assist() {
      return assist;
    },
    setAssist(on) {
      assist = Boolean(on);
      view.dispatch({ effects: assistConf.reconfigure(assistExt(assist)) });
      try {
        localStorage.setItem(ASSIST_KEY, assist ? '1' : '0');
      } catch {}
    },
    gotoLine(n) {
      const line = view.state.doc.line(Math.min(Math.max(1, n), view.state.doc.lines));
      view.dispatch({ selection: { anchor: line.from + (line.text.length - line.text.trimStart().length) }, scrollIntoView: true });
      view.focus();
    },
    zoom(delta) {
      size = Math.min(22, Math.max(11, size + delta));
      view.dispatch({ effects: fontConf.reconfigure(fontTheme(size)) });
      try {
        localStorage.setItem(FONT_KEY, String(size));
      } catch {}
    },
    destroy: () => view.destroy(),
  };
}
