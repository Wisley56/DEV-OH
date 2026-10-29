import { createStore } from 'zustand';
import type { Mode, Selection } from '../services/interaction';

/** Estado de interface de um tabuleiro: seleção, modo de escolha, erro e histórico. */
export interface DuelUiState {
  sel: Selection | null;
  mode: Mode | null;
  error: string | null;
  /** Celular: histórico aberto no painel de baixo (no desktop ele fica sempre visível). */
  showLog: boolean;
  /** Última entrada do log que o jogador já viu (para o contador de não lidas). */
  seenLogId: number;
  /** Selecionar um card fecha o histórico. */
  select(sel: Selection | null): void;
  /** Entrar num modo de escolha fecha o painel do card, para o campo ficar visível. */
  setMode(mode: Mode | null): void;
  flashError(message: string): void;
  toggleLog(): void;
  markLogSeen(id: number): void;
}

export const createDuelUiStore = (lastLogId: number) =>
  createStore<DuelUiState>((set) => ({
    sel: null,
    mode: null,
    error: null,
    showLog: false,
    seenLogId: lastLogId,
    select: (sel) => set(sel ? { sel, showLog: false } : { sel }),
    setMode: (mode) => set(mode ? { mode, sel: null } : { mode }),
    flashError: (error) => {
      set({ error });
      setTimeout(() => set({ error: null }), 2600);
    },
    toggleLog: () => set((s) => ({ showLog: !s.showLog })),
    markLogSeen: (seenLogId) => set({ seenLogId }),
  }));
