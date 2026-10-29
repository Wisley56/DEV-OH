import { createStore } from 'zustand';
import type { CardIntent, Mode, Selection } from '../services/interaction';

export type IgnitionIntent = Extract<CardIntent, { kind: 'ignition' }>;

/** Card da mão solto numa zona livre: falta escolher Ataque ou Defesa. */
export interface DropChoice {
  iid: string;
  cardId: string;
  zone: number;
  x: number;
  y: number;
}

/** Estado de interface de um tabuleiro: seleção, modo de escolha, erro e histórico. */
export interface DuelUiState {
  sel: Selection | null;
  mode: Mode | null;
  error: string | null;
  /** Celular: histórico aberto no painel de baixo (no desktop ele fica sempre visível). */
  showLog: boolean;
  /** Última entrada do log que o jogador já viu (para o contador de não lidas). */
  seenLogId: number;
  /** Habilidade esperando confirmação (o jogador vê o texto antes de usar). */
  confirm: IgnitionIntent | null;
  dropChoice: DropChoice | null;
  /** Animações do tabuleiro tocando (o diálogo de fim e o bot esperam). */
  fxBusy: boolean;
  /** Selecionar um card fecha o histórico. */
  select(sel: Selection | null): void;
  /** Entrar num modo de escolha fecha o painel do card, para o campo ficar visível. */
  setMode(mode: Mode | null): void;
  flashError(message: string): void;
  toggleLog(): void;
  markLogSeen(id: number): void;
  setFxBusy(busy: boolean): void;
  setConfirm(intent: IgnitionIntent | null): void;
  setDropChoice(choice: DropChoice | null): void;
}

export const createDuelUiStore = (lastLogId: number) =>
  createStore<DuelUiState>((set) => ({
    sel: null,
    mode: null,
    error: null,
    showLog: false,
    seenLogId: lastLogId,
    fxBusy: false,
    confirm: null,
    dropChoice: null,
    select: (sel) => set(sel ? { sel, showLog: false, confirm: null } : { sel, confirm: null }),
    setMode: (mode) => set(mode ? { mode, sel: null, confirm: null, dropChoice: null } : { mode }),
    flashError: (error) => {
      set({ error });
      setTimeout(() => set({ error: null }), 2600);
    },
    toggleLog: () => set((s) => ({ showLog: !s.showLog })),
    markLogSeen: (seenLogId) => set({ seenLogId }),
    setFxBusy: (fxBusy) => set({ fxBusy }),
    setConfirm: (confirm) => set({ confirm }),
    setDropChoice: (dropChoice) => set({ dropChoice }),
  }));
