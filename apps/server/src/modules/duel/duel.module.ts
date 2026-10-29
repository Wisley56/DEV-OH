import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module.js';
import { DuelService } from './application/duel.service.js';
import { DuelGateway } from './presentation/duel.gateway.js';

@Module({
  imports: [RoomsModule],
  providers: [DuelService, DuelGateway],
})
export class DuelModule {}
