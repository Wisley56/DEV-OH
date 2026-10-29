import type { GameView } from '@devoh/engine';
import type { RoomState } from '@devoh/protocol';
import { DuelBoard } from '../../duel';
import { useRoomStore } from '../store/roomStore';

/** Duelo online: o tabuleiro ligado à sala, com avisos de conexão e revanche. */
export function OnlineDuel({ room, view, onExit }: { room: RoomState; view: GameView; onExit: () => void }) {
  const status = useRoomStore((s) => s.status);
  const send = useRoomStore((s) => s.send);
  const rematch = useRoomStore((s) => s.rematch);
  const opp = room.players[room.seat === 0 ? 1 : 0];
  const iWantRematch = room.rematch[room.seat];
  const banner =
    status !== 'ready' ? (
      <div className="net-banner">⚠ Reconectando…</div>
    ) : !opp?.connected ? (
      <div className="net-banner">⚠ {opp?.name ?? 'Oponente'} caiu da call… aguardando reconexão.</div>
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
      }}
    />
  );
}
