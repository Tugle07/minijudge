/* Bản nháp code lưu trong trình duyệt, tách riêng theo tài khoản.
 * Máy phòng thực hành dùng chung: tài khoản sau không được thấy code của tài khoản trước,
 * và đăng xuất thì xóa nháp của tài khoản đó (bài đã nộp vẫn nằm trên server). */
const PREFIX = 'mj-draft:';
const LEGACY = /^mj-(code|exam)-/;
let owner = '';

const keyOf = (k) => `${PREFIX}${owner}:${k}`;
const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};
const keys = () => safe(() => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)), []);

export function setDraftOwner(username) {
  owner = username || '';
  /* Nháp kiểu cũ (không gắn tài khoản) không biết của ai → xóa luôn. */
  keys().filter((k) => k && LEGACY.test(k)).forEach((k) => safe(() => localStorage.removeItem(k)));
}

export const readDraft = (k) => (owner ? safe(() => localStorage.getItem(keyOf(k))) : null);

export function saveDraft(k, code) {
  if (owner) safe(() => localStorage.setItem(keyOf(k), code));
}

export function clearDrafts(username = owner) {
  if (!username) return;
  const mine = `${PREFIX}${username}:`;
  keys().filter((k) => k && k.startsWith(mine)).forEach((k) => safe(() => localStorage.removeItem(k)));
}
