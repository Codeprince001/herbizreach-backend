import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const now = new Date();
    // Seven UTC calendar days ending today (matches bucket keys from viewedAt).
    const utcY = now.getUTCFullYear();
    const utcM = now.getUTCMonth();
    const utcD = now.getUTCDate();
    const windowStart = new Date(Date.UTC(utcY, utcM, utcD - 6, 0, 0, 0, 0));

    const [totalViews, totalShares, products, recentViews] = await Promise.all([
      this.prisma.pageView.count({ where: { userId } }),
      this.prisma.shareEvent.count({ where: { userId } }),
      this.prisma.product.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          isPublished: true,
          _count: {
            select: {
              pageViews: true,
              shareEvents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pageView.findMany({
        where: { userId, viewedAt: { gte: windowStart } },
        select: { viewedAt: true },
      }),
    ]);

    const dailyMap = new Map<string, number>();
    for (const v of recentViews) {
      const d = v.viewedAt.toISOString().slice(0, 10);
      dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
    }

    const viewsLast7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const bucket = new Date(Date.UTC(utcY, utcM, utcD - i, 0, 0, 0, 0));
      const key = bucket.toISOString().slice(0, 10);
      viewsLast7Days.push({ date: key, count: dailyMap.get(key) ?? 0 });
    }

    return {
      totals: {
        pageViews: totalViews,
        shares: totalShares,
      },
      products: products.map((p) => ({
        productId: p.id,
        name: p.name,
        isPublished: p.isPublished,
        pageViews: p._count.pageViews,
        shares: p._count.shareEvents,
      })),
      viewsLast7Days,
    };
  }
}
