import type { BugTrigger, CardDef, CardInstance, GameState, ProSlot, Seat } from '../core/types';

export interface EffectCtx {
  s: GameState;
  me: Seat;
  opp: Seat;
  self: CardInstance;
  /** iid escolhido pelo jogador (quando o card pede alvo). */
  target?: string;
}

/** Contexto de cálculo de status: só leitura, sem efeitos colaterais. */
export interface StatCtx {
  s: GameState;
  seat: Seat;
  slot: ProSlot;
  def: CardDef;
}

/** Evento que dispara Bugs; os handlers podem marcá-lo como negado ou alterar o dano. */
export interface BugEvent {
  trigger: BugTrigger;
  attacker?: string;
  target?: string;
  summoned?: string;
  task?: string;
  /** Bug do oponente que vai disparar (trigger oppBug). */
  bug?: string;
  damage?: number;
  destroyed?: string;
  by?: string;
  negated?: boolean;
}

export type FlipCause = 'summon' | 'attacked' | 'effect';

/** Declaração de ataque: iid do atacante e do alvo (sem alvo = ataque direto). */
export interface AttackInfo {
  attacker: string;
  target?: string;
}

/**
 * Ganchos que um card pode implementar. O kernel chama cada um num ponto fixo
 * das regras; a ordem das chamadas está documentada em rules/.
 */
export interface CardEffects {
  // ── Ativação ──
  /** Retorna mensagem de erro se não puder ativar/usar agora. */
  canActivate?(ctx: EffectCtx): string | null;
  onActivate?(ctx: EffectCtx): void;
  onSummon?(ctx: EffectCtx): void;
  /** Efeito FLIP: o Profissional virado foi revelado (Invocação-Virar, atacado ou por efeito). */
  onFlip?(ctx: EffectCtx, cause: FlipCause): void;
  canIgnite?(ctx: EffectCtx): string | null;
  onIgnite?(ctx: EffectCtx): void;
  /** Início do turno do dono, enquanto o card está no campo. */
  onStandby?(ctx: EffectCtx): void;
  /** Depois de ir para o cemitério. byIid = Profissional que destruiu em batalha. */
  onDestroyed?(ctx: EffectCtx, info: { battle: boolean; byIid?: string }): void;

  // ── Bugs ──
  /** Condição extra de disparo de um Bug. */
  bugCondition?(ctx: EffectCtx, ev: BugEvent): boolean;
  onTrigger?(ctx: EffectCtx, ev: BugEvent): void;
  /** Profissional em campo (de qualquer lado) reage a qualquer Bug ativado. */
  onAnyBug?(ctx: EffectCtx): void;

  // ── Equipamento ──
  /** Task de Equipamento: ajuste de ATK/DEF do Profissional equipado (q = ele). */
  equip?(q: StatCtx): { atk?: number; def?: number };
  /** Task de Equipamento: dano de batalha envolvendo o equipado não dá Estresse ao dono dele. */
  calmInBattle?(): boolean;

  // ── Status (consultas puras) ──
  /** Ajusta o ATK base do próprio Profissional (antes dos bônus). */
  atkBase?(q: StatCtx, base: number): number;
  /** Bônus de ATK do próprio Profissional. */
  atkBonus?(q: StatCtx): number;
  /** Task virada para cima: bônus de ATK que dá a cada Profissional do mesmo lado. */
  auraAtk?(q: StatCtx): number;
  /** Profissional ou Task virada para cima: ajuste de ATK/DEF de cada Profissional do oponente. */
  oppAura?(q: StatCtx): { atk?: number; def?: number };

  // ── Batalha ──
  /** Profissional do defensor pode negar um ataque declarado. true = negado. */
  guardAttack?(ctx: EffectCtx, info: AttackInfo): boolean;
  /** O próprio Profissional foi escolhido como alvo. true = ataque negado. */
  onTargeted?(ctx: EffectCtx, info: AttackInfo): boolean;
  /** O próprio Profissional atacou (depois das respostas do defensor). */
  onAttack?(ctx: EffectCtx, info: AttackInfo): void;
  /** Um Profissional do mesmo lado (inclusive ele) atacou, logo depois do onAttack do atacante. */
  onAllyAttack?(ctx: EffectCtx, info: AttackInfo): void;
  /** Não é destruído em batalha: retorna a fala do log, ou null. */
  saveFromBattle?(ctx: EffectCtx): string | null;
  /** Salva outro Profissional do mesmo lado de ser destruído em batalha: retorna a fala do log, ou null. */
  saveAllyFromBattle?(ctx: EffectCtx, victim: ProSlot): string | null;
  /** Destruiu um Profissional em batalha e continua no campo. */
  afterBattleKill?(ctx: EffectCtx): void;
  /** Foi alvo de um ataque e continua no campo. */
  afterSurviveAttack?(ctx: EffectCtx): void;
  /** Envolvido na batalha: anula o dano de batalha do dono. true = anulado. */
  shieldBattleDamage?(ctx: EffectCtx): boolean;
  /** No campo do dono: anula um dano de batalha que ele receberia. true = anulado. */
  preventOwnerBattleDamage?(ctx: EffectCtx): boolean;

  // ── Campo ──
  /** Imune a destruição por efeitos do oponente: retorna a fala do log, ou null. */
  immuneToOppEffects?(ctx: EffectCtx): string | null;
  /** Ao mudar de posição: retorna o id do card em que se transforma. */
  onPositionChange?(ctx: EffectCtx, to: 'atk' | 'def'): string | undefined;
  /** Devolve ao oponente um aumento de Estresse causado por ele. true = devolvido. */
  reflectOppStress?(ctx: EffectCtx): boolean;
}

/** Um card do catálogo: definição (dados) + efeitos (comportamento). */
export interface CardModule {
  def: CardDef;
  effects?: CardEffects;
}

export const defineCard = (m: CardModule): CardModule => m;
