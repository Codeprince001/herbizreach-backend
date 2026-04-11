import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationStatus,
  MessageSenderType,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnerBySlug(slug: string) {
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
    return owner;
  }

  async startConversation(storeSlug: string, user?: JwtPayloadUser | null) {
    const owner = await this.getOwnerBySlug(storeSlug);
    const settings = await this.prisma.storeSettings.findUnique({
      where: { userId: owner.id },
    });
    if (settings && !settings.showChatWidget) {
      throw new ForbiddenException('Chat is disabled for this store');
    }
    let customerUserId: string | null = null;
    let guestToken: string | null = null;
    if (user?.role === UserRole.CUSTOMER) {
      customerUserId = user.sub;
    } else if (!user) {
      guestToken = randomUUID();
    } else if (user.role === UserRole.OWNER && user.sub === owner.id) {
      throw new ForbiddenException('Cannot start a chat with your own store this way');
    } else if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins use moderation endpoints');
    } else {
      guestToken = randomUUID();
    }
    const conv = await this.prisma.conversation.create({
      data: {
        storeUserId: owner.id,
        customerUserId,
        guestToken,
        status: ConversationStatus.OPEN,
      },
    });
    return {
      conversationId: conv.id,
      guestToken: conv.guestToken,
      storeUserId: owner.id,
    };
  }

  async assertCanAccessConversation(
    conversationId: string,
    user?: JwtPayloadUser | null,
    guestToken?: string | null,
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    if (user?.role === UserRole.ADMIN) {
      return conv;
    }
    if (user?.role === UserRole.OWNER && conv.storeUserId === user.sub) {
      return conv;
    }
    if (user?.role === UserRole.CUSTOMER && conv.customerUserId === user.sub) {
      return conv;
    }
    if (guestToken && conv.guestToken === guestToken) {
      return conv;
    }
    throw new ForbiddenException('Not part of this conversation');
  }

  async listMyConversations(user: JwtPayloadUser) {
    if (user.role === UserRole.OWNER) {
      return this.prisma.conversation.findMany({
        where: { storeUserId: user.sub },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          customer: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
      });
    }
    if (user.role === UserRole.CUSTOMER) {
      return this.prisma.conversation.findMany({
        where: { customerUserId: user.sub },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          storeOwner: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              businessSlug: true,
              avatarUrl: true,
            },
          },
        },
      });
    }
    throw new ForbiddenException('No chat inbox for this role');
  }

  async listMessages(
    conversationId: string,
    user: JwtPayloadUser | null | undefined,
    guestToken: string | undefined,
    page: number,
    limit: number,
  ) {
    await this.assertCanAccessConversation(conversationId, user, guestToken);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, fullName: true, avatarUrl: true, role: true },
          },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return { items, total, page, limit };
  }

  async sendMessage(
    conversationId: string,
    body: string,
    user: JwtPayloadUser | null | undefined,
    guestToken?: string | null,
  ) {
    const conv = await this.assertCanAccessConversation(
      conversationId,
      user,
      guestToken,
    );
    let senderType: MessageSenderType;
    let senderUserId: string | null = null;
    if (user?.role === UserRole.OWNER && conv.storeUserId === user.sub) {
      senderType = MessageSenderType.OWNER;
      senderUserId = user.sub;
    } else if (user?.role === UserRole.CUSTOMER && conv.customerUserId === user.sub) {
      senderType = MessageSenderType.CUSTOMER;
      senderUserId = user.sub;
    } else if (guestToken && conv.guestToken === guestToken) {
      senderType = MessageSenderType.GUEST;
      senderUserId = null;
    } else {
      throw new ForbiddenException('Cannot send in this conversation');
    }
    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderType,
        senderUserId,
        body: body.trim(),
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    return msg;
  }

  async archive(conversationId: string, user: JwtPayloadUser) {
    const conv = await this.assertCanAccessConversation(conversationId, user, null);
    if (user.role !== UserRole.OWNER || conv.storeUserId !== user.sub) {
      throw new ForbiddenException('Only the store owner can archive');
    }
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ARCHIVED },
    });
  }
}
