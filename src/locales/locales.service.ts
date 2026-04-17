import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(-[a-z0-9]{2,8})?$/;

@Injectable()
export class LocalesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent seed so environments always have the default catalog of languages. */
  async ensureDefaultLocales(): Promise<void> {
    const seeds: Array<{
      code: string;
      labelEnglish: string;
      labelNative: string;
      sortOrder: number;
    }> = [
      { code: 'pcm', labelEnglish: 'Nigerian Pidgin', labelNative: 'Naija Pidgin', sortOrder: 10 },
      { code: 'yo', labelEnglish: 'Yoruba', labelNative: 'Yorùbá', sortOrder: 20 },
      { code: 'sw', labelEnglish: 'Swahili', labelNative: 'Kiswahili', sortOrder: 30 },
      { code: 'fr', labelEnglish: 'French (WAEMU)', labelNative: 'Français', sortOrder: 40 },
    ];
    for (const s of seeds) {
      await this.prisma.platformLocale.upsert({
        where: { code: s.code },
        create: {
          code: s.code,
          labelEnglish: s.labelEnglish,
          labelNative: s.labelNative,
          isEnabled: true,
          sortOrder: s.sortOrder,
        },
        update: {
          labelEnglish: s.labelEnglish,
          labelNative: s.labelNative,
          sortOrder: s.sortOrder,
        },
      });
    }
  }

  validateLocaleCode(code: string): string {
    const c = code.trim().toLowerCase();
    if (!LOCALE_CODE_PATTERN.test(c)) {
      throw new BadRequestException('Invalid locale code');
    }
    return c;
  }

  async getActiveLocalesPublic() {
    return this.prisma.platformLocale.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        code: true,
        labelEnglish: true,
        labelNative: true,
      },
    });
  }

  async getAllLocalesForAdmin() {
    return this.prisma.platformLocale.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        code: true,
        labelEnglish: true,
        labelNative: true,
        isEnabled: true,
        sortOrder: true,
      },
    });
  }

  async assertLocaleEnabledForWrite(code: string): Promise<void> {
    const c = this.validateLocaleCode(code);
    const row = await this.prisma.platformLocale.findUnique({ where: { code: c } });
    if (!row) {
      throw new BadRequestException('Unknown locale');
    }
    if (!row.isEnabled) {
      throw new BadRequestException('This language is not available right now');
    }
  }

  async isLocaleActive(code: string): Promise<boolean> {
    const c = code.trim().toLowerCase();
    if (!LOCALE_CODE_PATTERN.test(c)) return false;
    const row = await this.prisma.platformLocale.findUnique({
      where: { code: c },
      select: { isEnabled: true },
    });
    return !!row?.isEnabled;
  }

  /**
   * For public storefront: returns locale code to apply, or null for canonical English fields.
   */
  async resolvePublicLocale(requested: string | undefined): Promise<string | null> {
    if (requested === undefined || requested === null) return null;
    const t = requested.trim().toLowerCase();
    if (!t || t === 'en') return null;
    if (!(await this.isLocaleActive(t))) return null;
    return t;
  }

  async setLocaleEnabled(code: string, isEnabled: boolean) {
    const c = this.validateLocaleCode(code);
    const existing = await this.prisma.platformLocale.findUnique({ where: { code: c } });
    if (!existing) {
      throw new NotFoundException('Locale not found');
    }
    return this.prisma.platformLocale.update({
      where: { code: c },
      data: { isEnabled },
      select: {
        code: true,
        labelEnglish: true,
        labelNative: true,
        isEnabled: true,
        sortOrder: true,
      },
    });
  }
}
