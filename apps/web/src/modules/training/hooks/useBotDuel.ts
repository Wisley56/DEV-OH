import type { BotLevel } from '@devoh/ai';
import { applyAction, getView, type Action } from '@devoh/engine';
import { useEffect, useMemo, useState } from 'react';
import { BOT_DELAY_MS, BOT_SEAT, botStep, newLocalGame, PLAYER_SEAT } from '../services/localGame';

/** Duelo local: estado do jogo, turno do bot (uma jogada por vez) e as jogadas do jogador. */
export function useBotDuel(deck: string[], playerName: string, level: BotLevel) {
  const [state, setState] = useState(() => newLocalGame(deck, playerName, level));
  const view = useMemo(() => getView(state, PLAYER_SEAT), [state]);

  useEffect(() => {
    if (state.winner !== null || state.active !== BOT_SEAT) return;
    const t = setTimeout(() => {
      const next = botStep(state, level);
      if (next) setState(next);
    }, BOT_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, level]);

  const send = (a: Action) => {
    const r = applyAction(state, PLAYER_SEAT, a);
    if (!r.ok) return r.error;
    setState(r.state);
    return null;
  };

  const restart = () => setState(newLocalGame(deck, playerName, level));

  return { view, send, restart };
}
