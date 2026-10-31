import { Global, Inject, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OriginGuard } from './origin.guard.js';
import { ConnectionCounter, RateLimiter } from './rate-limiter.js';
import { SecurityLog } from './security-log.js';
import { ThrottleGuard } from './throttle.js';

/** Esquece baldes ociosos a cada minuto, para a memória não crescer. */
@Injectable()
class RateLimiterSweeper implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(@Inject(RateLimiter) private readonly limiter: RateLimiter) {}

  onModuleInit() {
    this.timer = setInterval(() => this.limiter.sweep(), 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }
}

@Global()
@Module({
  providers: [
    { provide: RateLimiter, useFactory: () => new RateLimiter() },
    ConnectionCounter,
    SecurityLog,
    ThrottleGuard,
    RateLimiterSweeper,
    // Todo pedido HTTP que altera dados passa pela checagem de origem (CSRF).
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
  exports: [RateLimiter, ConnectionCounter, SecurityLog, ThrottleGuard],
})
export class SecurityModule {}
