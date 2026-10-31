import type { OpenRoom } from '@devoh/protocol';
import { useEffect, useState } from 'react';
import { Button } from '../../../shared/ui';
import { fetchOpenRooms, waitingLabel } from '../services/openRooms';

const REFRESH_MS = 5000;

/** Salas públicas esperando oponente; atualiza sozinha enquanto a aba está visível. */
export function OpenRooms({ onJoin }: { onJoin: (code: string) => void }) {
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      fetchOpenRooms(ctrl.signal)
        .then((r) => {
          setRooms(r);
          setOffline(false);
        })
        .catch(() => !ctrl.signal.aborted && setOffline(true));
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      ctrl.abort();
      clearInterval(t);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  return (
    <section className="open-rooms" aria-label="Salas abertas">
      <h3>🟢 Salas abertas</h3>
      {offline ? (
        <p className="open-rooms-empty">Servidor de duelos fora do ar agora.</p>
      ) : !rooms ? (
        <p className="open-rooms-empty">Procurando salas…</p>
      ) : rooms.length === 0 ? (
        <p className="open-rooms-empty">Nenhuma sala esperando. Crie uma e chame o time!</p>
      ) : (
        <ul>
          {rooms.map((r) => (
            <li key={r.code}>
              <span className="or-host">
                {r.mode === 'torneio' && <span className="or-mode">🏆 Torneio</span>}
                {r.host}
              </span>
              <span className="or-meta">
                {r.code} · {r.mode === 'torneio' ? `${r.players}/${r.max} · ` : ''}
                {waitingLabel(r.waitingMs)}
              </span>
              <Button size="sm" variant="primary" onClick={() => onJoin(r.code)}>
                Entrar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
