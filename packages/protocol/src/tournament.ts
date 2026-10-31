import { ROOM_CODE_LENGTH } from './room-code';

/** Modo Torneio: de 2 a 10 contas, em até três fases (mata-mata, pontos e final). */

export const TOURNAMENT_MIN = 2;
export const TOURNAMENT_MAX = 10;
/** A partir de quantos inscritos o torneio abre com mata-mata. */
export const KNOCKOUT_FROM = 6;
/** Pontos por resultado na fase de pontos. */
export const POINTS = { win: 3, draw: 1, loss: 0 } as const;

/** Código de torneio: "T" + o código de sala, para o cliente saber a que se ligar. */
export const TOURNAMENT_PREFIX = 'T';
export const isTournamentCode = (code: string) => code.length === ROOM_CODE_LENGTH + 1 && code.toUpperCase().startsWith(TOURNAMENT_PREFIX);

export type TournamentPhase = 'inscricao' | 'mata-mata' | 'pontos' | 'final' | 'encerrado';

export interface TournamentEntrant {
  name: string;
  status: 'ativo' | 'eliminado' | 'saiu';
  connected: boolean;
  isHost: boolean;
  isMe: boolean;
}

export interface TournamentMatchView {
  id: string;
  a: string;
  /** null = folga (passa direto). */
  b: string | null;
  status: 'pendente' | 'jogando' | 'fim';
  winner: 'a' | 'b' | 'draw' | null;
  /** LP de cada lado: ao vivo enquanto o duelo corre, final depois. */
  lp: [number, number] | null;
  /** Decidido por W.O. (alguém saiu do torneio), sem duelo. */
  wo: boolean;
  /** Duelo da própria pessoa. */
  mine: boolean;
}

export interface TournamentRound {
  phase: Exclude<TournamentPhase, 'inscricao' | 'encerrado'>;
  /** Rodada dentro da fase (a partir de 1). */
  index: number;
  matches: TournamentMatchView[];
}

export interface TournamentStanding {
  name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  /** Saldo de LP somado nos duelos da fase. */
  lpBalance: number;
  isMe: boolean;
}

/** Estado do torneio enviado a cada inscrito. */
export interface TournamentState {
  code: string;
  phase: TournamentPhase;
  hostIsMe: boolean;
  entrants: TournamentEntrant[];
  rounds: TournamentRound[];
  standings: TournamentStanding[];
  /** 1º, 2º e 3º (null enquanto não definido). */
  podium: [string | null, string | null, string | null];
  /** Sala do duelo atual da pessoa (o `room:state` dela chega no mesmo socket). */
  myMatch: string | null;
  serverNow: number;
}
