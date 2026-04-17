import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { LocalesModule } from '../locales/locales.module';
import { ProductsModule } from '../products/products.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [ProductsModule, LeadsModule, LocalesModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
