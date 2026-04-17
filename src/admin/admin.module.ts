import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { LocalesModule } from '../locales/locales.module';
import { ProductsModule } from '../products/products.module';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductsModule, LocalesModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard, AdminBootstrapService],
})
export class AdminModule {}
