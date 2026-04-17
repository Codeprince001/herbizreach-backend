import { Module } from '@nestjs/common';
import { LocalesBootstrapService } from './locales-bootstrap.service';
import { LocalesController } from './locales.controller';
import { LocalesService } from './locales.service';

@Module({
  controllers: [LocalesController],
  providers: [LocalesService, LocalesBootstrapService],
  exports: [LocalesService],
})
export class LocalesModule {}
