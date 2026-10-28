import { applyAction, botAction, createGame, getView, STARTER_DECKS, type Action, type BotLevel, type GameState } from '@devoh/game';
import { useEffect, useMemo, useState } from 'react';
import { Board } from '../components/Board';

const BOT_NAMES: Record<BotLevel, string[]> = {
  normal: ['Bot Estagiário', 'Bot do Jira', 'IA Alucinada', 'Bot da Daily'],
  hard: ['Dev Sênior Sem IA', 'Arquiteto das Antigas', 'Dev Raiz do Terminal', 'Tech Lead Sem Copilot'],
};

function newGame(deck: string[], playerName: string, level: BotLevel): GameState {
  const botDeck = STARTER_DECKS[Math.floor(Math.random() * STARTER_DECKS.length)];
  const names = BOT_NAMES[level];
  const botName = `${names[Math.floor(Math.random() * names.length)]} (${botDeck.name})`;
  return createGame({ players: [{ name: playerName, deck }, { name: botName, deck: botDeck.cards }] });
}

export function LocalDuel({ deck, playerName, level, onExit }: { deck: string[]; playerName: string; level: BotLevel; onExit: () => void }) {
  const [state, setState] = useState(() => newGame(deck, playerName, level));
  const view = useMemo(() => getView(state, 0), [state]);

  // Turno do bot: uma ação por vez, com pausa para dar para acompanhar.
  useEffect(() => {
    if (state.winner !== null || state.active !== 1) return;
    const t = setTimeout(() => {
      let r = applyAction(state, 1, botAction(state, 1, level));
      if (!r.ok) r = applyAction(state, 1, { type: 'endTurn' });
      if (r.ok) setState(r.state);
    }, 850);
    return () => clearTimeout(t);
  }, [state, level]);

  const send = (a: Action) => {
    const r = applyAction(state, 0, a);
    if (!r.ok) return r.error;
    setState(r.state);
    return null;
  };

  const badge = <span className={`level-chip level-${level}`}>{level === 'hard' ? '🧠 Sem IA · Difícil' : '🤖 Com IA · Normal'}</span>;

  return (
    <Board
      view={view}
      send={send}
      onExit={onExit}
      onRematch={() => setState(newGame(deck, playerName, level))}
      rematchLabel="Jogar de novo"
      badge={badge}
    />
  );
}
