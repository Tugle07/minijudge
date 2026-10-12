/* Giới hạn số lần thử trong một khoảng thời gian (chống dò mật khẩu, spam tạo tài khoản). */
export function createRateLimit({ windowMs, max, message }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.clientIp;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

/* Sau Cloudflare Tunnel, IP thật của người dùng nằm trong header CF-Connecting-IP. */
export function clientIp(trustCloudflare) {
  return (req, _res, next) => {
    const cf = trustCloudflare ? req.headers['cf-connecting-ip'] : undefined;
    req.clientIp = (typeof cf === 'string' && cf) || req.socket.remoteAddress || 'unknown';
    next();
  };
}
