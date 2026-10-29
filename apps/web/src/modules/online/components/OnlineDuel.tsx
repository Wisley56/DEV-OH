import type { GameView } from '@devoh/engine';
import type { RoomState } from '@devoh/protocol';
import { useNow } from '../../../shared/lib/useNow';
import { DuelBoard } from '../../duel';
import { useRoomStore } from '../store/roomStore';

/** Duelo online: o tabuleiro ligado à sala, com timer de turno, avisos de conexão e revanche. */
export function OnlineDuel({ room, view, onExit }: { room: RoomState; view: GameView; onExit: () => void }) {
  const status = useRoomStore((s) => s.status);
  const send = useRoomStore((s) => s.send);
  const rematch = useRoomStore((s) => s.rematch);
  const offset = useRoomStore((s) => s.clockOffset);
  const opp = room.players[room.seat === 0 ? 1 : 0];
  const iWantRematch = room.rematch[room.seat];
  // Prazos vêm no relógio do servidor; aqui viram horário deste navegador.
  const local = (t: number | null | undefined) => (t ? t - offset : null);
  const woAt = local(opp?.reconnectDeadline);
  const now = useNow(500, !!woAt);
  const woSecs = woAt ? Math.max(0, Math.ceil((woAt - now) / 1000)) : null;
  const banner =
    status !== 'ready' ? (
      <div className="net-banner">⚠ Reconectando…</div>
    ) : !opp?.connected ? (
      <div className="net-banner">
        ⚠ {opp?.name ?? 'Oponente'} caiu da call…{' '}
        {woSecs !== null ? `se não voltar em ${woSecs}s, você vence por W.O.` : 'aguardando reconexão.'}
      </div>
    ) : null;

  return (
    <DuelBoard
      controller={{
        view,
        send,
        exit: () => {
          if (view.winner === null) send({ type: 'surrender' });
          onExit();
        },
        rematch: iWantRematch ? undefined : rematch,
        rematchLabel: room.rematch.some(Boolean) ? 'Aceitar revanche' : 'Pedir revanche',
        banner,
        turnDeadline: local(room.turnDeadline),
      }}
    />
  );
}
