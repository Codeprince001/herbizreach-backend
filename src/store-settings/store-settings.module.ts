import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { StoreSettingsController } from './store-settings.controller';
import { StoreSettingsService } from './store-settings.service';

@Module({
  controllers: [StoreSettingsController],
  providers: [StoreSettingsService, RolesGuard],
  exports: [StoreSettingsService],
})
export class StoreSettingsModule {}
