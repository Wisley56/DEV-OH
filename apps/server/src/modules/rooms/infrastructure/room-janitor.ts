import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config.js';
import { RoomsService } from '../application/rooms.service.js';

/** Limpa salas paradas a cada minuto. */
@Injectable()
export class RoomJanitor implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(RoomsService) private readonly rooms: RoomsService,
    @Inject(AppConfig) private readonly config: AppConfig,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.rooms.sweep(this.config.roomTtlMs, this.config.roomIdleTtlMs), 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }
}
