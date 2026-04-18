import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { LocalesModule } from '../locales/locales.module';
import { ProductsModule } from '../products/products.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [LocalesModule, ProductsModule],
  controllers: [AiController],
  providers: [AiService, RolesGuard],
})
export class AiModule {}
