import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { LocalesService } from './locales.service';

@ApiTags('locales')
@Controller('locales')
export class LocalesController {
  constructor(private readonly localesService: LocalesService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Locales enabled by admins for storefronts and translations' })
  async active() {
    const items = await this.localesService.getActiveLocalesPublic();
    return { items };
  }
}
