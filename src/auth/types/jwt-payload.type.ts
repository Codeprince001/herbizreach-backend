import type { UserRole } from '@prisma/client';

export type JwtPayloadUser = {
  sub: string;
  email: string;
  role: UserRole;
};
