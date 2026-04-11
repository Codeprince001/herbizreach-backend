import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ImproveDescriptionDto } from './dto/improve-description.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(UserRole.OWNER)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('improve-description')
  @ApiOperation({ summary: 'Improve description and generate caption' })
  async improve(@Body() body: ImproveDescriptionDto) {
    return this.aiService.improveDescription(body);
  }
}
