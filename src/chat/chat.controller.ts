import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  private async optionalUser(req: Request): Promise<JwtPayloadUser | null> {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) {
      return null;
    }
    try {
      const token = h.slice(7);
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

  @Public()
  @Post('conversations/start')
  @ApiOperation({ summary: 'Start conversation (guest or optional Bearer for customer)' })
  async start(@Body() dto: StartConversationDto, @Req() req: Request) {
    const user = await this.optionalUser(req);
    return this.chatService.startConversation(dto.storeSlug, user, dto.productId);
  }

  @Get('conversations')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List conversations for owner or customer' })
  async list(@CurrentUser() user: JwtPayloadUser) {
    return this.chatService.listMyConversations(user);
  }

  @Public()
  @Get('conversations/:id/messages')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'guestToken', required: false })
  async messages(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('page') pageRaw: string | undefined,
    @Query('limit') limitRaw: string | undefined,
    @Query('guestToken') guestToken: string | undefined,
    @Req() req: Request,
  ) {
    const user = await this.optionalUser(req);
    const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw ?? '50', 10) || 50));
    return this.chatService.listMessages(id, user, guestToken, page, limit);
  }

  @Public()
  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send message (JWT or guestToken in body)' })
  async send(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    const user = await this.optionalUser(req);
    return this.chatService.sendMessage(id, dto.body, user, dto.guestToken);
  }

  @Patch('conversations/:id/archive')
  @ApiBearerAuth('JWT')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Archive conversation (store owner)' })
  async archive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.chatService.archive(id, user);
  }
}
