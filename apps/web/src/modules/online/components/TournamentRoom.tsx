import {
  TOURNAMENT_MAX,
  TOURNAMENT_MIN,
  type TournamentMatchView,
  type TournamentPhase,
  type TournamentRound,
  type TournamentState,
} from '@devoh/protocol';
import { Check, Crown, Link2, Medal, Play, Swords, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, PixelBackground, Spinner } from '../../../shared/ui';
import { useRoomStore } from '../store/roomStore';
import { OnlineDuel } from './OnlineDuel';
import { inviteLink } from './WaitingRoom';

const PHASE_LABEL: Record<TournamentPhase, string> = {
  inscricao: 'Inscrição aberta',
  'mata-mata': 'Fase 1 · Mata-mata',
  pontos: 'Fase 2 · Pontos',
  final: 'Fase 3 · Final',
  encerrado: 'Torneio encerrado',
};

/**
 * Torneio: inscrição, painel (chaveamento, tabela e duelos ao vivo) e pódio. Quando chega o
 * duelo da pessoa, o tabuleiro abre por cima; no fim dele, "Voltar ao torneio".
 */
export function TournamentRoom({ tournament: t, onExit }: { tournament: TournamentState; onExit: () => void }) {
  const matches = useRoomStore((s) => s.matches);
  const [viewing, setViewing] = useState<string | null>(null);
  // Duelo novo da pessoa: abre sozinho, a não ser que ela ainda esteja vendo o resultado do anterior.
  useEffect(() => {
    if (t.myMatch && !viewing) setViewing(t.myMatch);
  }, [t.myMatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const room = viewing ? matches[viewing] : undefined;
  if (room?.view) {
    const back = () => setViewing(t.myMatch && t.myMatch !== viewing ? t.myMatch : null);
    return <OnlineDuel room={room} view={room.view} onExit={back} inTournament />;
  }
  return t.phase === 'inscricao' ? <Signup t={t} onExit={onExit} /> : <Board t={t} onExit={onExit} onOpen={setViewing} />;
}

function Signup({ t, onExit }: { t: TournamentState; onExit: () => void }) {
  const start = useRoomStore((s) => s.startTournament);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enough = t.entrants.length >= TOURNAMENT_MIN;
  return (
    <div className="tournament">
      <PixelBackground />
      <div className="panel tour-signup">
        <h2>
          <Trophy size={22} aria-hidden /> Torneio
        </h2>
        <p className="muted">
          Mande o código ou o link para o time (de {TOURNAMENT_MIN} a {TOURNAMENT_MAX} jogadores):
        </p>
        <div className="room-code">{t.code}</div>
        <Button
          onClick={() => {
            navigator.clipboard?.writeText(inviteLink(t.code));
            setCopied(true);
          }}
        >
          {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
          {copied ? 'Link copiado' : 'Copiar link de convite'}
        </Button>
        <h3>
          Inscritos ({t.entrants.length}/{TOURNAMENT_MAX})
        </h3>
        <ul className="tour-entrants">
          {t.entrants.map((e) => (
            <li key={e.name} className={e.isMe ? 'me' : ''}>
              {e.isHost && <Crown size={14} className="host-icon" aria-label="Anfitrião" />}
              {e.name}
              {!e.connected && <span className="muted"> · offline</span>}
            </li>
          ))}
        </ul>
        <p className="muted tour-rules">{formatHint(t.entrants.length)}</p>
        {t.hostIsMe ? (
          <Button variant="primary" size="lg" disabled={!enough} onClick={() => start().then(setError)}>
            <Play size={16} fill="currentColor" aria-hidden />
            Iniciar torneio
          </Button>
        ) : (
          <p className="muted">
            <Spinner /> Aguardando o anfitrião iniciar…
          </p>
        )}
        {error && <p className="warn">{error}</p>}
        <Button variant="ghost" onClick={onExit}>
          Sair do torneio
        </Button>
      </div>
    </div>
  );
}

/** Como o torneio vai ser com esse número de inscritos. */
function formatHint(n: number) {
  if (n < 2) return 'Precisa de pelo menos 2 jogadores.';
  if (n === 2) return 'Com 2 jogadores: uma final direto.';
  if (n < 6) return `Com ${n}: todos contra todos (vitória 3, empate 1); os 2 melhores fazem a final e o 3º fica com o bronze.`;
  return `Com ${n}: mata-mata (perdeu, saiu), depois todos contra todos entre os ${Math.ceil(n / 2)} que passarem, e a final.`;
}

function Board({ t, onExit, onOpen }: { t: TournamentState; onExit: () => void; onOpen: (code: string) => void }) {
  const over = t.phase === 'encerrado';
  const me = t.entrants.find((e) => e.isMe);
  const leave = () => {
    if (over || me?.status !== 'ativo' || confirm('Sair do torneio? Os duelos que faltam viram W.O.')) onExit();
  };
  return (
    <div className="tournament">
      <PixelBackground />
      <div className="panel tour-board">
        <header className="tour-head">
          <h2>
            <Trophy size={22} aria-hidden /> Torneio <span className="mono">{t.code}</span>
          </h2>
          <span className="tour-phase">{PHASE_LABEL[t.phase]}</span>
        </header>
        {over && <Podium podium={t.podium} />}
        {!over && t.myMatch && (
          <Button variant="primary" onClick={() => onOpen(t.myMatch!)}>
            <Swords size={18} aria-hidden />
            Ir para o seu duelo
          </Button>
        )}
        {!over && !t.myMatch && me && <p className="muted tour-status">{statusLine(me.status)}</p>}
        {t.standings.length > 0 && <Standings t={t} />}
        {[...t.rounds].reverse().map((r) => (
          <Round key={`${r.phase}-${r.index}`} round={r} />
        ))}
        <Button variant="ghost" onClick={leave}>
          {over || me?.status !== 'ativo' ? 'Voltar ao lobby' : 'Sair do torneio'}
        </Button>
      </div>
    </div>
  );
}

function statusLine(status: string) {
  if (status === 'eliminado') return 'Você foi eliminado. Dá para acompanhar o resto do torneio por aqui.';
  if (status === 'saiu') return 'Você saiu do torneio.';
  return 'Aguardando os outros duelos da rodada…';
}

function Podium({ podium }: { podium: TournamentState['podium'] }) {
  return (
    <ol className="tour-podium">
      {podium.map((name, i) =>
        name ? (
          <li key={i} className={`place-${i + 1}`}>
            <span className={`medal place-${i + 1}`}>
              <Medal size={30} aria-hidden />
            </span>
            <b>{name}</b>
          </li>
        ) : null,
      )}
    </ol>
  );
}

function Standings({ t }: { t: TournamentState }) {
  return (
    <section>
      <h3>Tabela de pontos</h3>
      <div className="tour-table-wrap">
        <table className="tour-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>Pts</th>
              <th>V</th>
              <th>E</th>
              <th>D</th>
              <th title="Saldo de LP">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {t.standings.map((s, i) => (
              <tr key={s.name} className={s.isMe ? 'me' : ''}>
                <td>{i + 1}</td>
                <td>{s.name}</td>
                <td>
                  <b>{s.points}</b>
                </td>
                <td>{s.wins}</td>
                <td>{s.draws}</td>
                <td>{s.losses}</td>
                <td>{s.lpBalance > 0 ? `+${s.lpBalance}` : s.lpBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Round({ round }: { round: TournamentRound }) {
  const title = round.phase === 'pontos' ? `Pontos · rodada ${round.index}` : round.phase === 'final' ? 'Final' : 'Mata-mata';
  return (
    <section>
      <h3>{title}</h3>
      <ul className="tour-matches">
        {round.matches.map((m) => (
          <MatchRow key={m.id} m={m} />
        ))}
      </ul>
    </section>
  );
}

function MatchRow({ m }: { m: TournamentMatchView }) {
  if (!m.b)
    return (
      <li className="tour-match bye">
        <b>{m.a}</b> <span className="muted">· folga, passa direto</span>
      </li>
    );
  const side = (name: string, s: 'a' | 'b', lp: number | undefined) => (
    <span className={`tm-side ${m.winner === s ? 'won' : ''}`}>
      {name}
      {lp !== undefined && <span className="tm-lp">{lp}</span>}
    </span>
  );
  const note = m.wo
    ? 'W.O.'
    : m.status === 'jogando'
      ? '● ao vivo'
      : m.status === 'pendente'
        ? 'aguardando'
        : m.winner === 'draw'
          ? 'empate'
          : '';
  return (
    <li className={`tour-match ${m.mine ? 'mine' : ''} ${m.status}`}>
      {side(m.a, 'a', m.lp?.[0])}
      <span className="tm-vs">vs</span>
      {side(m.b, 'b', m.lp?.[1])}
      {note && <span className="tm-note">{note}</span>}
    </li>
  );
}
