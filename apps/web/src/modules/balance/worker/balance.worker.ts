import { createBalanceRun, type BalanceConfig } from '@devoh/ai/balance';
import { installCustomCards, type PublishedCustomCard } from '@devoh/engine';
import type { WorkerRequest, WorkerResponse } from '../services/balanceClient';

/**
 * Worker do painel de balanceamento: joga as partidas em pedaços de ~100 ms e
 * devolve o controle entre eles, para receber o "cancelar" e mandar o progresso.
 */
// O tsconfig do web usa a lib DOM (não dá para somar a "webworker"): só o que o worker usa.
const scope = self as unknown as {
  postMessage(m: WorkerResponse): void;
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
};
const SLICE_MS = 100;
let cancelled = false;

const post = (m: WorkerResponse) => scope.postMessage(m);
const yieldToEvents = () => new Promise((r) => setTimeout(r, 0));

async function run(config: BalanceConfig, custom: readonly PublishedCustomCard[]) {
  cancelled = false;
  const { rejected } = installCustomCards(custom);
  if (rejected.length) throw new Error(`Card inválido para simular: ${rejected.map((r) => r.reason).join(' ')}`);
  const sim = createBalanceRun(config);
  post({ type: 'progress', done: 0, total: sim.total });
  let more = sim.total > 0;
  while (more) {
    const t = performance.now();
    while (more && performance.now() - t < SLICE_MS) more = sim.step();
    post({ type: 'progress', done: sim.done, total: sim.total });
    await yieldToEvents();
    if (cancelled) break;
  }
  post({ type: 'done', report: sim.report(cancelled) });
}

scope.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const m = e.data;
  if (m.type === 'cancel') cancelled = true;
  else run(m.config, m.custom).catch((err: unknown) => post({ type: 'error', message: err instanceof Error ? err.message : String(err) }));
};
