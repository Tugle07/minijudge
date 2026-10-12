import fs from 'node:fs';
import path from 'node:path';

const CHECK_EVERY_MS = 60 * 60 * 1000;

/* Mỗi ngày tạo 1 bản sao database bằng VACUUM INTO (an toàn khi server đang chạy), giữ `keep` bản gần nhất. */
export function scheduleBackups(db, dir, { keep = 14 } = {}) {
  fs.mkdirSync(dir, { recursive: true });

  const backupNow = () => {
    const file = path.join(dir, `minijudge-${new Date().toISOString().slice(0, 10)}.db`);
    if (fs.existsSync(file)) return null;
    db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    const old = fs
      .readdirSync(dir)
      .filter((f) => /^minijudge-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .sort()
      .slice(0, -keep);
    for (const f of old) fs.rmSync(path.join(dir, f), { force: true });
    return file;
  };

  const safeBackup = () => {
    try {
      const file = backupNow();
      if (file) console.log(`Backup: ${file}`);
    } catch (e) {
      console.error('Backup failed:', e);
    }
  };
  safeBackup();
  setInterval(safeBackup, CHECK_EVERY_MS).unref();
  return backupNow;
}
