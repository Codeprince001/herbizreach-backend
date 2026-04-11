import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { StoreSettingsService } from './store-settings.service';

@ApiTags('store-settings')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(UserRole.OWNER)
@Controller('store-settings')
export class StoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get storefront settings for current owner' })
  async get(@CurrentUser() user: JwtPayloadUser) {
    return this.storeSettingsService.getForOwner(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Update storefront settings' })
  async patch(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateStoreSettingsDto) {
    return this.storeSettingsService.updateForOwner(user.sub, dto);
  }
}
