import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { AdminUpdateProductDto } from './dto/admin-update-product.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

const productInclude = {
  categories: { include: { category: true } },
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly productsService: ProductsService,
  ) {}

  async listUsers(
    page: number,
    limit: number,
    role?: UserRole,
    search?: string,
  ) {
    const where = {
      ...(role ? { role } : {}),
      ...(search ?
        {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { businessName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          businessName: true,
          businessSlug: true,
          role: true,
          disabledAt: true,
          createdAt: true,
          avatarUrl: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        businessName: true,
        businessSlug: true,
        phone: true,
        role: true,
        disabledAt: true,
        createdAt: true,
        avatarUrl: true,
        emailVerifiedAt: true,
        _count: {
          select: { products: true, conversationsAsStore: true, leadsReceived: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(actorId: string, id: string, dto: AdminUpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (existing.role === UserRole.ADMIN && dto.role && dto.role !== UserRole.ADMIN) {
      const admins = await this.prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (admins <= 1) {
        throw new BadRequestException('Cannot remove the last admin');
      }
    }
    const data: {
      role?: UserRole;
      disabledAt?: Date | null;
    } = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.disabled !== undefined) {
      data.disabledAt = dto.disabled ? new Date() : null;
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        disabledAt: true,
        businessSlug: true,
      },
    });
    await this.audit.log({
      actorUserId: actorId,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      metadata: JSON.parse(JSON.stringify({ changes: dto })) as Prisma.InputJsonValue,
    });
    return user;
  }

  async listProducts(
    page: number,
    limit: number,
    userId?: string,
    search?: string,
  ) {
    const where = {
      ...(userId ? { userId } : {}),
      ...(search ?
        {
          name: { contains: search, mode: 'insensitive' as const },
        }
      : {}),
    };
    const [raw, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, businessName: true, businessSlug: true },
          },
          ...productInclude,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    const items = raw.map((p) => {
      const { user: owner, ...prod } = p;
      return {
        ...this.productsService.serializeProduct(prod),
        owner,
      };
    });
    return { items, total, page, limit };
  }

  async getProduct(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, businessName: true, businessSlug: true },
        },
        ...productInclude,
      },
    });
    if (!p) {
      throw new NotFoundException('Product not found');
    }
    const { user: owner, ...prod } = p;
    return {
      ...this.productsService.serializeProduct(prod),
      owner,
    };
  }

  async updateProduct(actorId: string, id: string, dto: AdminUpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }
    const data: {
      name?: string;
      price?: Decimal;
      isPublished?: boolean;
      featured?: boolean;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = new Decimal(dto.price);
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.featured !== undefined) data.featured = dto.featured;
    const p = await this.prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    });
    await this.audit.log({
      actorUserId: actorId,
      action: 'product.update',
      entityType: 'product',
      entityId: id,
      metadata: JSON.parse(JSON.stringify({ changes: dto })) as Prisma.InputJsonValue,
    });
    return this.productsService.serializeProduct(p);
  }

  async deleteProduct(actorId: string, id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }
    await this.prisma.product.delete({ where: { id } });
    await this.audit.log({
      actorUserId: actorId,
      action: 'product.delete',
      entityType: 'product',
      entityId: id,
    });
    return { deleted: true };
  }

  async metrics() {
    const [
      users,
      owners,
      customers,
      admins,
      products,
      publishedProducts,
      pageViews,
      shareEvents,
      conversations,
      leads,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.OWNER } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isPublished: true } }),
      this.prisma.pageView.count(),
      this.prisma.shareEvent.count(),
      this.prisma.conversation.count(),
      this.prisma.lead.count(),
    ]);
    return {
      users: { total: users, owners, customers, admins },
      products: { total: products, published: publishedProducts },
      engagement: { pageViews, shareEvents, conversations, leads },
    };
  }

  async listConversations(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          storeOwner: {
            select: { id: true, businessName: true, businessSlug: true, email: true },
          },
          customer: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.conversation.count(),
    ]);
    return { items, total, page, limit };
  }

  async conversationMessages(conversationId: string, page: number, limit: number) {
    const c = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!c) {
      throw new NotFoundException('Conversation not found');
    }
    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return { items, total, page, limit };
  }

  async listAuditLogs(
    page: number,
    limit: number,
    actorUserId?: string,
    entityType?: string,
  ) {
    const where = {
      ...(actorUserId ? { actorUserId } : {}),
      ...(entityType ? { entityType } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { id: true, email: true, fullName: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
