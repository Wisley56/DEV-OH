import { Logger } from '@nestjs/common';
import { ipTag } from './client-ip.js';

export type SecurityEvent =
  'rate-limited' | 'origin-refused' | 'conn-limit' | 'room-limit' | 'kicked' | 'login-failed' | 'account-locked' | 'signup-refused';

/** Eventos de abuso no log (nível warn), com o IP só como hash. */
export class SecurityLog {
  private readonly logger = new Logger('Security');

  warn(event: SecurityEvent, ip: string | undefined, detail?: Record<string, unknown>) {
    this.logger.warn({ event, ip: ip ? ipTag(ip) : undefined, ...detail });
  }
}
