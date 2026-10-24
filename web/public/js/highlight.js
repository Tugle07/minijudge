import { esc } from './ui.js';

const C_TYPES = new Set(['int', 'long', 'char', 'float', 'double', 'void', 'unsigned', 'short', 'signed', 'bool', 'size_t', 'FILE', 'struct']);
const C_KEYWORDS = new Set(['if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'sizeof', 'static', 'const', 'typedef', 'enum']);

const CPP_TYPES = new Set([
  ...C_TYPES,
  'string', 'vector', 'map', 'set', 'unordered_map', 'unordered_set', 'queue', 'stack', 'deque', 'pair', 'tuple', 'auto',
]);
const CPP_KEYWORDS = new Set([
  ...C_KEYWORDS,
  'class', 'public', 'private', 'protected', 'virtual', 'override', 'template', 'typename', 'namespace', 'using', 'std', 'cin', 'cout', 'endl', 'new', 'delete', 'nullptr', 'constexpr', 'friend', 'operator', 'this',
]);

const PY_KEYWORDS = new Set([
  'def', 'class', 'import', 'from', 'as', 'if', 'elif', 'else', 'for', 'while', 'return', 'in', 'is', 'not', 'and', 'or',
  'True', 'False', 'None', 'pass', 'break', 'continue', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'assert',
]);
const PY_BUILTINS = new Set([
  'int', 'str', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'bytes', 'len', 'range', 'print', 'input', 'open', 'sum', 'min', 'max', 'map', 'filter', 'sorted', 'enumerate', 'zip', 'abs', 'round',
]);

const TOKEN_RE_C = /(\/\/.*$)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;
const TOKEN_RE_PY = /(#.*$)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)/g;

const span = (text, color) => `<span style="color:var(${color})">${esc(text)}</span>`;

function highlightLine(line, lang = 'c') {
  const isPy = lang === 'py' || lang === 'python';
  const isCpp = lang === 'cpp' || lang === 'c++';

  if (!isPy && /^\s*#/.test(line)) return span(line, '--sp');

  const re = isPy ? TOKEN_RE_PY : TOKEN_RE_C;
  re.lastIndex = 0;
  let out = '';
  let last = 0;
  let m;

  while ((m = re.exec(line))) {
    out += esc(line.slice(last, m.index));
    let color = null;
    if (m[1]) color = '--scm';
    else if (m[2] || m[3]) color = '--sst';
    else if (m[4]) color = '--snu';
    else if (isPy) {
      if (PY_KEYWORDS.has(m[5])) color = '--skw';
      else if (PY_BUILTINS.has(m[5])) color = '--sty';
      else if (/^\s*\(/.test(line.slice(re.lastIndex))) color = '--sfn';
    } else if (isCpp) {
      if (CPP_TYPES.has(m[5])) color = '--sty';
      else if (CPP_KEYWORDS.has(m[5])) color = '--skw';
      else if (/^\s*\(/.test(line.slice(re.lastIndex))) color = '--sfn';
    } else {
      if (C_TYPES.has(m[5])) color = '--sty';
      else if (C_KEYWORDS.has(m[5])) color = '--skw';
      else if (/^\s*\(/.test(line.slice(re.lastIndex))) color = '--sfn';
    }
    out += color ? span(m[0], color) : esc(m[0]);
    last = re.lastIndex;
  }
  return out + esc(line.slice(last));
}

export function highlightCode(src = '', lang = 'c') {
  const lines = String(src).split('\n');
  return {
    html: lines.map((l) => highlightLine(l, lang)).join('\n') + '\n',
    gutter: lines.map((_, i) => i + 1).join('\n'),
  };
}

export const highlightC = (src) => highlightCode(src, 'c');
