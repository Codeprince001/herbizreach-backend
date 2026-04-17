import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { productImageMulterOptions } from '../products/multer-options.factory';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { UpsertStoreTranslationDto } from './dto/upsert-store-translation.dto';
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

  @Patch('profile-image')
  @ApiOperation({ summary: 'Upload store profile picture (social preview)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('image', productImageMulterOptions(1)))
  async patchProfileImage(
    @CurrentUser() user: JwtPayloadUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storeSettingsService.setProfileImageFromUpload(user.sub, file);
  }

  @Delete('profile-image')
  @ApiOperation({ summary: 'Remove store profile picture' })
  async deleteProfileImage(@CurrentUser() user: JwtPayloadUser) {
    return this.storeSettingsService.clearProfileImage(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Update storefront settings' })
  async patch(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateStoreSettingsDto) {
    return this.storeSettingsService.updateForOwner(user.sub, dto);
  }

  @Put('translations/:localeCode')
  @ApiOperation({ summary: 'Create or update tagline/description for a secondary language' })
  async putTranslation(
    @CurrentUser() user: JwtPayloadUser,
    @Param('localeCode') localeCode: string,
    @Body() dto: UpsertStoreTranslationDto,
  ) {
    return this.storeSettingsService.upsertTranslationForOwner(user.sub, localeCode, dto);
  }

  @Delete('translations/:localeCode')
  @ApiOperation({ summary: 'Remove translated store copy for a language' })
  async deleteTranslation(
    @CurrentUser() user: JwtPayloadUser,
    @Param('localeCode') localeCode: string,
  ) {
    return this.storeSettingsService.deleteTranslationForOwner(user.sub, localeCode);
  }
}
