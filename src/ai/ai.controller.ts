import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayloadUser } from '../auth/types/jwt-payload.type';
import { EnhanceProductImageDto } from './dto/enhance-product-image.dto';
import { ImproveDescriptionDto } from './dto/improve-description.dto';
import { LocalizeProductDto } from './dto/localize-product.dto';
import { SuggestInboxRepliesDto } from './dto/suggest-inbox-replies.dto';
import { SuggestSkuDto } from './dto/suggest-sku.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(UserRole.OWNER)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('enhance-product-image')
  @ApiOperation({
    summary:
      'AI-enhance one product photo (lighting, clarity, cleaner background) and replace that image URL',
  })
  async enhanceProductImage(
    @CurrentUser() user: JwtPayloadUser,
    @Body() body: EnhanceProductImageDto,
  ) {
    return this.aiService.enhanceProductImage(user.sub, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('localize-product')
  @ApiOperation({
    summary: 'Suggest product name + description in a secondary language (review then save via products API)',
  })
  async localizeProduct(@CurrentUser() user: JwtPayloadUser, @Body() body: LocalizeProductDto) {
    return this.aiService.localizeProduct(user.sub, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('improve-description')
  @ApiOperation({ summary: 'Improve description and generate caption' })
  async improve(@Body() body: ImproveDescriptionDto) {
    return this.aiService.improveDescription(body);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('suggest-sku')
  @ApiOperation({ summary: 'Suggest an inventory SKU from name and optional description' })
  async suggestSku(@Body() body: SuggestSkuDto) {
    return this.aiService.suggestSku(body);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('suggest-inbox-replies')
  @ApiOperation({
    summary: 'Suggest 2–3 short reply drafts for the store inbox (last buyer message + product context)',
  })
  async suggestInboxReplies(
    @CurrentUser() user: JwtPayloadUser,
    @Body() body: SuggestInboxRepliesDto,
  ) {
    return this.aiService.suggestInboxReplies(body.conversationId, user.sub);
  }
}
