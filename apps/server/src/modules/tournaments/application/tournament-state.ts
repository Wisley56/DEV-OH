import type { TournamentRound, TournamentState } from '@devoh/protocol';
import type { Tournament } from '../domain/tournament.js';

/** Estado do torneio como a conta `userId` vê (os duelos dela marcados como "mine"). */
export function tournamentStateFor(t: Tournament, userId: string, now: number): TournamentState {
  const name = (id: string | null) => (id ? (t.entrant(id)?.name ?? '?') : null);
  const rounds: TournamentRound[] = [];
  /** Quem está duelando não assiste: veria a mão do próprio oponente em outra janela. */
  const busy = !!t.activeMatch(userId);
  const watching = t.entrant(userId)?.watching;
  for (const m of t.matches) {
    let round = rounds.find((r) => r.phase === m.stage && r.index === m.round);
    if (!round) rounds.push((round = { phase: m.stage, index: m.round, matches: [] }));
    round.matches.push({
      id: m.id,
      a: name(m.a)!,
      b: name(m.b),
      status: m.status,
      winner: m.winner,
      lp: m.lp,
      wo: m.wo,
      mine: m.a === userId || m.b === userId,
      watchable: m.status === 'jogando' && m.a !== userId && m.b !== userId && !busy,
    });
  }
  return {
    code: t.code,
    phase: t.phase,
    hostIsMe: t.hostUserId === userId,
    entrants: t.entrants.map((e) => ({
      name: e.name,
      status: e.status,
      connected: !!e.socketId,
      isHost: e.userId === t.hostUserId,
      isMe: e.userId === userId,
    })),
    rounds,
    standings: t.group.length
      ? t.table().map((s) => ({
          name: name(s.userId)!,
          points: s.points,
          wins: s.wins,
          draws: s.draws,
          losses: s.losses,
          lpBalance: s.lpBalance,
          isMe: s.userId === userId,
        }))
      : [],
    podium: [name(t.podium[0]), name(t.podium[1]), name(t.podium[2])],
    myMatch: t.activeMatch(userId)?.roomCode ?? null,
    watching: (watching && t.matches.find((m) => m.id === watching)?.roomCode) || null,
    serverNow: now,
  };
}
