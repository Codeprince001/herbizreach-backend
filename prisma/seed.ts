/**
 * Seeds an ADMIN user into the database (for local/staging; use strong secrets in prod).
 *
 * Usage (from `backened/herbizreach`):
 *   npx prisma db seed
 *
 * Required env (either pair works):
 *   - ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD
 *   - ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD  (same vars as runtime bootstrap)
 *
 * Optional:
 *   - ADMIN_SEED_RESET_PASSWORD=true — if the user already exists, re-hash and save the password
 *     from env (fixes "can't log in" when the DB had an old hash). Remove after resetting.
 *
 * Behavior:
 *   - If the email exists: promote to ADMIN, clear disabledAt; password unchanged unless
 *     ADMIN_SEED_RESET_PASSWORD=true.
 *   - If missing: creates user with bcrypt (12 rounds, same as app).
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BCRYPT_ROUNDS = 12;

const prisma = new PrismaClient();

async function main() {
  const rawEmail =
    process.env.ADMIN_SEED_EMAIL?.trim() ||
    process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const password =
    process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const resetPassword =
    process.env.ADMIN_SEED_RESET_PASSWORD === 'true' ||
    process.env.ADMIN_SEED_RESET_PASSWORD === '1';

  if (!rawEmail) {
    console.error(
      'Missing email: set ADMIN_SEED_EMAIL or ADMIN_BOOTSTRAP_EMAIL in .env',
    );
    process.exit(1);
  }
  if (!password) {
    console.error(
      'Missing password: set ADMIN_SEED_PASSWORD or ADMIN_BOOTSTRAP_PASSWORD in .env',
    );
    process.exit(1);
  }

  const email = rawEmail.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const updates: { role?: UserRole; disabledAt?: null; passwordHash?: string } = {};

    if (existing.role !== UserRole.ADMIN) {
      updates.role = UserRole.ADMIN;
      updates.disabledAt = null;
    } else if (existing.disabledAt) {
      updates.disabledAt = null;
    }

    if (resetPassword) {
      updates.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: existing.id },
        data: updates,
      });
      if (updates.passwordHash) {
        console.log(`Updated password for existing user: ${email}`);
      }
      if (updates.role === UserRole.ADMIN) {
        console.log(`Promoted or restored admin: ${email}`);
      }
    } else {
      console.log(`No changes (admin already OK). Use ADMIN_SEED_RESET_PASSWORD=true to set password.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'Administrator',
      role: UserRole.ADMIN,
      businessName: null,
      businessSlug: null,
    },
  });

  console.log(`Created admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
