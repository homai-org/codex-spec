import fs from 'fs-extra';
import path from 'path';

export async function ensureDirSafe(dirPath) {
  await fs.ensureDir(dirPath);
}

export async function writeJsonAtomic(filePath, data, spaces = 2) {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeJson(tmpPath, data, { spaces });
  await fs.move(tmpPath, filePath, { overwrite: true });
}

export async function backupFile(filePath) {
  if (!await fs.pathExists(filePath)) return null;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const backupDir = path.join(dir, 'backups');
  await fs.ensureDir(backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${base}.${timestamp}.bak`);
  await fs.copy(filePath, backupPath);
  return backupPath;
}


