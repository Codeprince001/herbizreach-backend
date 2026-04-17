import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeadsService } from '../leads/leads.service';
import { Public } from '../common/decorators/public.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LogShareDto } from './dto/log-share.dto';
import { LogViewDto } from './dto/log-view.dto';
import { StoreService } from './store.service';

@ApiTags('store')
@Controller('store')
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly leadsService: LeadsService,
  ) {}

  /** Declared before `:slug` so paths like `/store/acme/products/uuid` match correctly. */
  @Public()
  @Get(':slug/products/:productId')
  @ApiOperation({ summary: 'Public single product on a store' })
  async getProduct(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
    @Query('locale') locale?: string,
  ) {
    return this.storeService.getPublicProduct(slug, productId, locale);
  }

  @Public()
  @Post(':slug/leads')
  @ApiOperation({ summary: 'Submit a lead / contact request to the store' })
  async createLead(@Param('slug') slug: string, @Body() body: CreateLeadDto) {
    return this.leadsService.createForStoreSlug(slug, body);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public business page payload' })
  async getStore(@Param('slug') slug: string, @Query('locale') locale?: string) {
    return this.storeService.getPublicStoreBySlug(slug, locale);
  }

  @Public()
  @Post(':slug/view')
  @ApiOperation({ summary: 'Record a page or product view' })
  async logView(@Param('slug') slug: string, @Body() body: LogViewDto) {
    return this.storeService.logView(slug, body);
  }

  @Public()
  @Post(':slug/share')
  @ApiOperation({ summary: 'Record a share action (e.g. WhatsApp tap)' })
  async logShare(@Param('slug') slug: string, @Body() body: LogShareDto) {
    return this.storeService.logShare(slug, body);
  }
}
