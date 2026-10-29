export type Seat = 0 | 1;

/** pro = Profissional (monstro), task = Magia, bug = Armadilha */
export type CardKind = 'pro' | 'task' | 'bug';

export type Attribute = 'TREVA' | 'AGUA' | 'TERRA' | 'FOGO' | 'LUZ' | 'TECH';

export type TaskSpeed = 'normal' | 'continuous' | 'field';

/** Quando uma Armadilha (Bug) dispara automaticamente. */
export type BugTrigger =
  | 'oppSummon' // oponente invocou um Profissional
  | 'oppAttack' // oponente declarou ataque (qualquer alvo)
  | 'oppDirectAttack' // oponente declarou ataque direto
  | 'oppTask' // oponente ativou uma Task
  | 'battleDamage' // você vai receber dano de batalha
  | 'proDestroyedByBattle'; // um Profissional seu foi destruído em batalha

/** Tipo de alvo que um efeito pede ao jogador. */
export type TargetKind = 'ownPro' | 'oppPro' | 'anyPro' | 'oppSet';

export interface CardDef {
  id: string;
  name: string;
  kind: CardKind;
  /** Linha entre colchetes: "Humano / Tech Lead / Efeito" */
  typeLine: string;
  text: string;
  /** Frase de efeito / piada (itálico na carta) */
  flavor?: string;
  art: string;
  /** Pessoa real da squad: só 1 cópia por deck. */
  unique?: boolean;
  tags?: string[];

  // Profissionais
  attribute?: Attribute;
  level?: number;
  atk?: number;
  def?: number;
  /** Texto que aparece no lugar do número na carta (ex.: "∞") — só visual. */
  atkLabel?: string;
  defLabel?: string;

  // Tasks
  speed?: TaskSpeed;
  // Bugs
  trigger?: BugTrigger;

  target?: TargetKind;
  /** Sem alvo o card não faz nada útil: a ativação exige um alvo válido. */
  targetRequired?: boolean;
  /** Ignition: efeito de Profissional ativado manualmente, 1x por turno (o alvo, se houver, é obrigatório). */
  ignition?: { label: string; target?: TargetKind };
}

export interface CardInstance {
  iid: string;
  cardId: string;
  owner: Seat;
}

export interface ProSlot {
  card: CardInstance;
  position: 'atk' | 'def';
  atkMod: number;
  defMod: number;
  tempAtk: number;
  summonedTurn: number;
  attackedTurn: number;
  changedPosTurn: number;
  ignitionTurn: number;
  /** Turno até o qual o card não pode mudar de posição/atacar (efeitos). */
  lockedUntilTurn: number;
  /** Contadores de "1x por turno" de efeitos passivos. */
  oncePerTurn: Record<string, number>;
}

export interface SpellSlot {
  card: CardInstance;
  faceDown: boolean;
  revealed: boolean;
  setTurn: number;
}

export interface PlayerState {
  name: string;
  lp: number;
  stress: number;
  deck: CardInstance[];
  hand: CardInstance[];
  grave: CardInstance[];
  pros: (ProSlot | null)[];
  spells: (SpellSlot | null)[];
  field: SpellSlot | null;
  summonedThisTurn: boolean;
  /** Chocado (Patrícia/Gama): não ativa Tasks e Bugs não disparam até este turno (inclusive). */
  shockedUntilTurn: number;
  /** Não pode atacar neste turno (Férias Aprovadas). */
  noAttackTurn: number;
  /** 1x por turno de efeitos de jogador (ex.: Danilo "Foi o Claude"). */
  oncePerTurn: Record<string, number>;
}

export type Phase = 'main' | 'battle' | 'ended';

export type LogKind =
  'info' | 'turn' | 'draw' | 'summon' | 'task' | 'bug' | 'effect' | 'attack' | 'damage' | 'heal' | 'destroy' | 'stress' | 'win' | 'coin';

export interface LogEntry {
  id: number;
  kind: LogKind;
  text: string;
  seat?: Seat;
  cardId?: string;
  amount?: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  turn: number;
  active: Seat;
  phase: Phase;
  winner: Seat | 'draw' | null;
  log: LogEntry[];
  rng: number;
  nextIid: number;
  nextLogId: number;
}

export type Action =
  | { type: 'summon'; iid: string; position: 'atk' | 'def'; tributes?: string[]; target?: string }
  | { type: 'activate'; iid: string; target?: string }
  | { type: 'set'; iid: string }
  | { type: 'changePosition'; iid: string }
  | { type: 'ignition'; iid: string; target?: string }
  | { type: 'goBattle' }
  | { type: 'attack'; iid: string; target?: string }
  | { type: 'endTurn' }
  | { type: 'surrender' };

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };

export interface DeckList {
  id: string;
  name: string;
  description: string;
  cards: string[];
}
