import type { AccountView } from '@devoh/protocol';
import { Controller, Get, Header } from '@nestjs/common';
import { Throttle } from '../../../common/security/throttle.js';
import { toAccountView } from '../application/accounts.service.js';
import type { UserRecord } from '../application/ports.js';
import { AdminOnly } from './admin.guard.js';
import { CurrentUser } from './auth.guard.js';

/** Base do painel admin. O site esconde o painel de quem não é admin; aqui o servidor confirma. */
@Controller('admin')
@AdminOnly()
export class AdminController {
  /** A conta admin logada: o painel confere o acesso antes de abrir as telas. */
  @Get('me')
  @Header('cache-control', 'no-store')
  @Throttle('admin')
  me(@CurrentUser() user: UserRecord): AccountView {
    return toAccountView(user);
  }
}
