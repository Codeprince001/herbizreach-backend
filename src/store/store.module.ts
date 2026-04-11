import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { ProductsModule } from '../products/products.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [ProductsModule, LeadsModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
