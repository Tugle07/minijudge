import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAdminStats } from './lib/admin-stats.js';
import { createAuth } from './lib/auth.js';
import { createContests } from './lib/contests.js';
import { scheduleBackups } from './lib/backup.js';
import { openDatabase } from './lib/database.js';
import { createJudgeClient, createJudgeQueue } from './lib/judge-queue.js';
import { createProblemStore } from './lib/problem-store.js';
import { createCatalog } from './lib/problems.js';
import { clientIp, createRateLimit } from './lib/rate-limit.js';
import { securityHeaders } from './lib/security.js';
import { createSettings } from './lib/settings.js';
import { createStats } from './lib/stats.js';
import { adminContestRoutes } from './routes/admin-contest-routes.js';
import { adminProblemRoutes } from './routes/admin-problem-routes.js';
import { adminRoutes } from './routes/admin-routes.js';
import { authRoutes } from './routes/auth-routes.js';
import { catalogRoutes } from './routes/catalog-routes.js';
import { contestRoutes } from './routes/contest-routes.js';
import { profileRoutes } from './routes/profile-routes.js';
import { submissionRoutes } from './routes/submission-routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PROBLEMS_DIR = path.resolve(process.env.PROBLEMS_DIR || path.join(ROOT, 'problems'));
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const CUSTOM_PROBLEMS_DIR = path.resolve(process.env.CUSTOM_PROBLEMS_DIR || path.join(DATA_DIR, 'problems-custom'));
const JUDGE_BIN = path.resolve(
  process.env.JUDGE_BIN || path.join(ROOT, 'build', process.platform === 'win32' ? 'judge-cli.exe' : 'judge-cli'),
);
const JUDGE_URL = process.env.JUDGE_URL || '';
const TRUST_CLOUDFLARE = process.env.TRUST_CLOUDFLARE === '1';
/* Tài khoản có tên trong ADMIN_USERS (cách nhau dấu phẩy) luôn là Admin — dùng để tạo Admin đầu tiên. */
const ADMIN_USERS = new Set(
  (process.env.ADMIN_USERS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

if (!JUDGE_URL && !fs.existsSync(JUDGE_BIN)) {
  console.error(`Khong tim thay ${JUDGE_BIN}. Hay build core truoc: mingw32-make (Windows) hoac make (Linux).`);
  process.exit(1);
}
fs.mkdirSync(path.join(DATA_DIR, 'work'), { recursive: true });

const db = openDatabase(path.join(DATA_DIR, 'minijudge.db'));
for (const name of ADMIN_USERS) db.prepare("UPDATE users SET role = 'admin' WHERE username = ?").run(name);

const settings = createSettings(db, { registerCode: process.env.REGISTER_CODE || '' });
const store = createProblemStore(CUSTOM_PROBLEMS_DIR);
const catalog = createCatalog({ db, repoDir: PROBLEMS_DIR, customDir: CUSTOM_PROBLEMS_DIR });
const contests = createContests(db, catalog);
/* Bài đang nằm trong cuộc thi chưa kết thúc thì ẩn khỏi phần luyện tập (không lộ đề trước giờ thi). */
{
  const visibleProblem = catalog.isProblemVisible;
  const visibleOfSet = catalog.visibleProblems;
  catalog.isProblemVisible = (p) => visibleProblem(p) && !contests.lockedProblemIds().has(p.id);
  catalog.visibleProblems = (set) => {
    const locked = contests.lockedProblemIds();
    return visibleOfSet(set).filter((pid) => !locked.has(pid));
  };
}
const stats = createStats(db, catalog);
const adminStats = createAdminStats(db, catalog);
const auth = createAuth(db, { secureCookie: process.env.COOKIE_SECURE === '1' });
const judge = await createJudgeClient({
  judgeUrl: JUDGE_URL,
  judgeBin: JUDGE_BIN,
  problemsDir: PROBLEMS_DIR,
  customDir: CUSTOM_PROBLEMS_DIR,
  workRoot: path.join(DATA_DIR, 'work'),
});
const queue = createJudgeQueue({
  db,
  client: judge,
  concurrency: Math.max(1, Number(process.env.JUDGE_CONCURRENCY) || 1),
  originOf: (id) => catalog.problemMap.get(id)?.origin ?? 'repo',
  onJudged: (id) => contests.scoreSubmission(id),
});
if (process.env.BACKUP !== '0') scheduleBackups(db, path.join(DATA_DIR, 'backups'));
const authLimit = createRateLimit({ windowMs: 15 * 60_000, max: 20, message: 'Thử quá nhiều lần, đợi 15 phút rồi thử lại.' });
const submitLimit = createRateLimit({ windowMs: 60_000, max: 6, message: 'Nộp quá nhanh, đợi 1 phút nhé' });
const runLimit = createRateLimit({ windowMs: 60_000, max: 30, message: 'Chạy thử quá nhanh, đợi một chút nhé' });
const checkLimit = createRateLimit({ windowMs: 60_000, max: 40, message: 'Kiểm tra cú pháp quá nhanh' });

for (const { id } of db.prepare("SELECT id FROM submissions WHERE verdict = 'PENDING' ORDER BY id").all()) {
  queue.push(id);
}

const app = express();
app.disable('x-powered-by');
const smallJson = express.json({ limit: '128kb' });
/* Upload test (Admin) tự đặt giới hạn lớn hơn ở route riêng. */
app.use((req, res, next) => (/^\/api\/admin\/problems\/[^/]+\/tests$/.test(req.path) && req.method === 'POST' ? next() : smallJson(req, res, next)));
app.use(securityHeaders(path.join(__dirname, 'public')));
/* Sau Cloudflare: người dùng vào bằng http:// thì chuyển sang https:// (cookie đăng nhập chỉ gửi qua HTTPS). */
if (TRUST_CLOUDFLARE) {
  app.use((req, res, next) => {
    let scheme = '';
    try {
      scheme = JSON.parse(req.get('cf-visitor') || '{}').scheme || '';
    } catch {}
    if (scheme === 'http' && (req.method === 'GET' || req.method === 'HEAD')) return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    next();
  });
}
app.use(clientIp(TRUST_CLOUDFLARE));
app.use(auth.loadUser);
app.use(express.static(path.join(__dirname, 'public')));

/* Công khai, không cần đăng nhập: dùng cho bước kiểm tra sau deploy và giám sát. */
app.get('/api/health', async (_req, res) => {
  let judgeOk = false;
  try {
    judgeOk = Boolean((await judge.health()).ok);
  } catch {}
  res.status(judgeOk ? 200 : 503).json({ ok: judgeOk, problems: catalog.problems.length, queue: queue.pending });
});

/* Đang trong giờ thi: khóa phần luyện tập (đề, lịch sử, bảng xếp hạng) với thí sinh đã vào phòng. */
const PRACTICE_API = /^\/api\/(home|sets|problems|submissions|leaderboard|me\/profile)(\/|$|\?)/;
app.use((req, res, next) => {
  if (!req.user || req.user.role === 'admin' || !PRACTICE_API.test(req.path)) return next();
  const active = contests.activeFor(req.user.id);
  if (!active) return next();
  res.status(423).json({ error: 'Bạn đang trong giờ thi — phần luyện tập tạm khóa', contestId: active.id });
});

app.use('/api', authRoutes({ db, auth, authLimit, settings, adminUsers: ADMIN_USERS }));
app.use('/api', catalogRoutes({ catalog, stats, auth, settings }));
app.use('/api', contestRoutes({ db, catalog, contests, auth, queue, submitLimit }));
app.use('/api', submissionRoutes({ db, catalog, stats, auth, queue, judge, submitLimit, runLimit, checkLimit }));
app.use('/api', profileRoutes({ db, catalog, stats, auth, authLimit }));
app.use('/api/admin', adminRoutes({ db, catalog, auth, queue, judge, settings, adminStats }));
app.use('/api/admin', adminContestRoutes({ db, catalog, contests, auth }));
app.use('/api/admin', adminProblemRoutes({ db, catalog, auth, judge, store, adminStats }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API không tồn tại' }));

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? err.message : 'Lỗi máy chủ' });
});

app.listen(PORT, HOST, () => {
  console.log(
    `MiniJudge web: http://${HOST}:${PORT}  (${catalog.problems.length} de, ${catalog.sets.length} khoi, judge: ${JUDGE_URL || JUDGE_BIN})`,
  );
});
