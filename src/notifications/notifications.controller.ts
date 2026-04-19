import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { FcmService } from './fcm.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly fcmService: FcmService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List your notifications (paginated)' })
  async list(
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.list(user.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread notification count (non-archived)' })
  async unreadCount(@CurrentUser() user: JwtPayloadUser) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @Get('push-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Whether server-side FCM (Firebase Admin) is configured' })
  pushStatus() {
    return { fcmEnabled: this.fcmService.isEnabled() };
  }

  @Post('push-tokens')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Register FCM device token for chat push (store owner)' })
  async registerPushToken(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: RegisterFcmTokenDto,
  ) {
    await this.fcmService.registerToken(user.sub, dto.token);
    return { ok: true as const };
  }

  @Post('push-tokens/unregister')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Remove FCM token (e.g. logout or disable notifications)' })
  async unregisterPushToken(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: RegisterFcmTokenDto,
  ) {
    await this.fcmService.unregisterToken(user.sub, dto.token);
    return { ok: true as const };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all visible (non-archived) notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayloadUser) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a notification (hides from default list)' })
  async archive(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.notificationsService.archive(user.sub, id);
  }

  @Patch(':id/unarchive')
  @ApiOperation({ summary: 'Restore an archived notification' })
  async unarchive(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.notificationsService.unarchive(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a notification' })
  async remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.notificationsService.remove(user.sub, id);
  }
}
