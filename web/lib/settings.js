/* Cài đặt chỉnh được trong Admin, lưu trong bảng settings. Giá trị khởi tạo lấy từ biến môi trường. */
const DEFAULTS = { register_code: '', allow_register: '1', banner: '' };

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
    update({ registerCode: code, allowRegister, banner }) {
      if (typeof code === 'string') put.run('register_code', code.trim().toUpperCase().slice(0, 32));
      if (typeof allowRegister === 'boolean') put.run('allow_register', allowRegister ? '1' : '0');
      if (typeof banner === 'string') put.run('banner', banner.trim().slice(0, 200));
    },
  };
}
