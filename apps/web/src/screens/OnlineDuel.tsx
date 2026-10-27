import { useState } from 'react';
import { Board } from '../components/Board';
import { useOnlineRoom, type OnlineIntent } from '../net';

export function OnlineDuel({ intent, onExit }: { intent: OnlineIntent; onExit: () => void }) {
  const { room, status, error, send, rematch, leave } = useOnlineRoom(intent);
  const [copied, setCopied] = useState(false);
  const exit = () => {
    leave();
    onExit();
  };

  if (error && (status === 'error' || !room)) {
    return (
      <div className="center-screen">
        <div className="panel">
          <h2>Ops…</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={exit}>
            Voltar
          </button>
        </div>
      </div>
    );
  }
  if (!room)
    return (
      <div className="center-screen">
        <span className="spinner" /> Conectando ao servidor…
      </div>
    );

  if (room.status === 'waiting' || !room.view) {
    const link = `${location.origin}${location.pathname}?sala=${room.code}`;
    return (
      <div className="center-screen">
        <div className="panel waiting">
          <p className="muted">Sala criada! Mande o código ou o link para o oponente:</p>
          <div className="room-code">{room.code}</div>
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? '✔ Link copiado' : '🔗 Copiar link de convite'}
          </button>
          <p className="muted">
            <span className="spinner" /> Aguardando oponente…
          </p>
          <button className="btn btn-ghost" onClick={exit}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const opp = room.players[room.seat === 0 ? 1 : 0];
  const iWantRematch = room.rematch[room.seat];
  const banner =
    status !== 'ready' ? (
      <div className="net-banner">⚠ Reconectando…</div>
    ) : !opp?.connected ? (
      <div className="net-banner">⚠ {opp?.name ?? 'Oponente'} caiu da call… aguardando reconexão.</div>
    ) : null;

  return (
    <Board
      view={room.view}
      send={send}
      onExit={() => {
        if (room.view && room.view.winner === null) send({ type: 'surrender' });
        exit();
      }}
      onRematch={iWantRematch ? undefined : rematch}
      rematchLabel={room.rematch.some(Boolean) ? 'Aceitar revanche' : 'Pedir revanche'}
      banner={banner}
    />
  );
}
