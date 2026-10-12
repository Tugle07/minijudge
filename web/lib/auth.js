import crypto from 'node:crypto';

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const KEY_LEN = 64;

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { hash: crypto.scryptSync(password, salt, KEY_LEN).toString('hex'), salt };
}

export function verifyPassword(password, salt, hash) {
  const actual = crypto.scryptSync(password, salt, KEY_LEN);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function createAuth(db, { secureCookie = false } = {}) {
  const findSession = db.prepare(`
    SELECT u.id, u.username, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.locked = 0`);
  const touch = db.prepare('UPDATE users SET last_seen = ? WHERE id = ?');
  const lastTouch = new Map();
  const TOUCH_EVERY_MS = 60_000;
  const insertSession = db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)');
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const purgeExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

  const cookie = (value, maxAgeSec) =>
    `sid=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secureCookie ? '; Secure' : ''}`;

  return {
    loadUser(req, _res, next) {
      const token = parseCookies(req.headers.cookie).sid;
      req.user = token ? findSession.get(sha256(token), Date.now()) ?? null : null;
      if (req.user) {
        const now = Date.now();
        if (now - (lastTouch.get(req.user.id) || 0) > TOUCH_EVERY_MS) {
          lastTouch.set(req.user.id, now);
          touch.run(now, req.user.id);
        }
      }
      next();
    },

    requireUser(req, res, next) {
      if (!req.user) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
      next();
    },

    requireAdmin(req, res, next) {
      if (!req.user) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ Admin mới vào được trang này' });
      next();
    },

    endAllSessions(userId) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    },

    startSession(res, userId) {
      purgeExpired.run(Date.now());
      const token = crypto.randomBytes(32).toString('hex');
      insertSession.run(sha256(token), userId, Date.now() + SESSION_MS);
      res.setHeader('Set-Cookie', cookie(token, SESSION_MS / 1000));
    },

    endSession(req, res) {
      const token = parseCookies(req.headers.cookie).sid;
      if (token) deleteSession.run(sha256(token));
      res.setHeader('Set-Cookie', cookie('', 0));
    },
  };
}
