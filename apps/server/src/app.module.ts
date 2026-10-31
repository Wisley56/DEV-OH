import { Module } from '@nestjs/common';
import { SecurityModule } from './common/security/security.module.js';
import { ConfigModule } from './config/config.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { DbModule } from './modules/db/db.module.js';
import { DecksModule } from './modules/decks/decks.module.js';
import { DuelModule } from './modules/duel/duel.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RankingModule } from './modules/ranking/ranking.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';

@Module({
  imports: [ConfigModule, DbModule, SecurityModule, AccountsModule, RankingModule, DecksModule, RoomsModule, DuelModule, HealthModule],
})
export class AppModule {}
