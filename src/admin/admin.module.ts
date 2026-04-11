import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductsModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard, AdminBootstrapService],
})
export class AdminModule {}
