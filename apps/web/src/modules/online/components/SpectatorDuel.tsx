import type { GameView } from '@devoh/engine';
import type { RoomState } from '@devoh/protocol';
import { Eye, WifiOff } from 'lucide-react';
import { DuelBoard } from '../../duel';
import { useRoomStore } from '../store/roomStore';

/**
 * Duelo do torneio assistido por um inscrito: o mesmo tabuleiro, com as duas mãos e os cards
 * virados abertos, sem nenhuma jogada. O primeiro jogador fica embaixo.
 */
export function SpectatorDuel({ room, view, onExit }: { room: RoomState; view: GameView; onExit: () => void }) {
  const status = useRoomStore((s) => s.status);
  const offset = useRoomStore((s) => s.clockOffset);
  const [a, b] = room.players;
  return (
    <DuelBoard
      controller={{
        view,
        send: () => 'Você está só assistindo.',
        exit: onExit,
        exitLabel: 'Voltar ao torneio',
        badge: (
          <span className="spectator-badge" title="Você está assistindo: as duas mãos e os cards virados aparecem abertos.">
            <Eye size={14} aria-hidden /> Assistindo · {a?.name ?? '?'} vs {b?.name ?? '?'}
          </span>
        ),
        banner:
          status !== 'ready' ? (
            <div className="net-banner">
              <WifiOff size={16} aria-hidden /> Reconectando…
            </div>
          ) : null,
        turnDeadline: room.turnDeadline ? room.turnDeadline - offset : null,
      }}
    />
  );
}
