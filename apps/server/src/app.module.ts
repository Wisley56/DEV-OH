import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DuelModule } from './modules/duel/duel.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';

@Module({
  imports: [ConfigModule, RoomsModule, DuelModule, HealthModule],
})
export class AppModule {}
