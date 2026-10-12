import { highlightC } from './highlight.js';

/* Trình soạn code C: textarea trong suốt đặt chồng lên <pre> đã tô màu, cột số dòng bên trái. */
export function mountEditor(container, { value, onChange, onSubmit, onRun }) {
  container.innerHTML = `
    <div class="gutter" aria-hidden="true"></div>
    <div class="code-wrap">
      <pre class="code-hl" aria-hidden="true"></pre>
      <textarea class="code-input" spellcheck="false" wrap="off" aria-label="Trình soạn code C"></textarea>
    </div>`;
  const gutter = container.querySelector('.gutter');
  const pre = container.querySelector('.code-hl');
  const ta = container.querySelector('textarea');

  const paint = () => {
    const { html, gutter: nums } = highlightC(ta.value);
    pre.innerHTML = html;
    gutter.textContent = nums;
  };

  ta.value = value;
  paint();

  ta.addEventListener('input', () => {
    paint();
    onChange(ta.value);
  });
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "'" && onRun) {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  });

  return {
    get value() {
      return ta.value;
    },
    set value(v) {
      ta.value = v;
      paint();
      onChange(v);
    },
    focus: () => ta.focus(),
  };
}
