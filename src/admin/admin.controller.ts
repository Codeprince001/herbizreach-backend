import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { AdminService } from './admin.service';
import { AdminUpdateProductDto } from './dto/admin-update-product.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  async listUsers(
    @Query() pag: PaginationQueryDto,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    const page = pag.page ?? 1;
    const limit = pag.limit ?? 20;
    return this.adminService.listUsers(page, limit, role, search);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail' })
  async getUser(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (role, disable)' })
  async updateUser(
    @CurrentUser() actor: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.adminService.updateUser(actor.sub, id, dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products' })
  async listProducts(
    @Query() pag: PaginationQueryDto,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    const page = pag.page ?? 1;
    const limit = pag.limit ?? 20;
    return this.adminService.listProducts(page, limit, userId, search);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product detail' })
  async getProduct(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminService.getProduct(id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Moderate product' })
  async updateProduct(
    @CurrentUser() actor: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AdminUpdateProductDto,
  ) {
    return this.adminService.updateProduct(actor.sub, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  async deleteProduct(
    @CurrentUser() actor: JwtPayloadUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.adminService.deleteProduct(actor.sub, id);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Platform-wide metrics' })
  async metrics() {
    return this.adminService.metrics();
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations (moderation)' })
  async listConversations(@Query() pag: PaginationQueryDto) {
    const page = pag.page ?? 1;
    const limit = pag.limit ?? 20;
    return this.adminService.listConversations(page, limit);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages in a conversation' })
  async conversationMessages(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() pag: PaginationQueryDto,
  ) {
    const page = pag.page ?? 1;
    const limit = pag.limit ?? 50;
    return this.adminService.conversationMessages(id, page, limit);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Admin audit trail' })
  async auditLogs(
    @Query() pag: PaginationQueryDto,
    @Query('actorUserId') actorUserId?: string,
    @Query('entityType') entityType?: string,
  ) {
    const page = pag.page ?? 1;
    const limit = pag.limit ?? 50;
    return this.adminService.listAuditLogs(page, limit, actorUserId, entityType);
  }
}
