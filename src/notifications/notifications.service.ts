import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationSeverity, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from './fcm.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        severity: input.severity ?? NotificationSeverity.INFO,
        title: input.title.trim(),
        body: input.body?.trim() || null,
        actionUrl: input.actionUrl?.trim() || null,
        entityType: input.entityType?.trim() || null,
        entityId: input.entityId ?? null,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });
  }

  private baseWhere(
    userId: string,
    query: Pick<ListNotificationsQueryDto, 'unreadOnly' | 'includeArchived' | 'type'>,
  ): Prisma.NotificationWhereInput {
    const archivedFilter: Prisma.NotificationWhereInput = query.includeArchived
      ? {}
      : { archivedAt: null };
    return {
      userId,
      ...archivedFilter,
      ...(query.type ? { type: query.type } : {}),
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
  }

  async list(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.baseWhere(userId, query);
    const [items, total, unreadTotal] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, readAt: null, archivedAt: null },
      }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      unreadTotal,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
        archivedAt: null,
      },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: row.readAt ?? new Date() },
    });
  }

  async markAllRead(userId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        archivedAt: null,
      },
      data: { readAt: now },
    });
    return { updated: result.count };
  }

  async archive(userId: string, id: string) {
    await this.assertOwned(userId, id);
    return this.prisma.notification.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async unarchive(userId: string, id: string) {
    await this.assertOwned(userId, id);
    return this.prisma.notification.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true as const };
  }

  private async assertOwned(userId: string, id: string) {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    return row;
  }

  /** @internal Emit when a shopper submits a lead on the public store. */
  async notifyNewLead(
    ownerUserId: string,
    lead: { id: string; name: string; phone: string; productId: string | null },
  ) {
    await this.create({
      userId: ownerUserId,
      type: NotificationType.LEAD,
      severity: NotificationSeverity.SUCCESS,
      title: 'New lead',
      body: `${lead.name} left their phone number.`,
      actionUrl: '/leads',
      entityType: 'Lead',
      entityId: lead.id,
      metadata: {
        leadName: lead.name,
        phone: lead.phone,
        productId: lead.productId,
      },
    });
  }

  /** @internal Emit when a customer or guest sends a chat message to the store. */
  async notifyStoreInboundChat(
    storeUserId: string,
    conversationId: string,
    messagePreview: string,
  ) {
    const preview =
      messagePreview.length > 160 ? `${messagePreview.slice(0, 157)}…` : messagePreview;
    await this.create({
      userId: storeUserId,
      type: NotificationType.CHAT,
      severity: NotificationSeverity.INFO,
      title: 'New chat message',
      body: preview || 'Open Messages to reply.',
      actionUrl: '/chat',
      entityType: 'Conversation',
      entityId: conversationId,
      metadata: { conversationId },
    });
    await this.fcm
      .sendPushForStoreInboundChat(
        storeUserId,
        conversationId,
        'New chat message',
        preview || 'Open Messages to reply.',
      )
      .catch(() => undefined);
  }
}
