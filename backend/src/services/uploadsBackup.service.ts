import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
// Local-disk backup only - protects against accidental deletion/corruption
// of the live uploads folder, not against this machine's disk failing
// entirely. Configurable since the right destination (which drive, which
// path) is specific to whatever machine this is deployed on.
const BACKUP_ROOT = process.env.UPLOADS_BACKUP_DIR || 'D:\\Backups\\protecther-uploads';
const RETENTION_COUNT = 7;

async function hasAnyFiles(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) return true;
      if (entry.isDirectory() && (await hasAnyFiles(path.join(dir, entry.name)))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function pruneOldBackups(): Promise<void> {
  const entries = await fs.readdir(BACKUP_ROOT, { withFileTypes: true });
  const backupDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(); // YYYY-MM-DD folder names sort correctly as plain strings

  const toDelete = backupDirs.slice(0, Math.max(0, backupDirs.length - RETENTION_COUNT));
  for (const dirName of toDelete) {
    await fs.rm(path.join(BACKUP_ROOT, dirName), { recursive: true, force: true });
    console.log(`Pruned old uploads backup: ${dirName}`);
  }
}

/**
 * Copies the live uploads folder to a dated subfolder under BACKUP_ROOT,
 * then prunes backups beyond RETENTION_COUNT. Never throws - a failed
 * backup attempt shouldn't crash the server, just gets logged so it's
 * visible without silently going unnoticed.
 */
export async function backupUploads(): Promise<void> {
  try {
    if (!(await hasAnyFiles(UPLOADS_DIR))) {
      return; // nothing uploaded yet - nothing to back up
    }

    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const destination = path.join(BACKUP_ROOT, timestamp);

    await fs.mkdir(BACKUP_ROOT, { recursive: true });
    await fs.cp(UPLOADS_DIR, destination, { recursive: true, force: true });
    console.log(`Uploads backed up to ${destination}`);

    await pruneOldBackups();
  } catch (err) {
    console.error('Uploads backup failed:', err);
  }
}
