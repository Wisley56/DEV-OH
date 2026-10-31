import { validateDeck } from '@devoh/engine';
import { isTournamentCode, ROOM_CODE_LENGTH } from '@devoh/protocol';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Panel } from '../../../shared/ui';
import { AccountBar, loginPath, useAccount } from '../../auth';
import { ImportLocalDecks, useAllDecks } from '../../decks';
import { getActiveRoom, NEW_ROOM, type JoinRequest } from '../../online';
import { useProfile } from '../../profile';
import { DifficultyPicker } from '../../training';
import { OpenRooms } from './OpenRooms';

const JOIN: JoinRequest = { join: true };

/**
 * Lobby: conta, deck, dificuldade e os caminhos para jogar. O treino é livre (visitante
 * escolhe um apelido); criar ou entrar em sala online pede conta.
 */
export function LobbyPanel() {
  const navigate = useNavigate();
  const invite = useSearchParams()[0].get('sala')?.toUpperCase() ?? '';
  const { status, account } = useAccount();
  const profile = useProfile();
  const decks = useAllDecks();
  const [name, setName] = useState(profile.name);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [code, setCode] = useState(invite);
  const [privateRoom, setPrivateRoom] = useState(false);
  const [mode, setMode] = useState<'vs' | 'torneio'>('vs');
  // Os decks da conta chegam depois do login: até a pessoa escolher, vale o do perfil.
  const chosen = deckId ?? profile.deckId;
  const deck = decks.find((d) => d.id === chosen) ?? decks[0];
  const deckErrors = validateDeck(deck.cards);
  const resume = account ? getActiveRoom() : null;

  /** Salva apelido e deck; só segue se o deck for válido. */
  const ready = () => {
    if (!account) profile.setName(name.trim());
    profile.setDeckId(deck.id);
    return deckErrors.length === 0;
  };
  /** Online pede conta: sem login, vai para a tela de entrar e volta para cá. */
  const online = (to: string, state?: JoinRequest) => {
    if (!ready()) return;
    if (account) navigate(to, { state });
    else navigate(loginPath(invite ? `/?sala=${invite}` : '/'));
  };

  return (
    <Panel className="lobby">
      <AccountBar />
      <ImportLocalDecks />
      {invite && (
        <p className="invite">
          Você foi convidado para a sala <b>{invite}</b>.{' '}
          {account ? 'Escolha o deck e clique em Entrar.' : 'Entre na sua conta para aceitar o desafio.'}
        </p>
      )}
      {resume && !invite && (
        <Button className="invite" onClick={() => navigate(`/sala/${resume}`)}>
          ↩ Voltar para {isTournamentCode(resume) ? 'o torneio' : 'o duelo na sala'} <b>{resume}</b>
        </Button>
      )}
      {status === 'guest' && (
        <label className="field-label">
          Seu apelido no treino
          <input value={name} maxLength={20} placeholder="Ex.: Wisley" onChange={(e) => setName(e.target.value)} />
        </label>
      )}
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
        <div className="mode-picker" role="radiogroup" aria-label="Modo da sala">
          {(
            [
              ['vs', '⚔ VS', 'Duelo 1x1'],
              ['torneio', '🏆 Torneio', '2 a 10 jogadores'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              className={`mode-option ${mode === value ? 'active' : ''}`}
              onClick={() => setMode(value)}
            >
              <b>{label}</b>
              <span>{hint}</span>
            </button>
          ))}
        </div>
        <Button size="lg" onClick={() => online(`/sala/${NEW_ROOM}`, { private: privateRoom, mode })}>
          {mode === 'torneio' ? '🏆 Criar torneio online' : '🌐 Criar sala online'}
        </Button>
        <label className="check-label">
          <input type="checkbox" checked={privateRoom} onChange={(e) => setPrivateRoom(e.target.checked)} />
          {mode === 'torneio' ? 'Torneio privado' : 'Sala privada'} (só por convite, fora da lista)
        </label>
        <div className="join">
          <input
            value={code}
            maxLength={ROOM_CODE_LENGTH + 1}
            placeholder="CÓDIGO"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button disabled={code.length < 4} onClick={() => online(`/sala/${code}`, JOIN)}>
            Entrar
          </Button>
        </div>
        {!account && status !== 'unknown' && <p className="muted lobby-note">Jogar online pede uma conta (vale para o ranking).</p>}
        <OpenRooms onJoin={(c) => online(`/sala/${c}`, JOIN)} />
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
