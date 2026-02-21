// =============================================================================
// RolesModule
// =============================================================================

import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
