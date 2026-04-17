import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from '../store/dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createForStoreSlug(slug: string, dto: CreateLeadDto) {
    const owner = await this.prisma.user.findFirst({
      where: {
        businessSlug: slug,
        role: UserRole.OWNER,
        disabledAt: null,
      },
    });
    if (!owner) {
      throw new NotFoundException('Store not found');
    }
    if (dto.productId) {
      const p = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          userId: owner.id,
          isPublished: true,
        },
      });
      if (!p) {
        throw new NotFoundException('Product not found on this store');
      }
    }
    const lead = await this.prisma.lead.create({
      data: {
        storeUserId: owner.id,
        productId: dto.productId ?? null,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        message: dto.message?.trim() || null,
      },
    });
    void this.notifications
      .notifyNewLead(owner.id, {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        productId: lead.productId,
      })
      .catch(() => undefined);
    return lead;
  }

  async listForOwner(userId: string) {
    return this.prisma.lead.findMany({
      where: { storeUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, price: true } },
      },
    });
  }
}
