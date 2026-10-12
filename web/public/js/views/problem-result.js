import { explainHtml, parseGccLog } from '../gcc-explain.js';
import { esc, SHIMMER, SPINNER, verdictAbbr, verdictLabel, verdictVar } from '../ui.js';

/* Lỗi biên dịch dạng danh sách: bấm "Dòng N" để nhảy tới dòng đó, kèm giải thích tiếng Việt; log gốc thu gọn bên dưới. */
export function compileErrorsHtml(log, title = 'Lỗi biên dịch') {
  const items = parseGccLog(log);
  const raw = `<details class="raw-log"><summary>Xem log gốc của gcc</summary><pre class="celog" tabindex="0">${esc(log || '(trống)')}</pre></details>`;
  if (!items.length) return `<div class="celog-wrap"><span>${title} (gcc)</span><pre class="celog" tabindex="0">${esc(log || '(trống)')}</pre></div>`;
  const errs = items.filter((i) => i.severity === 'error').length;
  return `
    <div class="celog-wrap">
      <span>${title} · ${errs} lỗi${items.length > errs ? `, ${items.length - errs} cảnh báo` : ''}</span>
      <ul class="err-list">${items
        .slice(0, 12)
        .map(
          (i) => `
        <li class="${i.severity}">
          ${i.line ? `<button class="err-line" data-goto-line="${i.line}" title="Nhảy tới dòng ${i.line}">Dòng ${i.line}</button>` : '<span class="err-line">Liên kết</span>'}
          <div><div class="err-vi">${i.explain ? explainHtml(i.explain, esc) : esc(i.message)}</div>${i.explain ? `<div class="err-gcc mono">${esc(i.message)}</div>` : ''}</div>
        </li>`,
        )
        .join('')}</ul>
      ${raw}
    </div>`;
}

const testRow = (n, inner, time, mem) =>
  `<div class="test-row" role="row"><span class="mono muted">#${n}</span>${inner}<span class="num">${time}</span><span class="num">${mem}</span></div>`;
const head = `<div class="test-row head"><span>Test</span><span>Kết quả</span><span class="right">Thời gian</span><span class="right">Bộ nhớ</span></div>`;

function summary(sub, total) {
  const ok = sub.testsPassed ?? 0;
  const stat = `${sub.timeMs ?? 0} ms · ${sub.memoryKb ?? 0} KB`;
  if (sub.verdict === 'CE') return 'Code chưa biên dịch được. Bấm "Dòng …" bên dưới để tới chỗ lỗi.';
  if (sub.verdict === 'IE') return 'Hệ thống chấm gặp lỗi. Thử nộp lại sau ít phút.';
  if (sub.verdict === 'AC') return `${ok}/${total} test đúng · ${stat}`;
  return `Sai ở test #${ok + 1} · ${ok}/${total} test đúng · ${stat}`;
}

const normLines = (s) =>
  String(s ?? '')
    .replace(/\r/g, '')
    .replace(/\s+$/, '')
    .split('\n')
    .map((l) => l.trim().split(/\s+/).join(' '));

/* So sánh đáp án với output của người dùng theo từng dòng, tô dòng khác nhau đầu tiên. */
function diffHtml(fs) {
  const exp = normLines(fs.expected);
  const got = normLines(fs.output);
  let first = exp.findIndex((l, i) => l !== got[i]);
  if (first < 0 && got.length > exp.length) first = exp.length;
  const col = (title, lines) => `
    <div class="diff-col"><div class="sample-head">${title}</div><pre>${lines
      .map((l, i) => `<span class="diff-line ${i === first ? 'bad' : ''}"><i>${i + 1}</i>${esc(l) || ' '}</span>`)
      .join('')}</pre></div>`;
  const where = first >= 0 ? `Khác nhau từ dòng ${first + 1}.` : 'Khác nhau ở khoảng trắng hoặc ký tự ẩn.';
  return `
    <div class="diff-wrap">
      <span class="diff-title">Sai ở test ví dụ #${fs.test} · ${where}</span>
      <div class="diff-grid">${col('INPUT', normLines(fs.input))}${col('ĐÁP ÁN', exp)}${col('OUTPUT CỦA BẠN', got.length && got[0] !== '' ? got : ['(không in gì)'])}</div>
    </div>`;
}

/* Cảnh báo -Wall khi code vẫn biên dịch được: hiện dạng thu gọn để không làm rối kết quả. */
function warningsHtml(log) {
  const n = (String(log || '').match(/warning:/g) || []).length;
  if (!n) return '';
  return `
    <details class="warn-box">
      <summary>⚠ ${n} cảnh báo biên dịch <span class="faint">(-Wall) — nên sửa để code sạch hơn</span></summary>
      ${compileErrorsHtml(log, 'Cảnh báo')}
    </details>`;
}

