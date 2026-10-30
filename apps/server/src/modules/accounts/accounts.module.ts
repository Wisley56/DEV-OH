import { Global, Module } from '@nestjs/common';
import { CLOCK } from '../rooms/application/ports.js';
import { SystemClock } from '../rooms/infrastructure/crypto-id.generator.js';
import { AccountsService } from './application/accounts.service.js';
import { ACCOUNT_REPOSITORY, HUMAN_VERIFIER, PASSWORD_HASHER } from './application/ports.js';
import { Argon2Hasher } from './infrastructure/argon2.hasher.js';
import { DrizzleAccountRepository } from './infrastructure/drizzle-account.repository.js';
import { TurnstileVerifier } from './infrastructure/turnstile.verifier.js';
import { AuthController } from './presentation/auth.controller.js';
import { AuthGuard } from './presentation/auth.guard.js';
import { SessionCookie } from './presentation/session-cookie.js';

/** Contas: global porque decks, ranking e salas dependem da sessão (AuthGuard, SessionCookie). */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AccountsService,
    AuthGuard,
    SessionCookie,
    { provide: ACCOUNT_REPOSITORY, useClass: DrizzleAccountRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2Hasher },
    { provide: HUMAN_VERIFIER, useClass: TurnstileVerifier },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [AccountsService, AuthGuard, SessionCookie],
})
export class AccountsModule {}
