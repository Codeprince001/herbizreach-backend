import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { slugifyBusinessName, uniqueSlugSuffix } from '../common/utils/slug.util';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        businessSlug: slug,
        role: 'OWNER',
        disabledAt: null,
      },
    });
  }

  async createOwner(data: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    phone?: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    let baseSlug = slugifyBusinessName(data.businessName);
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 8) {
      const existing = await this.prisma.user.findUnique({ where: { businessSlug: slug } });
      if (!existing) break;
      slug = `${baseSlug}-${uniqueSlugSuffix()}`;
      attempt += 1;
    }
    if (attempt >= 8) {
      slug = `${baseSlug}-${uniqueSlugSuffix()}${uniqueSlugSuffix()}`;
    }
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        fullName: data.fullName.trim(),
        businessName: data.businessName.trim(),
        businessSlug: slug,
        phone: data.phone?.trim() || null,
        role: 'OWNER',
      },
    });
  }

  async createCustomer(data: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        fullName: data.fullName.trim(),
        role: 'CUSTOMER',
        businessName: null,
        businessSlug: null,
        phone: null,
      },
    });
  }

  async validatePassword(plain: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plain, passwordHash);
  }

  toPublicProfile(user: User) {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }
}
