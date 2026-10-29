import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Button, CenterScreen, Panel, Spinner } from '../../../shared/ui';
import { useSelectedDeck } from '../../decks';
import { nickOf, useProfile } from '../../profile';
import { NEW_ROOM, useRoomStore } from '../store/roomStore';
import { OnlineDuel } from './OnlineDuel';
import { WaitingRoom } from './WaitingRoom';

/** Estado de navegação que pede para entrar na sala com o perfil atual (botões do lobby). */
export interface JoinRequest {
  join?: boolean;
}

/**
 * Sala online da URL /sala/:code ("nova" cria uma sala). Conecta, reconecta pelo
 * token da aba e mostra a etapa certa: conectando, aguardando oponente ou o duelo.
 */
export function OnlineRoom() {
  const code = useParams().code ?? NEW_ROOM;
  const navigate = useNavigate();
  const join = (useLocation().state as JoinRequest | null)?.join ?? false;
  const name = useProfile((s) => s.name);
  const deck = useSelectedDeck();
  const { status, room, error, activeCode, open, close, leave } = useRoomStore();

  useEffect(() => {
    const joinAs = { name: nickOf(name), deck: deck.cards };
    open(code, code === NEW_ROOM || join ? joinAs : undefined);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao sair da página só desconecta: dá para voltar pelo token (F5, botão "voltar para o duelo").
  useEffect(() => close, [close]);

  // Sala criada: troca /sala/nova pelo código definitivo.
  useEffect(() => {
    if (code === NEW_ROOM && activeCode && activeCode !== NEW_ROOM) navigate(`/sala/${activeCode}`, { replace: true });
  }, [code, activeCode, navigate]);

  const exit = () => {
    leave();
    navigate('/');
  };

  // Sem sessão para esta sala: é um convite, vai para o lobby escolher apelido e deck.
  if (status === 'needsJoin') return <Navigate to={`/?sala=${code.toUpperCase()}`} replace />;

  if (error && (status === 'error' || !room)) {
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
  if (!room)
    return (
      <CenterScreen>
        <Spinner /> Conectando ao servidor…
      </CenterScreen>
    );
  if (room.status === 'waiting' || !room.view) return <WaitingRoom code={room.code} onCancel={exit} />;
  return <OnlineDuel room={room} view={room.view} onExit={exit} />;
}