/* Khung chạy thử: kết quả của một lần chạy với input tự nhập. */
export function runResultHtml(run) {
  if (!run) return '<div class="result-empty">Nhập input rồi nhấn <b>Chạy</b>. Chạy thử không tính vào bài nộp.</div>';
  if (run.loading) return `<div class="judging"><div class="judging-line">${SPINNER}<span>Đang biên dịch và chạy…</span></div>${SHIMMER}</div>`;
  if (run.error) return `<div class="result-empty" style="color:var(--wa)">${esc(run.error)}</div>`;
  if (run.verdict === 'CE') return compileErrorsHtml(run.compile_log);
  const ok = run.verdict === 'OK';
  const color = ok ? 'var(--ac)' : verdictVar(run.verdict);
  const label = ok ? 'Chạy xong' : verdictLabel(run.verdict);
  return `
    <div class="celog-wrap">
      <span style="display:flex;gap:10px;align-items:center;text-transform:none;letter-spacing:0">
        <b class="vbadge" style="--v:${color}">${ok ? 'OK' : esc(run.verdict)}</b>
        <span style="color:${color};font-size:14px;font-weight:600">${esc(label)}</span>
        <span class="mono faint" style="font-size:13px">${run.time_ms} ms · ${run.memory_kb} KB${ok ? '' : ` · exit ${run.exit_code}`}</span>
      </span>
      <pre class="celog" tabindex="0">${esc(run.output) || '<span class="faint">(chương trình không in gì)</span>'}${run.truncated ? '\n<span class="faint">… (đã cắt bớt, chỉ hiện 4KB đầu)</span>' : ''}</pre>
    </div>${warningsHtml(run.compile_log)}`;
}

/* Khung kết quả dưới trình soạn code: chưa nộp / đang chấm / kết quả từng test / log CE. */
export function resultHtml(state, totalTests) {
  const { phase, sub } = state;
  if (phase === 'idle') {
    return `<div class="result-empty">Chưa có kết quả. Nhấn <b>Nộp bài</b> hoặc Ctrl + Enter để chấm.</div>`;
  }
  if (phase === 'judging') {
    const rows = Array.from({ length: totalTests }, (_, i) =>
      testRow(i + 1, `<span class="vtext" style="--v:var(--fg3)">${i === 0 ? SPINNER : ''}<span>${i === 0 ? 'Đang chạy…' : 'Đang chờ'}</span></span>`, '—', '—'),
    ).join('');
    return `
      <div class="judging"><div class="judging-line">${SPINNER}<span>Đang biên dịch và chấm ${totalTests} test…</span></div>${SHIMMER}</div>
      <div class="tests" role="table">${head}${rows}</div>`;
  }

  const v = sub.verdict;
  const banner = `
    <div class="verdict-banner" style="--v:${verdictVar(v)}">
      <span class="abbr">${esc(verdictAbbr(v))}</span>
      <div style="display:flex;flex-direction:column;min-width:0">
        <span class="label">${esc(verdictLabel(v))}</span>
        <span class="summary">${esc(summary(sub, totalTests))}</span>
      </div>
    </div>`;
  if (v === 'CE') return `${banner}${compileErrorsHtml(sub.compileLog)}`;
  if (v === 'IE') return `${banner}<div class="celog-wrap"><span>Log hệ thống</span><pre class="celog" tabindex="0">${esc(sub.compileLog || '(trống)')}</pre></div>`;
  const rows = Array.from({ length: totalTests }, (_, i) => {
    const t = sub.tests[i];
    if (!t) return testRow(i + 1, '<span class="faint">Không chạy</span>', '—', '—');
    const label = `<span class="vtext" style="--v:${verdictVar(t.verdict)}"><b class="vbadge">${esc(t.verdict)}</b><span>${esc(verdictLabel(t.verdict))}</span></span>`;
    return testRow(i + 1, label, `${t.verdict === 'TLE' ? '> ' : ''}${t.time_ms} ms`, `${t.memory_kb} KB`);
  }).join('');
  const hidden = v === 'WA' && !sub.failSample
    ? '<div class="result-empty" style="padding-top:0">Sai ở test ẩn. Hãy tự nghĩ thêm trường hợp biên (số âm, số rất lớn, n = 1…) và dùng <b>Chạy thử</b> để kiểm tra.</div>'
    : '';
  return `${banner}${sub.failSample ? diffHtml(sub.failSample) : hidden}<div class="tests" role="table">${head}${rows}</div>${warningsHtml(sub.compileLog)}`;
}
