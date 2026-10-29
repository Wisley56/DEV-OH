import { Module } from '@nestjs/common';
import { CLOCK, ID_GENERATOR, ROOM_NOTIFIER, ROOM_REPOSITORY } from './application/ports.js';
import { RoomsService } from './application/rooms.service.js';
import { CryptoIdGenerator, SystemClock } from './infrastructure/crypto-id.generator.js';
import { InMemoryRoomRepository } from './infrastructure/in-memory-room.repository.js';
import { RoomJanitor } from './infrastructure/room-janitor.js';
import { RoomsGateway } from './presentation/rooms.gateway.js';
import { SocketRoomNotifier } from './presentation/socket-room.notifier.js';

@Module({
  providers: [
    RoomsService,
    RoomsGateway,
    RoomJanitor,
    SocketRoomNotifier,
    { provide: ROOM_REPOSITORY, useClass: InMemoryRoomRepository },
    { provide: ID_GENERATOR, useClass: CryptoIdGenerator },
    { provide: CLOCK, useClass: SystemClock },
    { provide: ROOM_NOTIFIER, useExisting: SocketRoomNotifier },
  ],
  exports: [RoomsService],
})
export class RoomsModule {}
