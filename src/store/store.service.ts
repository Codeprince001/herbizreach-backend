import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LocalesService } from '../locales/locales.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

const productInclude = {
  categories: { include: { category: true } },
} as const;

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly localesService: LocalesService,
  ) {}

  async getPublicStoreBySlug(slug: string, locale?: string) {
    const localeApplied = await this.localesService.resolvePublicLocale(locale);
    const owner = await this.prisma.user.findFirst({
      where: {
        businessSlug: slug,
        role: UserRole.OWNER,
        disabledAt: null,
      },
      select: {
        id: true,
        businessName: true,
        businessSlug: true,
        fullName: true,
        phone: true,
        createdAt: true,
        avatarUrl: true,
      },
    });
    if (!owner) {
      throw new NotFoundException('Store not found');
    }
    const [products, storeSettings, activeLocales] = await Promise.all([
      this.prisma.product.findMany({
        where: { userId: owner.id, isPublished: true },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: productInclude,
      }),
      this.prisma.storeSettings.findUnique({ where: { userId: owner.id } }),
      this.localesService.getActiveLocalesPublic(),
    ]);

    let storeTranslation:
      | { tagline: string | null; description: string | null }
      | null = null;
    if (localeApplied && storeSettings) {
      storeTranslation = await this.prisma.storeSettingsTranslation.findUnique({
        where: {
          storeSettingsId_localeCode: {
            storeSettingsId: storeSettings.id,
            localeCode: localeApplied,
          },
        },
        select: { tagline: true, description: true },
      });
    }

    const productIds = products.map((p) => p.id);
    const productTranslations =
      localeApplied && productIds.length ?
        await this.prisma.productTranslation.findMany({
          where: { localeCode: localeApplied, productId: { in: productIds } },
        })
      : [];
    const transByProduct = new Map(
      productTranslations.map((t) => [t.productId, t] as const),
    );

    const mergedStoreSettings =
      storeSettings && localeApplied && storeTranslation ?
        {
          ...storeSettings,
          tagline: storeTranslation.tagline?.trim() || storeSettings.tagline,
          description:
            storeTranslation.description?.trim() || storeSettings.description,
        }
      : storeSettings;

    return {
      business: owner,
      storeSettings: mergedStoreSettings,
      products: products.map((p) => {
        const ser = this.productsService.serializeProduct(p);
        const tr = transByProduct.get(p.id);
        const overlay =
          localeApplied && tr ?
            { name: tr.name, description: tr.description }
          : null;
        return this.productsService.applyPublicLocaleToSerialized(ser, overlay);
      }),
      locale: localeApplied,
      activeLocales,
    };
  }

  async logView(slug: string, dto: { productId?: string; referrer?: string }) {
    const owner = await this.prisma.user.findFirst({
      where: {
        businessSlug: slug,
        role: UserRole.OWNER,
        disabledAt: null,
      },
      select: { id: true },
    });
    if (!owner) {
      throw new NotFoundException('Store not found');
    }
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          userId: owner.id,
          isPublished: true,
        },
      });
      if (!product) {
        throw new NotFoundException('Product not found on this store');
      }
    }
    await this.prisma.pageView.create({
      data: {
        userId: owner.id,
        productId: dto.productId ?? null,
        referrer: dto.referrer?.trim() || null,
      },
    });
    return { logged: true };
  }

  async logShare(slug: string, dto: { productId?: string; channel?: string }) {
    const owner = await this.prisma.user.findFirst({
      where: {
        businessSlug: slug,
        role: UserRole.OWNER,
        disabledAt: null,
      },
      select: { id: true },
    });
    if (!owner) {
      throw new NotFoundException('Store not found');
    }
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          userId: owner.id,
          isPublished: true,
        },
      });
      if (!product) {
        throw new NotFoundException('Product not found on this store');
      }
    }
    await this.prisma.shareEvent.create({
      data: {
        userId: owner.id,
        productId: dto.productId ?? null,
        channel: dto.channel?.trim() || null,
      },
    });
    return { logged: true };
  }

  async getPublicProduct(slug: string, productId: string, locale?: string) {
    const localeApplied = await this.localesService.resolvePublicLocale(locale);
    const owner = await this.prisma.user.findFirst({
      where: {
        businessSlug: slug,
        role: UserRole.OWNER,
        disabledAt: null,
      },
      select: { id: true, businessName: true, businessSlug: true },
    });
    if (!owner) {
      throw new NotFoundException('Store not found');
    }
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        userId: owner.id,
        isPublished: true,
      },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const activeLocales = await this.localesService.getActiveLocalesPublic();
    let tr =
      localeApplied ?
        await this.prisma.productTranslation.findUnique({
          where: {
            productId_localeCode: { productId, localeCode: localeApplied },
          },
        })
      : null;
    const ser = this.productsService.serializeProduct(product);
    const overlay =
      localeApplied && tr ? { name: tr.name, description: tr.description } : null;
    return {
      business: owner,
      product: this.productsService.applyPublicLocaleToSerialized(ser, overlay),
      locale: localeApplied,
      activeLocales,
    };
  }
}
