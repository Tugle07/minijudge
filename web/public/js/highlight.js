import { esc } from './ui.js';

const TYPES = new Set(['int', 'long', 'char', 'float', 'double', 'void', 'unsigned', 'short', 'signed', 'bool', 'size_t', 'FILE', 'struct']);
const KEYWORDS = new Set(['if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'sizeof', 'static', 'const', 'typedef', 'enum']);
const TOKEN_RE = /(\/\/.*$)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;

const span = (text, color) => `<span style="color:var(${color})">${esc(text)}</span>`;

function highlightLine(line) {
  if (/^\s*#/.test(line)) return span(line, '--sp');
  let out = '';
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line))) {
    out += esc(line.slice(last, m.index));
    let color = null;
    if (m[1]) color = '--scm';
    else if (m[2] || m[3]) color = '--sst';
    else if (m[4]) color = '--snu';
    else if (TYPES.has(m[5])) color = '--sty';
    else if (KEYWORDS.has(m[5])) color = '--skw';
    else if (/^\s*\(/.test(line.slice(TOKEN_RE.lastIndex))) color = '--sfn';
    out += color ? span(m[0], color) : esc(m[0]);
    last = TOKEN_RE.lastIndex;
  }
  return out + esc(line.slice(last));
}

/* Tô màu cú pháp C đơn giản cho lớp <pre> nằm dưới textarea trong suốt. */
export function highlightC(src) {
  const lines = src.split('\n');
  return {
    html: lines.map(highlightLine).join('\n') + '\n',
    gutter: lines.map((_, i) => i + 1).join('\n'),
  };
}
