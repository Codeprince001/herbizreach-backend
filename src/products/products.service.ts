import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, Product } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductFormDto } from './dto/create-product-form.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = {
  categories: { include: { category: true } },
} as const;

type ProductWithCats = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private productsDir(): string {
    const root = this.config.get<string>('uploadDir') ?? './uploads';
    return join(process.cwd(), root, 'products');
  }

  ensureUploadDir() {
    const dir = this.productsDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  buildLocalImageUrl(filename: string): string {
    const base = this.config.get<string>('publicFilesBaseUrl') ?? 'http://localhost:4000';
    return `${base}/files/products/${filename}`;
  }

  private async persistImage(userId: string, file: Express.Multer.File): Promise<string> {
    const forceLocal = this.config.get<boolean>('useLocalImageUpload') === true;
    if (forceLocal) {
      this.ensureUploadDir();
      const ext = this.extensionFromMimetype(file.mimetype);
      const filename = `${uuidv4()}${ext}`;
      const diskPath = join(this.productsDir(), filename);
      const { writeFileSync } = await import('fs');
      writeFileSync(diskPath, file.buffer);
      return this.buildLocalImageUrl(filename);
    }
    if (this.cloudinaryService.isConfigured()) {
      return this.cloudinaryService.uploadImageBuffer(
        file.buffer,
        file.mimetype,
        `products/${userId}`,
      );
    }
    throw new BadRequestException(
      'Image upload: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or USE_LOCAL_IMAGE_UPLOAD=true',
    );
  }

  serializeProduct(p: ProductWithCats | Product) {
    const base = { ...p, price: p.price.toString() };
    if ('categories' in p && p.categories) {
      return {
        ...base,
        categories: p.categories.map((pc) => ({
          id: pc.category.id,
          slug: pc.category.slug,
          name: pc.category.name,
        })),
      };
    }
    return { ...base, categories: [] };
  }

  private async validateCategoryIds(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const count = await this.prisma.category.count({ where: { id: { in: ids } } });
    if (count !== ids.length) {
      throw new BadRequestException('One or more category IDs are invalid');
    }
  }

  async createForUser(userId: string, dto: CreateProductFormDto, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Product image is required');
    }
    const imageUrl = await this.persistImage(userId, file);
    await this.validateCategoryIds(dto.categoryIds ?? []);
    const product = await this.prisma.product.create({
      data: {
        userId,
        name: dto.name,
        price: new Decimal(dto.price),
        descriptionRaw: dto.descriptionRaw,
        imageUrl,
        isPublished: dto.isPublished ?? true,
        sku: dto.sku?.trim() || null,
        stockQuantity: dto.stockQuantity ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? null,
        featured: dto.featured ?? false,
        categories:
          dto.categoryIds?.length ?
            {
              create: dto.categoryIds.map((categoryId) => ({
                category: { connect: { id: categoryId } },
              })),
            }
          : undefined,
      },
      include: productInclude,
    });
    return this.serializeProduct(product);
  }

  private extensionFromMimetype(mime: string): string {
    if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    return '.bin';
  }

  async listForUser(userId: string) {
    const list = await this.prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: productInclude,
    });
    return list.map((p) => this.serializeProduct(p));
  }

  async getOwnedOrThrow(userId: string, productId: string): Promise<ProductWithCats> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findByIdForUser(userId: string, productId: string) {
    const product = await this.getOwnedOrThrow(userId, productId);
    return this.serializeProduct(product);
  }

  async updateForUser(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
    file?: Express.Multer.File,
  ) {
    await this.getOwnedOrThrow(userId, productId);
    let imageUrl: string | undefined;
    if (file?.buffer?.length) {
      imageUrl = await this.persistImage(userId, file);
    }
    if (dto.categoryIds !== undefined) {
      await this.validateCategoryIds(dto.categoryIds);
    }
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = new Decimal(dto.price);
    if (dto.descriptionRaw !== undefined) data.descriptionRaw = dto.descriptionRaw;
    if (dto.descriptionAi !== undefined) data.descriptionAi = dto.descriptionAi;
    if (dto.captionAi !== undefined) data.captionAi = dto.captionAi;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.sku !== undefined) data.sku = dto.sku?.trim() || null;
    if (dto.stockQuantity !== undefined) data.stockQuantity = dto.stockQuantity;
    if (dto.lowStockThreshold !== undefined) data.lowStockThreshold = dto.lowStockThreshold;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (dto.categoryIds !== undefined) {
      data.categories = {
        deleteMany: {},
        create: dto.categoryIds.map((categoryId) => ({
          category: { connect: { id: categoryId } },
        })),
      };
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    const product = await this.prisma.product.update({
      where: { id: productId },
      data,
      include: productInclude,
    });
    return this.serializeProduct(product);
  }

  async deleteForUser(userId: string, productId: string) {
    await this.getOwnedOrThrow(userId, productId);
    await this.prisma.product.delete({ where: { id: productId } });
    return { deleted: true };
  }
}
