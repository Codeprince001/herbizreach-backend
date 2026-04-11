import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function productImageMulterOptions() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter(
      _req: Express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) {
      if (!ALLOWED.has(file.mimetype)) {
        return cb(
          new BadRequestException(
            'Invalid image type. Allowed: JPEG, PNG, WebP, GIF',
          ),
          false,
        );
      }
      cb(null, true);
    },
  };
}
