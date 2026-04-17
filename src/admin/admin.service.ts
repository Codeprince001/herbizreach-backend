import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationStatus, Prisma, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { LocalesService } from '../locales/locales.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { AdminCreateCategoryDto } from './dto/admin-create-category.dto';
import { AdminUpdateProductDto } from './dto/admin-update-product.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

const productInclude = {
  categories: { include: { category: true } },
  translations: { orderBy: { localeCode: 'asc' as const } },
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly productsService: ProductsService,
    private readonly localesService: LocalesService,
  ) {}

  async listPlatformLocales() {
    return this.localesService.getAllLocalesForAdmin();
  }

  async setPlatformLocaleEnabled(actorId: string, code: string, isEnabled: boolean) {
    const row = await this.localesService.setLocaleEnabled(code, isEnabled);
    await this.audit.log({
      actorUserId: actorId,
      action: 'platform_locale.update',
      entityType: 'platform_locale',
      entityId: code,
      metadata: JSON.parse(JSON.stringify({ isEnabled })) as Prisma.InputJsonValue,
    });
    return row;
  }

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
    const now = new Date();
    const from14 = new Date(now);
    from14.setUTCDate(from14.getUTCDate() - 14);
    from14.setUTCHours(0, 0, 0, 0);
    const from7 = new Date(now);
    from7.setUTCDate(from7.getUTCDate() - 7);
    const from30 = new Date(now);
    from30.setUTCDate(from30.getUTCDate() - 30);

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
      unpublishedProducts,
      featuredProducts,
      openConversations,
      messagesTotal,
      auditLogsTotal,
      newUsers7d,
      newUsers30d,
      newProducts7d,
      newLeads30d,
      pageViewsByDay,
      signupsByDay,
      productsByDay,
      messagesByDay,
      sharesByDay,
      categoriesTotal,
      categoriesNew7d,
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
      this.prisma.product.count({ where: { isPublished: false } }),
      this.prisma.product.count({ where: { featured: true } }),
      this.prisma.conversation.count({ where: { status: ConversationStatus.OPEN } }),
      this.prisma.message.count(),
      this.prisma.auditLog.count(),
      this.prisma.user.count({ where: { createdAt: { gte: from7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: from30 } } }),
      this.prisma.product.count({ where: { createdAt: { gte: from7 } } }),
      this.prisma.lead.count({ where: { createdAt: { gte: from30 } } }),
      this.prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT ("viewed_at" AT TIME ZONE 'UTC')::date AS d, COUNT(*)::bigint AS c
        FROM "page_views"
        WHERE "viewed_at" >= ${from14}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT ("created_at" AT TIME ZONE 'UTC')::date AS d, COUNT(*)::bigint AS c
        FROM "users"
        WHERE "created_at" >= ${from14}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT ("created_at" AT TIME ZONE 'UTC')::date AS d, COUNT(*)::bigint AS c
        FROM "products"
        WHERE "created_at" >= ${from14}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT ("created_at" AT TIME ZONE 'UTC')::date AS d, COUNT(*)::bigint AS c
        FROM "messages"
        WHERE "created_at" >= ${from14}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
        SELECT ("created_at" AT TIME ZONE 'UTC')::date AS d, COUNT(*)::bigint AS c
        FROM "share_events"
        WHERE "created_at" >= ${from14}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.category.count(),
      this.prisma.category.count({ where: { createdAt: { gte: from7 } } }),
    ]);

    const seriesLast14Days = this.buildDailySeries14(
      pageViewsByDay,
      signupsByDay,
      productsByDay,
      messagesByDay,
      sharesByDay,
    );

    return {
      users: { total: users, owners, customers, admins },
      products: {
        total: products,
        published: publishedProducts,
        unpublished: unpublishedProducts,
        featured: featuredProducts,
      },
      engagement: {
        pageViews,
        shareEvents,
        conversations,
        leads,
        openConversations,
        messagesTotal,
      },
      activity: {
        auditLogsTotal,
        newUsers7d,
        newUsers30d,
        newProducts7d,
        newLeads30d,
      },
      categories: {
        total: categoriesTotal,
        newLast7Days: categoriesNew7d,
      },
      seriesLast14Days,
    };
  }

  async listCategoriesWithStats() {
    const from7 = new Date();
    from7.setUTCDate(from7.getUTCDate() - 7);
    from7.setUTCHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        name: string;
        created_at: Date;
        product_count: bigint;
        published_product_count: bigint;
        page_views_total: bigint;
        share_events_total: bigint;
        page_views_7d: bigint;
        new_products_7d: bigint;
      }>
    >(Prisma.sql`
      SELECT
        c.id,
        c.slug,
        c.name,
        c.created_at,
        COUNT(DISTINCT pc.product_id)::bigint AS product_count,
        COUNT(DISTINCT CASE WHEN p.is_published THEN pc.product_id END)::bigint AS published_product_count,
        COUNT(DISTINCT pv.id)::bigint AS page_views_total,
        COUNT(DISTINCT se.id)::bigint AS share_events_total,
        COUNT(DISTINCT CASE WHEN pv.viewed_at >= ${from7} THEN pv.id END)::bigint AS page_views_7d,
        COUNT(DISTINCT CASE WHEN p.created_at >= ${from7} THEN pc.product_id END)::bigint AS new_products_7d
      FROM categories c
      LEFT JOIN product_categories pc ON pc.category_id = c.id
      LEFT JOIN products p ON p.id = pc.product_id
      LEFT JOIN page_views pv ON pv.product_id = p.id
      LEFT JOIN share_events se ON se.product_id = p.id
      GROUP BY c.id, c.slug, c.name, c.created_at
      ORDER BY c.name ASC
    `);

    const items = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      createdAt: r.created_at,
      stats: {
        productCount: Number(r.product_count),
        publishedProductCount: Number(r.published_product_count),
        pageViewsTotal: Number(r.page_views_total),
        shareEventsTotal: Number(r.share_events_total),
        pageViewsLast7Days: Number(r.page_views_7d),
        newProductsLast7Days: Number(r.new_products_7d),
      },
    }));

    return { items };
  }

  async createCategory(actorId: string, dto: AdminCreateCategoryDto) {
    const slugSource = dto.slug?.trim() ? dto.slug : dto.name;
    const slug = this.slugifyCategorySlug(slugSource);
    if (slug.length < 2) {
      throw new BadRequestException('Slug is too short; use a clearer name or slug.');
    }
    const taken = await this.prisma.category.findUnique({ where: { slug } });
    if (taken) {
      throw new BadRequestException('A category with this slug already exists');
    }
    const name = dto.name.trim();
    const cat = await this.prisma.category.create({
      data: { slug, name },
      select: { id: true, slug: true, name: true, createdAt: true },
    });
    await this.audit.log({
      actorUserId: actorId,
      action: 'category.create',
      entityType: 'category',
      entityId: cat.id,
      metadata: JSON.parse(JSON.stringify({ slug: cat.slug, name: cat.name })) as Prisma.InputJsonValue,
    });
    return cat;
  }

  private slugifyCategorySlug(raw: string): string {
    const s = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s.slice(0, 80);
  }

  private buildDailySeries14(
    pageViews: Array<{ d: Date; c: bigint }>,
    signups: Array<{ d: Date; c: bigint }>,
    products: Array<{ d: Date; c: bigint }>,
    messages: Array<{ d: Date; c: bigint }>,
    shares: Array<{ d: Date; c: bigint }>,
  ) {
    const toKey = (d: Date) => d.toISOString().slice(0, 10);
    const map = (rows: Array<{ d: Date; c: bigint }>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const r of rows) {
        out[toKey(r.d)] = Number(r.c);
      }
      return out;
    };
    const pv = map(pageViews);
    const su = map(signups);
    const pr = map(products);
    const msg = map(messages);
    const sh = map(shares);

    const days: string[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(12, 0, 0, 0);
      days.push(d.toISOString().slice(0, 10));
    }

    return days.map((date) => ({
      date,
      pageViews: pv[date] ?? 0,
      signups: su[date] ?? 0,
      newProducts: pr[date] ?? 0,
      messages: msg[date] ?? 0,
      shares: sh[date] ?? 0,
    }));
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
