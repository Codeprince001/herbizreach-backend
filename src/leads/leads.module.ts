import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, RolesGuard],
  exports: [LeadsService],
})
export class LeadsModule {}
