import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const now = new Date();
    const day7 = new Date(now);
    day7.setDate(day7.getDate() - 7);

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
        where: { userId, viewedAt: { gte: day7 } },
        select: { viewedAt: true },
      }),
    ]);

    const dailyMap = new Map<string, number>();
    for (const v of recentViews) {
      const d = v.viewedAt.toISOString().slice(0, 10);
      dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1);
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
      viewsLast7Days: Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
