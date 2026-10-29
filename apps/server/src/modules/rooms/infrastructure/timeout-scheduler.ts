import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { Scheduler } from '../application/ports.js';

/** Agendador com setTimeout (uma tarefa por chave; não segura o processo vivo). */
@Injectable()
export class TimeoutScheduler implements Scheduler, OnModuleDestroy {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  schedule(key: string, at: number, task: () => void) {
    this.cancel(key);
    const t = setTimeout(
      () => {
        this.timers.delete(key);
        task();
      },
      Math.max(0, at - Date.now()),
    );
    t.unref();
    this.timers.set(key, t);
  }

  cancel(key: string) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }

  onModuleDestroy() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }
}
