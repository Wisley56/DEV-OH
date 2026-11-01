import { DEFAULT_CONFIG, type BalanceConfig, type BalanceReport } from '@devoh/ai/balance';
import { create } from 'zustand';
import { startBalance, type BalanceHandle } from '../services/balanceClient';
import { parseReport } from '../services/reportIO';

type Status = 'idle' | 'running' | 'cancelling';

interface BalanceState {
  config: BalanceConfig;
  status: Status;
  progress: { done: number; total: number; startedAt: number };
  report: BalanceReport | null;
  /** Relatório importado para comparar (antes × depois de um buff/nerf). */
  baseline: BalanceReport | null;
  error: string | null;
  setConfig(patch: Partial<BalanceConfig>): void;
  run(): void;
  cancel(): void;
  /** Abre um relatório exportado como o atual (`as: 'report'`) ou como comparação. */
  importFile(text: string, as: 'report' | 'baseline'): void;
  useAsBaseline(): void;
  clearBaseline(): void;
}

let handle: BalanceHandle | null = null;

/** Estado do painel de balanceamento. A simulação roda no worker; aqui só chegam progresso e relatório. */
export const useBalance = create<BalanceState>((set, get) => ({
  config: DEFAULT_CONFIG,
  status: 'idle',
  progress: { done: 0, total: 0, startedAt: 0 },
  report: null,
  baseline: null,
  error: null,
  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  run() {
    if (get().status !== 'idle') return;
    set({ status: 'running', error: null, progress: { done: 0, total: 0, startedAt: Date.now() } });
    handle = startBalance(get().config, {
      progress: (done, total) => set((s) => ({ progress: { ...s.progress, done, total } })),
      done: (report) => {
        handle = null;
        set({ status: 'idle', report });
      },
      error: (message) => {
        handle = null;
        set({ status: 'idle', error: message });
      },
    });
  },
  cancel() {
    if (get().status !== 'running') return;
    set({ status: 'cancelling' });
    handle?.cancel();
  },
  importFile(text, as) {
    try {
      const r = parseReport(text);
      set(as === 'report' ? { report: r, error: null } : { baseline: r, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  useAsBaseline: () => set((s) => ({ baseline: s.report })),
  clearBaseline: () => set({ baseline: null }),
}));

/** Ao sair da página no meio de uma simulação, o worker é encerrado. */
export function stopBalanceWorker() {
  handle?.terminate();
  handle = null;
  useBalance.setState({ status: 'idle' });
}
