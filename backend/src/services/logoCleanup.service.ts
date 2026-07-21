import fs from 'fs/promises';
import path from 'path';
import prisma from '../config/database';

const LOGOS_DIR = path.join(__dirname, '../../uploads/logos');

// Never delete a file younger than this — it might be a logo someone just
// uploaded through the admin form but hasn't saved yet (upload happens
// immediately on file-select, before the company record is actually updated).
const MIN_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Deletes logo files on disk that no company record references anymore —
 * e.g. after a logo is replaced/removed, a company is deleted, or an upload
 * was never attached to a saved company at all.
 *
 * Safe to call anytime: failures are logged, never thrown, so a cleanup
 * issue can never break the request that triggered it.
 */
export async function cleanupOrphanedLogos(): Promise<void> {
  try {
    const files = await fs.readdir(LOGOS_DIR);
    if (files.length === 0) return;

    const companies = await prisma.company.findMany({
      where: { logoUrl: { not: null } },
      select: { logoUrl: true },
    });
    const referencedFilenames = new Set(
      companies
        .map((c) => c.logoUrl && path.basename(c.logoUrl))
        .filter((name): name is string => !!name)
    );

    const now = Date.now();

    for (const file of files) {
      if (referencedFilenames.has(file)) continue;

      const filePath = path.join(LOGOS_DIR, file);
      try {
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs < MIN_AGE_MS) continue;

        await fs.unlink(filePath);
        console.log(`🧹 Deleted orphaned logo: ${file}`);
      } catch (err) {
        console.error(`Failed to clean up orphaned logo "${file}":`, err);
      }
    }
  } catch (err: any) {
    // ENOENT just means uploads/logos doesn't exist yet - nothing to do.
    if (err?.code !== 'ENOENT') {
      console.error('Logo cleanup sweep failed:', err);
    }
  }
}
