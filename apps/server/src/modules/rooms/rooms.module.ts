import { Module } from '@nestjs/common';
import { CLOCK, ID_GENERATOR, ROOM_NOTIFIER, ROOM_REPOSITORY, SCHEDULER } from './application/ports.js';
import { RoomsService } from './application/rooms.service.js';
import { CryptoIdGenerator, SystemClock } from './infrastructure/crypto-id.generator.js';
import { InMemoryRoomRepository } from './infrastructure/in-memory-room.repository.js';
import { RoomJanitor } from './infrastructure/room-janitor.js';
import { TimeoutScheduler } from './infrastructure/timeout-scheduler.js';
import { RoomsController } from './presentation/rooms.controller.js';
import { RoomsGateway } from './presentation/rooms.gateway.js';
import { SocketRoomNotifier } from './presentation/socket-room.notifier.js';

@Module({
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomsGateway,
    RoomJanitor,
    SocketRoomNotifier,
    { provide: ROOM_REPOSITORY, useClass: InMemoryRoomRepository },
    { provide: ID_GENERATOR, useClass: CryptoIdGenerator },
    { provide: CLOCK, useClass: SystemClock },
    { provide: SCHEDULER, useClass: TimeoutScheduler },
    { provide: ROOM_NOTIFIER, useExisting: SocketRoomNotifier },
  ],
  exports: [RoomsService],
})
export class RoomsModule {}
