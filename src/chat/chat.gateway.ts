import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';

function convRoom(id: string) {
  return `conv:${id}`;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const origins = this.config.get<string[]>('corsOrigins') ?? ['http://localhost:3000'];
    const origin = client.handshake.headers.origin;
    if (
      origin &&
      origins.length > 0 &&
      !origins.includes(origin)
    ) {
      this.logger.warn(`Socket rejected origin ${origin}`);
      client.disconnect();
    }
  }

  private async resolveUser(client: Socket): Promise<JwtPayloadUser | null> {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (typeof client.handshake.headers.authorization === 'string' &&
      client.handshake.headers.authorization.startsWith('Bearer ')
        ? client.handshake.headers.authorization.slice(7)
        : undefined);
    if (!token) {
      return null;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const full = await this.usersService.findById(payload.sub);
      if (!full || full.disabledAt) {
        return null;
      }
      return { sub: full.id, email: full.email, role: full.role };
    } catch {
      return null;
    }
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; guestToken?: string },
  ) {
    const user = await this.resolveUser(client);
    await this.chatService.assertCanAccessConversation(
      payload.conversationId,
      user,
      payload.guestToken,
    );
    client.data.user = user;
    client.data.guestToken = payload.guestToken;
    await client.join(convRoom(payload.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { conversationId: string; body: string; guestToken?: string },
  ) {
    const user = (client.data.user as JwtPayloadUser | null) ?? (await this.resolveUser(client));
    const guestToken = payload.guestToken ?? client.data.guestToken;
    const msg = await this.chatService.sendMessage(
      payload.conversationId,
      payload.body,
      user,
      guestToken,
    );
    this.server.to(convRoom(payload.conversationId)).emit('message', msg);
    return { ok: true, id: msg.id };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; typing: boolean },
  ) {
    client.to(convRoom(payload.conversationId)).emit('typing', {
      conversationId: payload.conversationId,
      typing: payload.typing,
    });
  }
}
