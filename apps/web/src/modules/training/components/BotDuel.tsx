import { validateDeck } from '@devoh/engine';
import { Navigate, useNavigate } from 'react-router';
import { useSelectedDeck } from '../../decks';
import { DuelBoard } from '../../duel';
import { nickOf, useProfile } from '../../profile';
import { DUEL_TOUR, TourOverlay, useTour } from '../../tutorial';
import { useBotDuel } from '../hooks/useBotDuel';
import { LEVEL_LABEL } from '../services/localGame';
import type { BotLevel } from '@devoh/ai';

/** Treino contra o bot com o apelido, o deck e a dificuldade do perfil. */
export function BotDuel() {
  const name = useProfile((s) => s.name);
  const level = useProfile((s) => s.botLevel);
  const deck = useSelectedDeck();
  // Deck inválido (ex.: editado em outra aba): volta para o lobby escolher outro.
  if (validateDeck(deck.cards).length) return <Navigate to="/" replace />;
  return <BotDuelBoard deck={deck.cards} playerName={nickOf(name)} level={level} />;
}

function BotDuelBoard({ deck, playerName, level }: { deck: string[]; playerName: string; level: BotLevel }) {
  const navigate = useNavigate();
  const { view, send, restart, setFxBusy } = useBotDuel(deck, playerName, level);
  const tour = useTour();
  return (
    <>
      <DuelBoard
        controller={{
          view,
          send,
          exit: () => navigate('/'),
          rematch: restart,
          rematchLabel: 'Jogar de novo',
          onFxBusyChange: setFxBusy,
          onHelp: tour.show,
          badge: <span className={`level-chip level-${level}`}>{LEVEL_LABEL[level]}</span>,
        }}
      />
      {tour.open && <TourOverlay steps={DUEL_TOUR} onClose={tour.close} />}
    </>
  );
}
