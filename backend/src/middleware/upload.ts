import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { AppError } from './errorHandler';

const LOGOS_DIR = path.join(__dirname, '../../uploads/logos');

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
    cb(null, LOGOS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new AppError(400, 'Logo must be a PNG, JPEG, WEBP, or SVG image'));
      return;
    }
    cb(null, true);
  },
});
