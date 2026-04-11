import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * One-time style bootstrap: if ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD are set,
 * ensures that user exists as ADMIN. Does not overwrite password if user already exists.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('adminBootstrap.email');
    const password = this.config.get<string>('adminBootstrap.password');
    if (!email || !password) {
      return;
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== 'ADMIN') {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: 'ADMIN', disabledAt: null },
        });
        this.logger.log(`Promoted existing user ${email} to ADMIN`);
      }
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'Administrator',
        role: 'ADMIN',
        businessName: null,
        businessSlug: null,
      },
    });
    this.logger.warn(
      `Created admin user ${email}. Remove ADMIN_BOOTSTRAP_PASSWORD from env after first deploy.`,
    );
  }
}
