/** Parses values like `7d`, `24h`, `3600` (seconds) for @nestjs/jwt signOptions. */
export function parseJwtExpirySeconds(value: string): number {
  const v = value.trim().toLowerCase();
  const match = /^(\d+)([dhms]?)$/.exec(v);
  if (!match) {
    return 7 * 24 * 60 * 60;
  }
  const n = parseInt(match[1], 10);
  const unit = match[2] || 's';
  switch (unit) {
    case 'd':
      return n * 24 * 60 * 60;
    case 'h':
      return n * 60 * 60;
    case 'm':
      return n * 60;
    case 's':
    default:
      return n;
  }
}
