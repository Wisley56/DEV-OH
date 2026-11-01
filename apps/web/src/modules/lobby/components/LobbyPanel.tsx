import { validateDeck } from '@devoh/engine';
import { isTournamentCode, ROOM_CODE_LENGTH } from '@devoh/protocol';
import { AlertTriangle, Bot, Check, Globe, Play, Plus, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../../shared/ui';
import { loginPath, useAccount } from '../../auth';
import { ImportLocalDecks, useAllDecks } from '../../decks';
import { getActiveRoom, NEW_ROOM, type JoinRequest } from '../../online';
import { useProfile } from '../../profile';
import { DifficultyPicker } from '../../training';
import { HeroShowcase } from './HeroShowcase';
import { OpenRooms } from './OpenRooms';

const JOIN: JoinRequest = { join: true };
const MODES = [
  { value: 'vs', label: 'VS', hint: 'Duelo 1x1' },
  { value: 'torneio', label: 'Torneio', hint: '2 a 10 jogadores' },
] as const;

/**
 * Tela inicial: hero, deck, treino, online e salas abertas. O treino é livre (visitante
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
  const train = () => ready() && navigate('/treino');
  /** Online pede conta: sem login, vai para a tela de entrar e volta para cá. */
  const online = (to: string, state?: JoinRequest) => {
    if (!ready()) return;
    if (account) navigate(to, { state });
    else navigate(loginPath(invite ? `/?sala=${invite}` : '/'));
  };

  return (
    <>
      <HeroShowcase>
        <Button variant="primary" size="lg" onClick={train}>
          <Bot size={18} aria-hidden />
          Treinar contra o Bot
        </Button>
        <a className="btn btn-lg" href="#online">
          <Globe size={18} strokeWidth={1.75} aria-hidden />
          Jogar online
        </a>
      </HeroShowcase>

      <ImportLocalDecks />
      {invite && (
        <p className="invite">
          Você foi convidado para a sala <b>{invite}</b>.{' '}
          {account ? 'Escolha o deck e clique em Entrar.' : 'Entre na sua conta para aceitar o desafio.'}
        </p>
      )}
      {resume && !invite && (
        <Button className="invite" onClick={() => navigate(`/sala/${resume}`)}>
          <Undo2 size={16} aria-hidden />
          Voltar para {isTournamentCode(resume) ? 'o torneio' : 'o duelo na sala'} <b>{resume}</b>
        </Button>
      )}

      <section id="online" className="play-grid" aria-label="Jogar">
        <div className="panel lobby-card">
          <div className="lobby-card-head">
            <h2>Seu deck</h2>
            <Link to="/decks">Editar</Link>
          </div>
          <label className="field-label">
            Deck ativo
            <select value={deck.id} onChange={(e) => setDeckId(e.target.value)}>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.cards.length})
                </option>
              ))}
            </select>
          </label>
          <p className="deck-desc">{deck.description}</p>
          {deckErrors.length > 0 ? (
            <p className="warn deck-status">
              <AlertTriangle size={16} aria-hidden />
              {deckErrors[0]}
            </p>
          ) : (
            <p className="deck-status ok">
              <Check size={16} aria-hidden />
              {deck.cards.length} cards · deck válido
            </p>
          )}
        </div>

        <div className="panel lobby-card">
          <h2>Treino</h2>
          {status === 'guest' && (
            <label className="field-label">
              Seu apelido no treino
              <input value={name} maxLength={20} placeholder="Ex.: Wisley" onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <DifficultyPicker />
          <Button variant="primary" onClick={train}>
            <Play size={16} fill="currentColor" aria-hidden />
            Começar treino
          </Button>
        </div>

        <div className="panel lobby-card">
          <h2>Online</h2>
          <div className="mode-picker" role="radiogroup" aria-label="Modo da sala">
            {MODES.map(({ value, label, hint }) => (
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
          <label className="check-label">
            <input type="checkbox" checked={privateRoom} onChange={(e) => setPrivateRoom(e.target.checked)} />
            {mode === 'torneio' ? 'Torneio privado' : 'Sala privada'} (só por convite, fora da lista)
          </label>
          <Button onClick={() => online(`/sala/${NEW_ROOM}`, { private: privateRoom, mode })}>
            <Plus size={18} aria-hidden />
            {mode === 'torneio' ? 'Criar torneio online' : 'Criar sala online'}
          </Button>
          <div className="join">
            <label className="join-code">
              <span className="sr-only">Código da sala</span>
              <input
                value={code}
                maxLength={ROOM_CODE_LENGTH + 1}
                placeholder="CÓDIGO"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <Button disabled={code.length < 4} onClick={() => online(`/sala/${code}`, JOIN)}>
              Entrar
            </Button>
          </div>
          {!account && status !== 'unknown' && <p className="muted lobby-note">Jogar online pede uma conta (vale para o ranking).</p>}
        </div>
      </section>

      <OpenRooms onJoin={(c) => online(`/sala/${c}`, JOIN)} />
    </>
  );
}
