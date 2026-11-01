import type { BalanceConfig, BalanceReport } from '@devoh/ai/balance';
import type { PublishedCustomCard } from '@devoh/engine';

/** Mensagens entre a tela e o worker que roda as partidas. */
/** `custom`: cards do painel que o worker instala antes de jogar (o worker tem o próprio catálogo). */
export type WorkerRequest = { type: 'run'; config: BalanceConfig; custom: readonly PublishedCustomCard[] } | { type: 'cancel' };
export type WorkerResponse =
  { type: 'progress'; done: number; total: number } | { type: 'done'; report: BalanceReport } | { type: 'error'; message: string };

export interface BalanceHandlers {
  progress(done: number, total: number): void;
  done(report: BalanceReport): void;
  error(message: string): void;
}

export interface BalanceHandle {
  /** Para no próximo pedaço e entrega o relatório parcial (em `done`). */
  cancel(): void;
  /** Mata o worker na hora, sem relatório. */
  terminate(): void;
}

/**
 * Roda a simulação num Web Worker: as partidas não travam a tela e o servidor não gasta nada.
 * Um worker por execução; ele é encerrado ao terminar.
 */
export function startBalance(config: BalanceConfig, custom: readonly PublishedCustomCard[], on: BalanceHandlers): BalanceHandle {
  const worker = new Worker(new URL('../worker/balance.worker.ts', import.meta.url), { type: 'module', name: 'balanceamento' });
  const send = (m: WorkerRequest) => worker.postMessage(m);
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const m = e.data;
    if (m.type === 'progress') on.progress(m.done, m.total);
    else {
      worker.terminate();
      if (m.type === 'done') on.done(m.report);
      else on.error(m.message);
    }
  };
  worker.onerror = (e) => {
    worker.terminate();
    on.error(e.message || 'O worker da simulação falhou.');
  };
  send({ type: 'run', config, custom });
  return { cancel: () => send({ type: 'cancel' }), terminate: () => worker.terminate() };
}
