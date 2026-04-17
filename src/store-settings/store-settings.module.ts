import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { LocalesModule } from '../locales/locales.module';
import { StoreSettingsController } from './store-settings.controller';
import { StoreSettingsService } from './store-settings.service';

@Module({
  imports: [LocalesModule],
  controllers: [StoreSettingsController],
  providers: [StoreSettingsService, RolesGuard],
  exports: [StoreSettingsService],
})
export class StoreSettingsModule {}
