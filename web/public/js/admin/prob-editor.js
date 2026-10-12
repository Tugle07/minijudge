import { api } from '../api.js';
import { esc, go, renderMarkdown, SPINNER, toast, verdictLabel, verdictVar } from '../ui.js';
import { confirmDialog, makeSortable, pill } from './kit.js';

const TABS = [
  ['info', 'Thông tin'],
  ['statement', 'Đề bài'],
  ['tests', 'Test'],
  ['solution', 'Lời giải & Kiểm tra'],
];
const DIFFS = ['Dễ', 'Trung bình', 'Khó'];

export async function renderEditor(ctx, id) {
  let p = await api(`/api/admin/problems/${encodeURIComponent(id)}`);
  const custom = p.origin === 'custom';
  const st = { tab: 'info', dirty: false, testsDirty: false, check: null, errors: {}, over: false };
  let form = pick(p);
  let tests = p.tests.map((t) => ({ ...t }));

  function pick(x) {
    return { title: x.title, difficulty: x.difficulty, timeMs: x.timeMs, memoryMb: x.memoryMb, tags: x.tags, statement: x.statement, hint: x.hint, solution: x.solution };
  }
  const markDirty = () => {
    st.dirty = true;
    drawFoot();
  };

  ctx.setHead({ crumb: `Bài tập › ${p.id}`, title: 'Trình soạn bài' });
  ctx.page.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">
      <button class="btn-ghost" data-back style="height:32px;font-size:14px">‹ Danh sách bài</button>
      <span class="mono muted" style="font-weight:500;font-size:15px">${esc(p.id)}</span><b style="font-weight:600" data-ed-title>${esc(p.title)}</b>
      <span data-ed-status>${statusPill()}</span>
    </div>
    ${custom ? '' : '<div class="notice">Bài này nằm trong repo (thư mục <span class="mono">problems/</span>). Nội dung đề và test sửa qua git rồi deploy; ở đây chỉ đổi trạng thái, nhãn và lời giải mẫu.</div>'}
    <div class="ed-tabs" role="tablist">${TABS.map(([k, l], i) => `<button role="tab" data-tab="${k}"><i>${i + 1}</i>${l}</button>`).join('')}</div>
    <div data-tabbody></div>
    <div class="ed-foot" style="margin:0 -28px -96px"><span data-dirty></span><div style="flex:1"></div><button class="btn-line" data-save="draft">Lưu nháp</button><button class="btn-dark" data-save="pub">Xuất bản</button></div>`;
  const body = ctx.page.querySelector('[data-tabbody]');

  function statusPill() {
    return p.status === 'pub' ? pill('Đã xuất bản', 'var(--ac)') : pill('Nháp', 'var(--pd)');
  }
  function drawFoot() {
    const dirty = st.dirty || st.testsDirty;
    ctx.page.querySelector('[data-dirty]').innerHTML = dirty
      ? '<span class="dirty" style="display:flex;align-items:center;gap:8px;font-size:14px;color:var(--tle)"><i style="width:8px;height:8px;border-radius:50%;background:var(--tle)"></i>Có thay đổi chưa lưu</span>'
      : '<span class="faint" style="font-size:14px">Đã lưu tất cả thay đổi</span>';
  }

  const dis = custom ? '' : 'disabled';
  const views = {
    info: () => `
      <div style="max-width:760px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px">
        <label class="afield"><span>Mã bài</span><input class="input mono" value="${esc(p.id)}" disabled /></label>
        <label class="afield" style="grid-column:span 2"><span>Tên bài</span><input class="input ${st.errors.title ? 'err' : ''}" data-f="title" value="${esc(form.title)}" ${dis} />${st.errors.title ? `<span class="err-text">${esc(st.errors.title)}</span>` : ''}</label>
        <div class="afield"><span>Độ khó</span><div class="seg" role="radiogroup">${DIFFS.map((d) => `<button type="button" role="radio" class="${d === form.difficulty ? 'on' : ''}" data-diff="${d}" ${dis}>${d}</button>`).join('')}</div></div>
        <label class="afield"><span>Giới hạn thời gian (ms)</span><input class="input mono" type="number" min="100" max="10000" data-f="timeMs" value="${form.timeMs}" ${dis} /></label>
        <label class="afield"><span>Bộ nhớ (MB)</span><input class="input mono" type="number" min="16" max="1024" data-f="memoryMb" value="${form.memoryMb}" ${dis} /></label>
        <label class="afield" style="grid-column:1/-1"><span>Nhãn</span><input class="input" data-f="tags" value="${esc(form.tags)}" placeholder="Cách nhau bằng dấu phẩy" /><span class="help">Ví dụ: cửa sổ trượt, mảng</span></label>
        <div class="afield" style="grid-column:1/-1"><span>Thuộc khối</span><span class="muted">${p.sets.map((s) => esc(s.short)).join(', ') || 'Chưa thuộc khối nào — thêm bài vào khối ở trang Khối bài tập.'}</span></div>
      </div>`,
    statement: () => `
      <div class="md-split">
        <div><div class="cap">Markdown · công thức trong $…$</div><textarea data-f="statement" spellcheck="false" aria-label="Đề bài Markdown" ${dis}>${esc(form.statement)}</textarea></div>
        <div><div class="cap">Xem trước</div><div class="preview statement" data-preview>${renderMarkdown(form.statement) || '<p class="faint">Bản xem trước sẽ hiện ở đây.</p>'}</div></div>
      </div>
      <label class="afield"><span>Gợi ý (hiện thu gọn dưới đề)</span><textarea class="input" data-f="hint" rows="3" style="height:auto;padding:10px 12px" ${dis}>${esc(form.hint)}</textarea></label>`,
    tests: () => `
      ${
        custom
          ? `<label class="dropzone ${st.over ? 'over' : ''}" data-zone>
              <b style="font-weight:600">Kéo thả file .in / .out vào đây</b>
              <span class="muted" style="font-size:14px">hoặc bấm để chọn file · cặp file cùng tên (vd 05.in + 05.out) được ghép thành một test</span>
              <input type="file" multiple accept=".in,.out,.ans,.txt" data-files /></label>`
          : ''
      }
      <div class="panel" style="overflow:hidden">
        <div class="test-grid thead" style="font-size:12px;font-weight:600;color:var(--fg3);text-transform:uppercase;letter-spacing:.04em"><span></span><span>#</span><span>Input</span><span>Output</span><span>Là test ví dụ</span><span></span></div>
        <div data-order>${tests
          .map(
            (t, i) => `<div class="test-grid order-row" style="height:auto;padding:10px 14px" ${custom ? 'draggable="true"' : ''} data-idx="${i}">
              <button class="grip" aria-label="Kéo để sắp xếp (Alt + ↑/↓)" ${custom ? '' : 'disabled'}>⋮⋮</button>
              <span class="mono" style="font-weight:500;line-height:28px">${String(i + 1).padStart(2, '0')}</span>
              <div style="min-width:0;display:flex;flex-direction:column;gap:3px"><pre>${esc(t.input)}</pre><span class="faint" style="font-size:12px">${t.inSize}</span></div>
              <div style="min-width:0;display:flex;flex-direction:column;gap:3px"><pre>${esc(t.output)}</pre><span class="faint" style="font-size:12px">${t.outSize}</span></div>
              <label style="display:flex;align-items:center;gap:8px;height:28px;font-size:14px;cursor:pointer"><input type="checkbox" data-sample="${i}" ${t.sample ? 'checked' : ''} ${dis} style="width:16px;height:16px;accent-color:var(--fg)" />Ví dụ</label>
              ${custom ? `<button class="icon-x" data-deltest="${i}" aria-label="Xóa test">×</button>` : '<span></span>'}
            </div>`,
          )
          .join('')}</div>
        ${tests.length ? '' : '<div class="empty" style="padding:36px">Chưa có test nào. Tải file lên ở khung phía trên.</div>'}
      </div>`,
    solution: () => {
      const c = st.check;
      const rows = c?.result?.tests?.length
        ? c.result.tests
            .map(
              (t, i) => `<div style="display:grid;grid-template-columns:44px 1fr 80px 84px;gap:10px;align-items:center;padding:9px 16px;border-bottom:1px solid var(--line);font-size:14px">
                <span class="mono muted">#${i + 1}</span><span class="vtext" style="--v:${verdictVar(t.verdict)}"><b class="vbadge">${esc(t.verdict)}</b>${esc(verdictLabel(t.verdict))}</span>
                <span class="mono muted" style="text-align:right">${t.time_ms} ms</span><span class="mono muted" style="text-align:right">${t.memory_kb} KB</span></div>`,
            )
            .join('')
        : '';
      let summary = '';
      if (c?.running) summary = `<span class="muted">Đang chạy ${tests.length} test…</span>`;
      else if (c?.error) summary = `<span style="color:var(--wa)">${esc(c.error)}</span>`;
      else if (c?.result) {
        const r = c.result;
        summary =
          r.verdict === 'AC'
            ? `<span style="color:var(--ac)">Tất cả ${r.test_count} test khớp output · sẵn sàng xuất bản</span>`
            : `<span style="color:${verdictVar(r.verdict)}">${esc(verdictLabel(r.verdict))} ở test #${(r.tests_passed ?? 0) + 1} — kiểm tra lại test hoặc lời giải</span>`;
      }
      return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;align-items:start">
          <div class="panel" style="overflow:hidden;display:flex;flex-direction:column">
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px 8px 14px;border-bottom:1px solid var(--line)">
              <span style="font-size:12.5px;font-weight:600;color:var(--fg3);text-transform:uppercase;letter-spacing:.04em">Lời giải mẫu · C</span>
              <button class="btn-dark" data-check style="margin-left:auto;height:32px;display:flex;align-items:center;gap:8px" ${c?.running ? 'disabled' : ''}>${c?.running ? SPINNER : ''}Chạy thử với toàn bộ test</button>
            </div>
            <textarea class="sol-area" data-f="solution" spellcheck="false" aria-label="Lời giải mẫu">${esc(form.solution)}</textarea>
          </div>
          <div class="panel" style="overflow:hidden">
            <div style="padding:12px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:10px"><b style="font-weight:600">Kết quả kiểm tra</b><span style="font-size:13px">${summary}</span></div>
            ${rows || (c?.result?.verdict === 'CE' ? `<pre class="celog" style="margin:12px 16px">${esc(c.result.compile_log)}</pre>` : '<p class="faint" style="margin:0;padding:24px 16px;font-size:14px">Dán lời giải chuẩn rồi bấm chạy thử để chắc test đúng trước khi xuất bản.</p>')}
          </div>
        </div>`;
    },
  };

  function drawTab() {
    ctx.page.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab));
    body.innerHTML = views[st.tab]();
    if (st.tab === 'tests' && custom) {
      makeSortable(body.querySelector('[data-order]'), () => tests, (list) => {
        tests = list;
        st.testsDirty = true;
        drawTab();
        drawFoot();
      });
    }
  }

  async function addFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    if (files.some((f) => /\.zip$/i.test(f.name))) return toast('Chưa hỗ trợ .zip — hãy giải nén rồi kéo các file .in/.out vào');
    if (st.testsDirty) await saveTests();
    const payload = await Promise.all(files.map(async (f) => ({ name: f.name, content: await f.text() })));
    try {
      const r = await api(`/api/admin/problems/${encodeURIComponent(p.id)}/tests`, { method: 'POST', body: { files: payload } });
      tests = r.tests;
      toast(r.added ? `Đã thêm ${r.added} test` : 'Không ghép được cặp .in/.out nào (cần cùng tên)');
      drawTab();
    } catch (err) {
      toast(err.message);
    }
  }

  async function saveTests() {
    const r = await api(`/api/admin/problems/${encodeURIComponent(p.id)}/tests`, {
      method: 'PUT',
      body: { order: tests.map((t) => t.n), samples: tests.filter((t) => t.sample).map((t) => t.n) },
    });
    tests = r.tests;
    st.testsDirty = false;
  }

  async function save(status) {
    try {
      if (st.testsDirty && custom) await saveTests();
      p = await api(`/api/admin/problems/${encodeURIComponent(p.id)}`, { method: 'PUT', body: { ...form, status } });
      form = pick(p);
      tests = p.tests;
      Object.assign(st, { dirty: false, errors: {} });
      ctx.page.querySelector('[data-ed-title]').textContent = p.title;
      ctx.page.querySelector('[data-ed-status]').innerHTML = statusPill();
      toast(status === 'pub' ? `Đã xuất bản ${p.id}` : 'Đã lưu nháp');
    } catch (err) {
      st.errors = err.fields || {};
      if (st.errors.title) st.tab = 'info';
      toast(err.message);
    }
    drawTab();
    drawFoot();
  }

  async function leave(hash) {
    if ((st.dirty || st.testsDirty) && !(await confirmDialog({ title: 'Rời trang khi chưa lưu?', body: 'Các thay đổi trong trình soạn bài sẽ bị mất.', cta: 'Rời trang', danger: true }))) return;
    st.dirty = st.testsDirty = false;
    if (hash.startsWith('/')) location.href = hash;
    else go(hash);
  }

  ctx.page.addEventListener('input', (e) => {
    const k = e.target.dataset.f;
    if (!k) return;
    form[k] = e.target.value;
    if (k === 'statement') body.querySelector('[data-preview]').innerHTML = renderMarkdown(form.statement);
    markDirty();
  });
  ctx.page.addEventListener('change', (e) => {
    if (e.target.matches('[data-sample]')) {
      tests[Number(e.target.dataset.sample)].sample = e.target.checked;
      st.testsDirty = true;
      drawFoot();
    }
    if (e.target.matches('[data-files]')) addFiles(e.target.files).then(() => (e.target.value = ''));
  });
  ctx.page.addEventListener('dragover', (e) => {
    if (!e.target.closest('[data-zone]') || !e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.target.closest('[data-zone]').classList.add('over');
  });
  ctx.page.addEventListener('dragleave', (e) => e.target.closest('[data-zone]')?.classList.remove('over'));
  ctx.page.addEventListener('drop', (e) => {
    const zone = e.target.closest('[data-zone]');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('over');
    addFiles(e.dataTransfer.files);
  });
  ctx.page.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('[data-back]')) return leave('#/probs');
    const tab = t.closest('[data-tab]');
    if (tab) return (st.tab = tab.dataset.tab), drawTab();
    const diff = t.closest('[data-diff]');
    if (diff && custom) return (form.difficulty = diff.dataset.diff), markDirty(), drawTab();
    const del = t.closest('[data-deltest]');
    if (del) {
      tests.splice(Number(del.dataset.deltest), 1);
      st.testsDirty = true;
      drawFoot();
      return drawTab();
    }
    const saveBtn = t.closest('[data-save]');
    if (saveBtn) return save(saveBtn.dataset.save);
    if (t.closest('[data-check]')) {
      if (st.testsDirty && custom) await saveTests();
      st.check = { running: true };
      drawTab();
      try {
        st.check = { result: await api(`/api/admin/problems/${encodeURIComponent(p.id)}/check`, { method: 'POST', body: { source: form.solution } }) };
      } catch (err) {
        st.check = { error: err.message };
      }
      drawTab();
    }
  });

  /* Chặn rời trang khi còn thay đổi chưa lưu (đóng tab hoặc bấm menu bên trái). */
  const onBeforeUnload = (e) => {
    if (st.dirty || st.testsDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  const onNavClick = (e) => {
    const a = e.target.closest('a[href^="#/"], a[href^="/#/"]');
    if (!a || !(st.dirty || st.testsDirty)) return;
    e.preventDefault();
    e.stopPropagation();
    leave(a.getAttribute('href'));
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('click', onNavClick, true);

  drawTab();
  drawFoot();
  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('click', onNavClick, true);
  };
}
