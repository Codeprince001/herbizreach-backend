import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const PASSWORD_RESET_CODE_ROUNDS = 10;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    phone: string;
  }) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.usersService.createOwner(dto);
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    void this.mailService.sendWelcomeEmail(user.email, user.fullName).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Welcome email failed: ${msg}`);
    });
    return {
      access_token: token,
      user: this.usersService.toPublicProfile(user),
    };
  }

  async registerCustomer(dto: { email: string; password: string; fullName: string }) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.usersService.createCustomer(dto);
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    void this.mailService.sendWelcomeEmail(user.email, user.fullName).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Welcome email failed: ${msg}`);
    });
    return {
      access_token: token,
      user: this.usersService.toPublicProfile(user),
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.disabledAt) {
      throw new UnauthorizedException('Account is disabled');
    }
    const ok = await this.usersService.validatePassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      access_token: token,
      user: this.usersService.toPublicProfile(user),
    };
  }

  async requestPasswordReset(emailRaw: string): Promise<{ message: string }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    const generic = {
      message:
        'If an account exists for this email, a reset code has been sent. Check your inbox and spam folder.',
    };
    const user = await this.usersService.findByEmail(email);
    if (!user || user.disabledAt) {
      return generic;
    }
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, PASSWORD_RESET_CODE_ROUNDS);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
      },
    });
    try {
      await this.mailService.sendPasswordResetCode(user.email, user.fullName, code);
    } catch {
      this.logger.error(`Failed to send password reset email to ${user.email}`);
    }
    return generic;
  }

  async resetPassword(
    emailRaw: string,
    codeRaw: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    const code = typeof codeRaw === 'string' ? codeRaw.trim() : '';
    const user = await this.usersService.findByEmail(email);
    if (!user || user.disabledAt) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const token = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!token) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    const match = await bcrypt.compare(code, token.codeHash);
    if (!match) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    await this.usersService.updatePassword(user.id, newPassword);
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    return { message: 'Your password has been updated. You can sign in with your new password.' };
  }
}
