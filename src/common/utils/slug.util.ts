import { randomBytes } from 'crypto';

const MAX_SLUG_LEN = 80;

export function slugifyBusinessName(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LEN);
  return base || 'store';
}

export function uniqueSlugSuffix(): string {
  return randomBytes(3).toString('hex');
}
