import { createContext, useContext } from 'react';
import { useStore, type StoreApi } from 'zustand';
import type { DuelController } from '../ports';
import type { DuelUiState } from '../store/duelUiStore';

export const DuelContext = createContext<DuelController | null>(null);
export const DuelUiContext = createContext<StoreApi<DuelUiState> | null>(null);

/**
 * Duelo em andamento: controlador, visão e atalhos (eu, oponente, é meu turno). Para quem
 * assiste, "eu" é só o jogador de baixo, e nunca é a vez de quem assiste.
 */
export function useDuel() {
  const ctrl = useContext(DuelContext);
  if (!ctrl) throw new Error('useDuel fora do <DuelBoard>.');
  const { view } = ctrl;
  const me = view.players[view.you];
  const opp = view.players[view.you === 0 ? 1 : 0];
  const spectator = !!view.spectator;
  const myTurn = !spectator && view.active === view.you && view.winner === null;
  return { ctrl, view, me, opp, myTurn, spectator };
}

export function useDuelUi<T>(selector: (s: DuelUiState) => T): T {
  const store = useContext(DuelUiContext);
  if (!store) throw new Error('useDuelUi fora do <DuelBoard>.');
  return useStore(store, selector);
}

export function useDuelUiApi(): StoreApi<DuelUiState> {
  const store = useContext(DuelUiContext);
  if (!store) throw new Error('useDuelUiApi fora do <DuelBoard>.');
  return store;
}
