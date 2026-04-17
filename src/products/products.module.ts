import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { LocalesModule } from '../locales/locales.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [LocalesModule],
  controllers: [ProductsController],
  providers: [ProductsService, RolesGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
