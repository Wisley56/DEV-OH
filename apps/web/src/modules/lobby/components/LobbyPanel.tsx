import { validateDeck } from '@devoh/engine';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Panel } from '../../../shared/ui';
import { useAllDecks } from '../../decks';
import { getSession, NEW_ROOM, type JoinRequest } from '../../online';
import { useProfile } from '../../profile';
import { DifficultyPicker } from '../../training';

const JOIN: JoinRequest = { join: true };

/** Lobby: apelido, deck, dificuldade e os caminhos para jogar (bot, criar sala, entrar, voltar ao duelo). */
export function LobbyPanel() {
  const navigate = useNavigate();
  const invite = useSearchParams()[0].get('sala')?.toUpperCase() ?? '';
  const profile = useProfile();
  const decks = useAllDecks();
  const [name, setName] = useState(profile.name);
  const [deckId, setDeckId] = useState(() => (decks.some((d) => d.id === profile.deckId) ? profile.deckId : decks[0].id));
  const [code, setCode] = useState(invite);
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const deckErrors = validateDeck(deck.cards);
  const resume = getSession();

  /** Salva apelido e deck; só segue se o deck for válido. */
  const ready = () => {
    profile.setName(name.trim());
    profile.setDeckId(deck.id);
    return deckErrors.length === 0;
  };

  return (
    <Panel className="lobby">
      {invite && (
        <p className="invite">
          Você foi convidado para a sala <b>{invite}</b>. Escolha apelido e deck e clique em Entrar.
        </p>
      )}
      {resume && !invite && (
        <Button className="invite" onClick={() => navigate(`/sala/${resume.code}`, { state: JOIN })}>
          ↩ Voltar para o duelo na sala <b>{resume.code}</b>
        </Button>
      )}
      <label className="field-label">
        Seu apelido
        <input value={name} maxLength={20} placeholder="Ex.: Wisley" onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field-label">
        Deck
        <select value={deck.id} onChange={(e) => setDeckId(e.target.value)}>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.cards.length})
            </option>
          ))}
        </select>
      </label>
      <p className="deck-desc">{deck.description}</p>
      {deckErrors.length > 0 && <p className="warn">{deckErrors[0]}</p>}

      <DifficultyPicker />

      <div className="lobby-actions">
        <Button variant="primary" size="lg" onClick={() => ready() && navigate('/treino')}>
          🤖 Treinar contra o Bot
        </Button>
        <Button size="lg" onClick={() => ready() && navigate(`/sala/${NEW_ROOM}`)}>
          🌐 Criar sala online
        </Button>
        <div className="join">
          <input value={code} maxLength={5} placeholder="CÓDIGO" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Button disabled={code.length < 4} onClick={() => ready() && navigate(`/sala/${code}`, { state: JOIN })}>
            Entrar
          </Button>
        </div>
      </div>

      <div className="lobby-links">
        <Button variant="ghost" onClick={() => navigate('/colecao')}>
          📖 Coleção de cards
        </Button>
        <Button variant="ghost" onClick={() => navigate('/decks')}>
          🛠 Montar deck
        </Button>
      </div>
    </Panel>
  );
}
