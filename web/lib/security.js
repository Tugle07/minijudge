import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/* Hash các <script> inline trong trang HTML để CSP chỉ cho phép đúng những đoạn đó chạy
 * (thay vì 'unsafe-inline' cho mọi script). */
function inlineScriptHashes(publicDir) {
  const hashes = new Set();
  for (const file of fs.readdirSync(publicDir).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(publicDir, file), 'utf8');
    for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      hashes.add(`'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`);
    }
  }
  return [...hashes];
}

export function securityHeaders(publicDir) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' https://cdn.jsdelivr.net ${inlineScriptHashes(publicDir).join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return (req, res, next) => {
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    /* API không cache; file tĩnh luôn hỏi lại server (có ETag nên rẻ) để deploy mới tới ngay người dùng. */
    res.setHeader('Cache-Control', req.path.startsWith('/api/') ? 'no-store' : 'no-cache, must-revalidate');
    next();
  };
}
