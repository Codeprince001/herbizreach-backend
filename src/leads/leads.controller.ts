import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(UserRole.OWNER)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads submitted to your store' })
  async list(@CurrentUser() user: JwtPayloadUser) {
    return this.leadsService.listForOwner(user.sub);
  }
}
