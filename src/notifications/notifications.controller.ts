import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
