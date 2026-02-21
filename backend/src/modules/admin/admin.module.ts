// =============================================================================
// AdminModule
// =============================================================================

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RolesModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
