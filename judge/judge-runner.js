import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const JUDGE_TIMEOUT_MS = 120_000;
export const ID_RE = /^[A-Za-z0-9_]{1,15}$/;

/* Log gcc chứa đường dẫn thư mục tạm (vd C:\...\work\<uuid>/main.c) → rút gọn thành main.c. */
function stripPaths(log, dir) {
  const variants = new Set([dir, dir.replace(/\\/g, '/'), dir.replace(/\//g, '\\')]);
  let out = log;
  for (const v of variants) out = out.split(`${v}/`).join('').split(`${v}\\`).join('');
  return out;
}

/* Gọi judge-cli trong một thư mục tạm riêng, luôn dọn dẹp và luôn trả về JSON (lỗi → IE). */
function invoke(judgeBin, workRoot, files, buildArgs, env) {
  return new Promise((resolve) => {
    const dir = path.join(workRoot, crypto.randomUUID());
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    const paths = {};
    for (const [name, content] of Object.entries(files)) {
      paths[name] = path.join(dir, name);
      fs.writeFileSync(paths[name], content, { mode: 0o644 });
    }
    const opts = { timeout: JUDGE_TIMEOUT_MS, maxBuffer: 1 << 20, windowsHide: true, env: { ...process.env, ...env } };
    execFile(judgeBin, buildArgs(paths, dir), opts, (err, stdout) => {
      fs.rmSync(dir, { recursive: true, force: true });
      try {
        const result = JSON.parse(stdout);
        if (result.compile_log) result.compile_log = stripPaths(result.compile_log, dir);
        resolve(result);
      } catch {
        resolve({ verdict: 'IE', compile_log: err ? String(err.message) : 'judge-cli output invalid' });
      }
    });
  });
}

/* Chỉ kiểm tra cú pháp (gcc -fsyntax-only, không tạo file chạy, không chạy code) để báo lỗi ngay khi đang gõ. */
function syntaxCheck(workRoot, source) {
  return new Promise((resolve) => {
    const dir = path.join(workRoot, crypto.randomUUID());
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    fs.writeFileSync(path.join(dir, 'main.c'), source, { mode: 0o644 });
    const gcc = process.env.MJ_GCC || 'gcc';
    const opts = { cwd: dir, timeout: 8000, maxBuffer: 1 << 18, windowsHide: true };
    execFile(gcc, ['-std=c11', '-Wall', '-fsyntax-only', '-fdiagnostics-color=never', 'main.c'], opts, (err, _out, stderr) => {
      fs.rmSync(dir, { recursive: true, force: true });
      if (err && err.code === 'ENOENT') return resolve({ ok: false, log: '' });
      resolve({ ok: !err, log: stripPaths(String(stderr || ''), dir).slice(0, 16384) });
    });
  });
}

/* slot: số thứ tự luồng chấm (0, 1, …) → UID sandbox riêng 60000 + slot khi judge chạy bằng root. */
const slotEnv = (slot) => (slot == null ? {} : { MJ_SANDBOX_UID: String(60000 + slot) });

/* origin: 'repo' (problemsDir, đề trong git) hoặc 'custom' (customDir, đề tạo trên trang Admin). */
export function createRunner({ judgeBin, problemsDir, customDir, workRoot }) {
  fs.mkdirSync(workRoot, { recursive: true, mode: 0o755 });
  return {
    judge: (problemId, source, { slot, origin } = {}) =>
      invoke(
        judgeBin,
        workRoot,
        { 'main.c': source },
        (p, dir) => [origin === 'custom' && customDir ? customDir : problemsDir, problemId, p['main.c'], dir],
        slotEnv(slot),
      ),
    health: async () => ({ ok: true }),
    check: (source) => syntaxCheck(workRoot, source),
    run: (source, input, timeMs = 2000, memoryMb = 256, slot) =>
      invoke(
        judgeBin,
        workRoot,
        { 'main.c': source, 'input.txt': input },
        (p, dir) => ['--run', p['main.c'], p['input.txt'], dir, String(timeMs), String(memoryMb)],
        slotEnv(slot),
      ),
  };
}
