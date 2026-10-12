import { Router } from 'express';

import { hashPassword, verifyPassword } from '../lib/auth.js';

const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;

export function authRoutes({ db, auth, authLimit, settings, adminUsers }) {
  const r = Router();
  const isBootstrapAdmin = (name) => adminUsers.has(name.toLowerCase());

  r.get('/config', (_req, res) => {
    res.json({
      registerCodeRequired: Boolean(settings.registerCode),
      allowRegister: settings.allowRegister,
      banner: settings.banner,
    });
  });

  r.post('/register', authLimit, (req, res) => {
    if (!settings.allowRegister) return res.status(403).json({ error: 'Lớp đang tạm khóa đăng ký mới' });
    const { username, password, code } = req.body ?? {};
    const errors = {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      errors.user = 'Tên đăng nhập gồm 3–24 ký tự: chữ, số hoặc _';
    } else if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
      errors.user = 'Tên đăng nhập đã tồn tại';
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      errors.pw = 'Mật khẩu cần từ 6 đến 128 ký tự';
    }
    const expected = settings.registerCode;
    if (expected && String(code ?? '').trim().toUpperCase() !== expected.toUpperCase()) {
      errors.code = 'Mã lớp không đúng';
    }
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Thông tin chưa hợp lệ', fields: errors });

    const { hash, salt } = hashPassword(password);
    const role = isBootstrapAdmin(username) ? 'admin' : 'student';
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (username, pass_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(username, hash, salt, role, Date.now());
    auth.startSession(res, Number(lastInsertRowid));
    res.status(201).json({ username, role });
  });

  r.post('/login', authLimit, (req, res) => {
    const { username, password } = req.body ?? {};
    const user =
      typeof username === 'string' &&
      db.prepare('SELECT id, username, pass_hash, salt, role, locked FROM users WHERE username = ?').get(username);
    if (!user || typeof password !== 'string' || !verifyPassword(password, user.salt, user.pass_hash)) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu', fields: { pw: 'Sai tên đăng nhập hoặc mật khẩu' } });
    }
    if (user.locked) return res.status(403).json({ error: 'Tài khoản đã bị khóa. Liên hệ lớp trưởng để mở lại.' });
    auth.startSession(res, user.id);
    res.json({ username: user.username, role: user.role });
  });

  r.post('/logout', (req, res) => {
    auth.endSession(req, res);
    res.json({ ok: true });
  });

  r.get('/me', (req, res) => {
    res.json({ user: req.user ? { username: req.user.username, role: req.user.role } : null });
  });

  return r;
}
