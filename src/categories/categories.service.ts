import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_CATEGORIES = [
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'food', name: 'Food & Drinks' },
  { slug: 'beauty', name: 'Beauty' },
  { slug: 'crafts', name: 'Crafts & Gifts' },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.category.count();
    if (count > 0) return;
    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES,
      skipDuplicates: true,
    });
  }

  async list() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
}
