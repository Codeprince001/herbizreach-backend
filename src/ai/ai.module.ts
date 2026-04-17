import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { LocalesModule } from '../locales/locales.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [LocalesModule],
  controllers: [AiController],
  providers: [AiService, RolesGuard],
})
export class AiModule {}
