import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Button, CenterScreen, Panel, Spinner } from '../../../shared/ui';
import { RequireAccount } from '../../auth';
import { useSelectedDeck } from '../../decks';
import type { RoomMode } from '../services/roomClient';
import { NEW_ROOM, useRoomStore } from '../store/roomStore';
import { OnlineDuel } from './OnlineDuel';
import { TournamentRoom } from './TournamentRoom';
import { WaitingRoom } from './WaitingRoom';

/** Estado de navegação que pede para entrar na sala com o perfil atual (botões do lobby). */
export interface JoinRequest {
  join?: boolean;
  /** Ao criar: sala privada (não aparece na lista do lobby). */
  private?: boolean;
  /** Ao criar: VS (1x1, padrão) ou torneio. */
  mode?: RoomMode;
}

/**
 * Sala online da URL /sala/:code ("nova" cria uma sala). Exige conta: conecta, volta para o
 * assento da conta e mostra a etapa certa: conectando, aguardando oponente ou o duelo.
 */
export function OnlineRoom() {
  return (
    <RequireAccount reason="Para jogar online e entrar no ranking, entre na sua conta (é rapidinho criar uma).">
      <RoomScreen />
    </RequireAccount>
  );
}

function RoomScreen() {
  const code = useParams().code ?? NEW_ROOM;
  const navigate = useNavigate();
  const request = useLocation().state as JoinRequest | null;
  const join = request?.join ?? false;
  const deck = useSelectedDeck();
  const { status, room, tournament, error, activeCode, open, close, leave } = useRoomStore();

  useEffect(() => {
    const joinAs = { deck: deck.cards, private: request?.private, mode: request?.mode };
    open(code, code === NEW_ROOM || join ? joinAs : undefined);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao sair da página só desconecta: dá para voltar pela conta (F5, botão "voltar para o duelo").
  useEffect(() => close, [close]);

  // Sala criada: troca /sala/nova pelo código definitivo.
  useEffect(() => {
    if (code === NEW_ROOM && activeCode && activeCode !== NEW_ROOM) navigate(`/sala/${activeCode}`, { replace: true });
  }, [code, activeCode, navigate]);

  const exit = () => {
    leave();
    navigate('/');
  };

  // A conta não está nesta sala: é um convite, vai para o lobby escolher o deck.
  if (status === 'needsJoin') return <Navigate to={`/?sala=${code.toUpperCase()}`} replace />;

  if (error && (status === 'error' || (!room && !tournament))) {
    return (
      <CenterScreen>
        <Panel>
          <h2>Ops…</h2>
          <p>{error}</p>
          <Button variant="primary" onClick={exit}>
            Voltar
          </Button>
        </Panel>
      </CenterScreen>
    );
  }
  if (tournament) return <TournamentRoom tournament={tournament} onExit={exit} />;
  if (!room)
    return (
      <CenterScreen>
        <Spinner /> Conectando ao servidor…
      </CenterScreen>
    );
  if (room.status === 'waiting' || !room.view) return <WaitingRoom code={room.code} onCancel={exit} />;
  return <OnlineDuel room={room} view={room.view} onExit={exit} />;
}
