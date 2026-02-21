import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    // WHY JwtModule.register({}): We pass secrets per-operation (access vs refresh)
    // so we register with empty defaults. This avoids tying the module to one secret.
    JwtModule.register({}),
  ],
  providers: [TokensService],
  exports: [TokensService, JwtModule],
})
export class TokensModule {}
