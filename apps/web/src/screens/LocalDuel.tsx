import { applyAction, botAction, createGame, getView, STARTER_DECKS, type Action, type GameState } from '@devoh/game';
import { useEffect, useMemo, useState } from 'react';
import { Board } from '../components/Board';

const BOT_NAMES = ['Bot Estagiário', 'Bot do Jira', 'IA Alucinada', 'Bot da Daily'];

function newGame(deck: string[], playerName: string): GameState {
  const botDeck = STARTER_DECKS[Math.floor(Math.random() * STARTER_DECKS.length)];
  const botName = `${BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]} (${botDeck.name})`;
  return createGame({ players: [{ name: playerName, deck }, { name: botName, deck: botDeck.cards }] });
}

export function LocalDuel({ deck, playerName, onExit }: { deck: string[]; playerName: string; onExit: () => void }) {
  const [state, setState] = useState(() => newGame(deck, playerName));
  const view = useMemo(() => getView(state, 0), [state]);

  // Turno do bot: uma ação por vez, com pausa para dar para acompanhar.
  useEffect(() => {
    if (state.winner !== null || state.active !== 1) return;
    const t = setTimeout(() => {
      let r = applyAction(state, 1, botAction(state, 1));
      if (!r.ok) r = applyAction(state, 1, { type: 'endTurn' });
      if (r.ok) setState(r.state);
    }, 850);
    return () => clearTimeout(t);
  }, [state]);

  const send = (a: Action) => {
    const r = applyAction(state, 0, a);
    if (!r.ok) return r.error;
    setState(r.state);
    return null;
  };

  return <Board view={view} send={send} onExit={onExit} onRematch={() => setState(newGame(deck, playerName))} rematchLabel="Jogar de novo" />;
}
