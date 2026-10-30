import { Module } from '@nestjs/common';
import { DECK_REPOSITORY, DecksService } from './application/decks.service.js';
import { DrizzleDeckRepository } from './infrastructure/drizzle-deck.repository.js';
import { DecksController } from './presentation/decks.controller.js';

@Module({
  controllers: [DecksController],
  providers: [DecksService, { provide: DECK_REPOSITORY, useClass: DrizzleDeckRepository }],
})
export class DecksModule {}
