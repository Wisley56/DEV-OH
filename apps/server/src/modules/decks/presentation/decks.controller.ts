import type { DeckPayload } from '@devoh/protocol';
import { DeckSchema, ImportDecksSchema } from '@devoh/protocol/schemas';
import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { Throttle } from '../../../common/security/throttle.js';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import type { UserRecord } from '../../accounts/application/ports.js';
import { AuthGuard, CurrentUser } from '../../accounts/presentation/auth.guard.js';
import { DecksService } from '../application/decks.service.js';

/** Decks da conta logada. Toda rota exige sessão e só enxerga os decks do dono. */
@Controller('decks')
@UseGuards(AuthGuard)
export class DecksController {
  constructor(@Inject(DecksService) private readonly decks: DecksService) {}

  @Get()
  @Header('cache-control', 'no-store')
  list(@CurrentUser() user: UserRecord): Promise<DeckPayload[]> {
    return this.decks.list(user.id);
  }

  @Put(':id')
  @HttpCode(204)
  @Throttle('decks')
  async save(@CurrentUser() user: UserRecord, @Param('id') id: string, @Body(new ZodValidationPipe(DeckSchema)) deck: DeckPayload) {
    if (deck.id !== id) throw new DomainError('Deck inválido.');
    await this.decks.save(user.id, deck);
  }

  @Delete(':id')
  @HttpCode(204)
  @Throttle('decks')
  async remove(@CurrentUser() user: UserRecord, @Param('id') id: string) {
    await this.decks.remove(user.id, id);
  }

  @Post('import')
  @HttpCode(200)
  @Throttle('decks')
  import(@CurrentUser() user: UserRecord, @Body(new ZodValidationPipe(ImportDecksSchema)) decks: DeckPayload[]) {
    return this.decks.import(user.id, decks);
  }
}
