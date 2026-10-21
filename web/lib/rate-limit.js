/* Giới hạn số lần thử trong một khoảng thời gian (chống dò mật khẩu, spam tạo tài khoản).
 * keyOf mặc định tính theo IP + tài khoản: cả lớp ngồi chung wifi trường có chung một IP công khai,
 * nếu chỉ tính theo IP thì một người nộp nhanh sẽ chặn luôn cả lớp. */
export const byIpAndUser = (req) =>
  `${req.clientIp}|${req.user?.id ?? String(req.body?.username ?? '').trim().toLowerCase()}`;

export function createRateLimit({ windowMs, max, message, keyOf = byIpAndUser }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyOf(req);
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
