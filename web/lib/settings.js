/* Cài đặt chỉnh được trong Admin, lưu trong bảng settings. Giá trị khởi tạo lấy từ biến môi trường. */
const VALID_LANGS = ['c', 'cpp', 'py'];
const DEFAULTS = { register_code: '', allow_register: '1', banner: '', allowed_langs: 'c' };

export function createSettings(db, { registerCode = '' } = {}) {
  const get = db.prepare('SELECT value FROM settings WHERE key = ?');
  const put = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

  if (!get.get('register_code') && registerCode) put.run('register_code', registerCode);

  const read = (key) => get.get(key)?.value ?? DEFAULTS[key];
  return {
    get registerCode() {
      return read('register_code');
    },
    get allowRegister() {
      return read('allow_register') === '1';
    },
    get banner() {
      return read('banner');
    },
    get allowedLangs() {
      const raw = read('allowed_langs') || 'c';
      const list = raw.split(',').map((x) => x.trim().toLowerCase()).filter((x) => VALID_LANGS.includes(x));
      return list.length ? list : ['c'];
    },
    update({ registerCode: code, allowRegister, banner, allowedLangs }) {
      if (typeof code === 'string') put.run('register_code', code.trim().toUpperCase().slice(0, 32));
      if (typeof allowRegister === 'boolean') put.run('allow_register', allowRegister ? '1' : '0');
      if (typeof banner === 'string') put.run('banner', banner.trim().slice(0, 200));
      if (Array.isArray(allowedLangs)) {
        const cleaned = allowedLangs.map((x) => String(x).trim().toLowerCase()).filter((x) => VALID_LANGS.includes(x));
        const val = cleaned.length ? cleaned.join(',') : 'c';
        put.run('allowed_langs', val);
      }
    },
  };
}
