// =============================================================================
// PrismaModule — Global Database Module
// =============================================================================
// WHY Global: Every module needs database access. Making PrismaModule global
// avoids importing it in every feature module — cleaner dependency graph.
// =============================================================================

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
