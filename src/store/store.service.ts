import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
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
  ) {}

  async getPublicStoreBySlug(slug: string) {
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
    const [products, storeSettings] = await Promise.all([
      this.prisma.product.findMany({
        where: { userId: owner.id, isPublished: true },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: productInclude,
      }),
      this.prisma.storeSettings.findUnique({ where: { userId: owner.id } }),
    ]);
    return {
      business: owner,
      storeSettings,
      products: products.map((p) => this.productsService.serializeProduct(p)),
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

  async getPublicProduct(slug: string, productId: string) {
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
    return {
      business: owner,
      product: this.productsService.serializeProduct(product),
    };
  }
}
