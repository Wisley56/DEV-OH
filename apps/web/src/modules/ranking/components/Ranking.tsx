import type { MatchHistoryEntry, RankingEntry } from '@devoh/protocol';
import { Medal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../../shared/lib/api';
import { Spinner } from '../../../shared/ui';
import { useAccount } from '../../auth';

const RESULT: Record<MatchHistoryEntry['result'], string> = { win: 'Vitória', loss: 'Derrota', draw: 'Empate' };
const REASON: Record<string, string> = {
  lp: 'LP zerado',
  draw: 'empate',
  timeout: 'tempo',
  abandon: 'W.O.',
  surrender: 'desistência',
  deckout: 'deck vazio',
};

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Ranking online (Elo, vitórias, derrotas, empates e %), com a sua linha em destaque e o seu histórico. */
export function Ranking() {
  const { account } = useAccount();
  const [rows, setRows] = useState<RankingEntry[] | null>(null);
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<RankingEntry[]>('/ranking')
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!account) return setHistory([]);
    api<MatchHistoryEntry[]>('/ranking/me')
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [account]);

  if (error) return <p className="warn">{error}</p>;
  if (!rows)
    return (
      <p className="muted">
        <Spinner /> Carregando ranking…
      </p>
    );

  return (
    <div className="ranking">
      {rows.length === 0 ? (
        <p className="muted ranking-empty">Ninguém jogou online ainda. Crie uma sala e seja o primeiro do ranking!</p>
      ) : (
        <div className="ranking-scroll">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="r-name">Jogador</th>
                <th>Elo</th>
                <th title="Vitórias">V</th>
                <th title="Derrotas">D</th>
                <th title="Empates">E</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.username} className={r.username === account?.username ? 'me' : undefined}>
                  <td className="r-pos">
                    {r.position <= 3 ? (
                      <span className={`medal place-${r.position}`} title={`${r.position}º lugar`}>
                        <Medal size={18} aria-hidden />
                        <span className="sr-only">{r.position}</span>
                      </span>
                    ) : (
                      r.position
                    )}
                  </td>
                  <td className="r-name">{r.displayName}</td>
                  <td className="r-elo">{r.elo}</td>
                  <td>{r.wins}</td>
                  <td>{r.losses}</td>
                  <td>{r.draws}</td>
                  <td>{r.winRate ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {account && (
        <section className="history panel">
          <h2>Suas últimas partidas</h2>
          {history.length === 0 ? (
            <p className="muted">Nenhuma partida online ainda.</p>
          ) : (
            <ul>
              {history.map((m) => (
                <li key={m.id} className={`h-${m.result}`}>
                  <span className="h-result">{RESULT[m.result]}</span>
                  <span className="h-opp">
                    vs <b>{m.opponent}</b> <span className="muted">({REASON[m.reason] ?? m.reason})</span>
                  </span>
                  <span className="h-elo">{signed(m.eloDelta)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
