import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService, RolesGuard],
})
export class AiModule {}
