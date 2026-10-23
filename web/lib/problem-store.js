import fs from 'node:fs';
import path from 'node:path';

import { ID_RE, parseConfig } from './problems.js';

const MAX_TEST_BYTES = 8 * 1024 * 1024;
const PREVIEW = 400;

const sizeLabel = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
const preview = (file) => {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(PREVIEW);
  const n = fs.readSync(fd, buf, 0, PREVIEW, 0);
  fs.closeSync(fd);
  return buf.subarray(0, n).toString('utf8');
};

/* Đọc/ghi bài tự tạo (custom) theo đúng định dạng thư mục mà judge-cli và bản console đọc. */
export function createProblemStore(customDir) {
  fs.mkdirSync(customDir, { recursive: true });
  const dirOf = (id) => {
    if (!ID_RE.test(id)) throw Object.assign(new Error('Mã bài không hợp lệ'), { status: 400 });
    return path.join(customDir, id);
  };
  const testsDir = (id) => path.join(dirOf(id), 'tests');

  function readConfig(id) {
    const file = path.join(dirOf(id), 'problem.txt');
    return fs.existsSync(file) ? parseConfig(fs.readFileSync(file, 'utf8')) : {};
  }

  function writeConfig(id, cfg) {
    const lines = ['title', 'time_ms', 'memory_mb', 'tests', 'difficulty', 'samples']
      .filter((k) => cfg[k] !== undefined && cfg[k] !== '')
      .map((k) => `${k}=${String(cfg[k]).replace(/[\r\n]/g, ' ')}`);
    fs.writeFileSync(path.join(dirOf(id), 'problem.txt'), lines.join('\n') + '\n');
  }

  function countTests(id) {
    const dir = testsDir(id);
    if (!fs.existsSync(dir)) return 0;
    let n = 0;
    while (fs.existsSync(path.join(dir, `${n + 1}.in`))) n += 1;
    return n;
  }

  return {
    exists: (id) => fs.existsSync(path.join(dirOf(id), 'problem.txt')),

    /* Bản chỉnh sửa của bài trong repo: chép nguyên thư mục (đề, test, subtasks.json) sang customDir. */
    copyFrom(srcDir, id) {
      fs.cpSync(srcDir, dirOf(id), { recursive: true });
    },

    remove(id) {
      fs.rmSync(dirOf(id), { recursive: true, force: true });
    },

    create(id) {
      fs.mkdirSync(testsDir(id), { recursive: true });
      writeConfig(id, { title: id, time_ms: 1000, memory_mb: 256, tests: 0, difficulty: 'Trung bình' });
    },

    saveMeta(id, { title, timeMs, memoryMb, difficulty, statement, hint }) {
      const cfg = readConfig(id);
      writeConfig(id, {
        ...cfg,
        title: title ?? cfg.title,
        time_ms: Math.min(10000, Math.max(100, Number(timeMs) || Number(cfg.time_ms) || 1000)),
        memory_mb: Math.min(1024, Math.max(16, Number(memoryMb) || Number(cfg.memory_mb) || 256)),
        difficulty: difficulty ?? cfg.difficulty,
        tests: countTests(id),
      });
      if (typeof statement === 'string') fs.writeFileSync(path.join(dirOf(id), 'statement.md'), statement);
      if (typeof hint === 'string') fs.writeFileSync(path.join(dirOf(id), 'hint.md'), hint);
    },

    listTests(id, root = customDir) {
      const dir = path.join(root, id, 'tests');
      const cfg = parseConfig(fs.existsSync(path.join(root, id, 'problem.txt')) ? fs.readFileSync(path.join(root, id, 'problem.txt'), 'utf8') : '');
      const samples = new Set((cfg.samples || '').split(',').map((s) => Number(s.trim())));
      const out = [];
      for (let n = 1; fs.existsSync(path.join(dir, `${n}.in`)); n++) {
        const inp = path.join(dir, `${n}.in`);
        const ans = path.join(dir, `${n}.out`);
        out.push({
          n,
          input: preview(inp),
          output: fs.existsSync(ans) ? preview(ans) : '',
          inSize: sizeLabel(fs.statSync(inp).size),
          outSize: fs.existsSync(ans) ? sizeLabel(fs.statSync(ans).size) : '—',
          sample: samples.has(n),
        });
      }
      return out;
    },

    /* files: [{ name: '1.in', content }...] — ghép cặp theo tên (vd 05.in + 05.out) rồi nối vào cuối. */
    addTests(id, files) {
      const groups = new Map();
      for (const f of files) {
        const m = /^(.+)\.(in|out|ans|txt)$/i.exec(String(f.name || ''));
        if (!m || typeof f.content !== 'string') continue;
        if (Buffer.byteLength(f.content) > MAX_TEST_BYTES) throw Object.assign(new Error(`${f.name} lớn hơn 8MB`), { status: 400 });
        const g = groups.get(m[1]) ?? {};
        g[m[2].toLowerCase() === 'in' ? 'in' : 'out'] = f.content;
        groups.set(m[1], g);
      }
      const pairs = [...groups.entries()]
        .filter(([, g]) => g.in !== undefined && g.out !== undefined)
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
      fs.mkdirSync(testsDir(id), { recursive: true });
      let n = countTests(id);
      for (const [, g] of pairs) {
        n += 1;
        fs.writeFileSync(path.join(testsDir(id), `${n}.in`), g.in);
        fs.writeFileSync(path.join(testsDir(id), `${n}.out`), g.out);
      }
      this.saveMeta(id, {});
      return pairs.length;
    },

    /* Đọc toàn bộ input/output của 1 test — không bị cắt 400 ký tự như `listTests`. */
    readTest(id, n, root = customDir) {
      const dir = path.join(root, id, 'tests');
      if (!fs.existsSync(path.join(dir, `${n}.in`))) throw Object.assign(new Error('Không tìm thấy test'), { status: 404 });
      return {
        input: fs.readFileSync(path.join(dir, `${n}.in`), 'utf8'),
        output: fs.existsSync(path.join(dir, `${n}.out`)) ? fs.readFileSync(path.join(dir, `${n}.out`), 'utf8') : '',
      };
    },

    /* Ghi lại input/output của 1 test đã có. */
    writeTest(id, n, { input, output }) {
      const dir = testsDir(id);
      if (!fs.existsSync(path.join(dir, `${n}.in`))) throw Object.assign(new Error('Test không tồn tại'), { status: 404 });
      if (typeof input !== 'string' || typeof output !== 'string') throw Object.assign(new Error('Thiếu input/output'), { status: 400 });
      if (Buffer.byteLength(input) > MAX_TEST_BYTES || Buffer.byteLength(output) > MAX_TEST_BYTES) {
        throw Object.assign(new Error('Input hoặc output quá 8 MB'), { status: 400 });
      }
      fs.writeFileSync(path.join(dir, `${n}.in`), input);
      fs.writeFileSync(path.join(dir, `${n}.out`), output);
      this.saveMeta(id, {});
    },

    /* Thêm một test mới (nối vào cuối), nội dung do Admin gõ hoặc để trống. */
    appendTest(id, { input = '', output = '' } = {}) {
      if (Buffer.byteLength(input) > MAX_TEST_BYTES || Buffer.byteLength(output) > MAX_TEST_BYTES) {
        throw Object.assign(new Error('Input hoặc output quá 8 MB'), { status: 400 });
      }
      fs.mkdirSync(testsDir(id), { recursive: true });
      const n = countTests(id) + 1;
      fs.writeFileSync(path.join(testsDir(id), `${n}.in`), input);
      fs.writeFileSync(path.join(testsDir(id), `${n}.out`), output);
      this.saveMeta(id, {});
      return n;
    },

    /* order: danh sách số test cũ theo thứ tự mới (test bị bỏ = xóa); samples: số test cũ là ví dụ. */
    reorderTests(id, order, samples) {
      const dir = testsDir(id);
      const total = countTests(id);
      const keep = order.map(Number).filter((n, i, a) => Number.isInteger(n) && n >= 1 && n <= total && a.indexOf(n) === i);
      const tmp = path.join(dir, '.tmp');
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.mkdirSync(tmp);
      keep.forEach((old, i) => {
        fs.renameSync(path.join(dir, `${old}.in`), path.join(tmp, `${i + 1}.in`));
        fs.renameSync(path.join(dir, `${old}.out`), path.join(tmp, `${i + 1}.out`));
      });
      for (const f of fs.readdirSync(dir)) if (f !== '.tmp') fs.rmSync(path.join(dir, f), { force: true });
      for (const f of fs.readdirSync(tmp)) fs.renameSync(path.join(tmp, f), path.join(dir, f));
      fs.rmSync(tmp, { recursive: true, force: true });
      const sampleSet = new Set(samples.map(Number));
      const newSamples = keep.map((old, i) => (sampleSet.has(old) ? i + 1 : 0)).filter(Boolean);
      writeConfig(id, { ...readConfig(id), tests: keep.length, samples: newSamples.join(',') });
    },
  };
}
