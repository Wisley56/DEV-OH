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
      <div className="open-rooms-head">
        <h2>
          <span className={`live-dot ${offline ? 'off' : ''}`} aria-hidden />
          Salas abertas
        </h2>
        <span className="mono muted">atualiza sozinho</span>
      </div>
      {offline ? (
        <p className="open-rooms-empty">Servidor de duelos fora do ar agora.</p>
      ) : !rooms ? (
        <p className="open-rooms-empty">Procurando salas…</p>
      ) : rooms.length === 0 ? (
        <p className="open-rooms-empty">Nenhuma sala esperando. Crie uma e chame o time!</p>
      ) : (
        <div className="open-rooms-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Anfitrião</th>
                <th scope="col">Modo</th>
                <th scope="col">Jogadores</th>
                <th scope="col">Esperando</th>
                <th scope="col">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.code}>
                  <td className="or-host">
                    {r.host} <span className="mono or-code">{r.code}</span>
                  </td>
                  <td>
                    <span className={`or-mode ${r.mode}`}>{r.mode === 'torneio' ? 'Torneio' : 'VS'}</span>
                  </td>
                  <td className="mono">
                    {r.players}/{r.max}
                  </td>
                  <td className="mono muted">{waitingLabel(r.waitingMs)}</td>
                  <td className="or-action">
                    <Button size="sm" onClick={() => onJoin(r.code)}>
                      Entrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
