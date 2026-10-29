import { findPro, other, prosOf } from '../core/board';
import { effectsOf, nameOf } from '../core/catalog';
import { log } from '../core/log';
import type { GameState, ProSlot, Seat } from '../core/types';
import { fireBugs } from '../effects/bugs';
import { ctxFor } from '../effects/context';
import type { AttackInfo } from '../effects/types';
import { damage } from './life';
import { getAtk, getDef } from './stats';
import { addStress } from './stress';
import { destroyPro } from './zones';

export function attackBlock(s: GameState, seat: Seat, slot: ProSlot): string | null {
  if (s.phase !== 'battle') return 'Entre na Fase de Batalha primeiro.';
  if (slot.position !== 'atk') return 'Só Profissionais em Ataque podem atacar.';
  if (slot.attackedTurn === s.turn) return 'Já atacou neste turno.';
  if (s.players[seat].noAttackTurn === s.turn) return 'Seu time está de férias neste turno.';
  return null;
}

/**
 * Ordem de resolução de um ataque:
 * 1. guardAttack dos Profissionais do defensor  2. onTargeted do alvo  3. Bugs do defensor
 * 4. onAttack do atacante  5. cálculo de dano/destruição  6. afterSurviveAttack do alvo.
 */
export function attack(s: GameState, seat: Seat, iid: string, targetIid?: string): string | null {
  const opp = other(seat);
  const f = findPro(s, iid);
  if (!f || f.seat !== seat) return 'Atacante inválido.';
  const block = attackBlock(s, seat, f.slot);
  if (block) return block;
  const oppPros = prosOf(s, opp);
  let target: ProSlot | null = null;
  if (oppPros.length) {
    const t = findPro(s, targetIid);
    if (!t || t.seat !== opp) return 'Escolha um Profissional do oponente para atacar.';
    target = t.slot;
  } else if (targetIid) return 'Alvo inválido.';

  f.slot.attackedTurn = s.turn;
  const A = f.slot;
  log(s, 'attack', target ? `"${nameOf(A.card)}" atacou "${nameOf(target.card)}"!` : `"${nameOf(A.card)}" atacou diretamente!`, {
    seat,
    cardId: A.card.cardId,
    iid: A.card.iid,
    target: target?.card.iid,
  });

  // Respostas do defensor: Profissionais em campo, o próprio alvo e os Bugs.
  const info: AttackInfo = { attacker: A.card.iid, target: target?.card.iid };
  for (const pro of oppPros) {
    if (effectsOf(pro.card.cardId)?.guardAttack?.(ctxFor(s, pro.card), info)) return null;
  }
  if (target && effectsOf(target.card.cardId)?.onTargeted?.(ctxFor(s, target.card), info)) return null;
  const triggers = target ? (['oppAttack'] as const) : (['oppAttack', 'oppDirectAttack'] as const);
  const ev = fireBugs(s, opp, [...triggers], {
    trigger: target ? 'oppAttack' : 'oppDirectAttack',
    attacker: A.card.iid,
    target: target?.card.iid,
  });
  if (ev.negated || s.winner !== null) return null;
  if (!findPro(s, A.card.iid)) return null;
  if (target && !findPro(s, target.card.iid)) return null;

  effectsOf(A.card.cardId)?.onAttack?.(ctxFor(s, A.card), info);

  const atkA = getAtk(s, seat, A);
  if (!target) {
    battleDamage(s, opp, atkA, [A]);
    return null;
  }
  const involved = [A, target];
  if (target.position === 'atk') {
    const atkT = getAtk(s, opp, target);
    if (atkA > atkT) {
      const destroyed = battleDestroy(s, target, A);
      battleDamage(s, opp, atkA - atkT, involved);
      if (destroyed) afterKill(s, A);
    } else if (atkA < atkT) {
      battleDestroy(s, A, target);
      battleDamage(s, seat, atkT - atkA, involved);
    } else if (atkA > 0) {
      battleDestroy(s, A, target);
      battleDestroy(s, target, A);
    }
  } else {
    const defT = getDef(s, opp, target);
    if (atkA > defT) {
      if (battleDestroy(s, target, A)) afterKill(s, A);
    } else if (atkA < defT) {
      battleDamage(s, seat, defT - atkA, involved);
    }
  }
  if (findPro(s, target.card.iid) && s.winner === null) effectsOf(target.card.cardId)?.afterSurviveAttack?.(ctxFor(s, target.card));
  return null;
}

/** Destrói `victim` em batalha contra `by`. Retorna true se destruiu. */
function battleDestroy(s: GameState, victim: ProSlot, by: ProSlot): boolean {
  const f = findPro(s, victim.card.iid);
  if (!f) return false;
  const saved = effectsOf(victim.card.cardId)?.saveFromBattle?.(ctxFor(s, victim.card));
  if (saved) {
    log(s, 'effect', saved, { seat: f.seat, cardId: victim.card.cardId });
    return false;
  }
  const ok = destroyPro(s, victim.card.iid, { battle: true, byIid: by.card.iid });
  if (ok) fireBugs(s, f.seat, ['proDestroyedByBattle'], { trigger: 'proDestroyedByBattle', destroyed: victim.card.iid, by: by.card.iid });
  return ok;
}

function afterKill(s: GameState, killer: ProSlot) {
  if (!findPro(s, killer.card.iid)) return;
  effectsOf(killer.card.cardId)?.afterBattleKill?.(ctxFor(s, killer.card));
}

function battleDamage(s: GameState, seat: Seat, amount: number, involved: ProSlot[]) {
  if (amount <= 0 || s.winner !== null) return;
  for (const x of involved) {
    if (x.card.owner === seat && effectsOf(x.card.cardId)?.shieldBattleDamage?.(ctxFor(s, x.card))) return;
  }
  for (const pro of prosOf(s, seat)) {
    if (effectsOf(pro.card.cardId)?.preventOwnerBattleDamage?.(ctxFor(s, pro.card))) return;
  }
  const ev = fireBugs(s, seat, ['battleDamage'], { trigger: 'battleDamage', damage: amount });
  const final = ev.damage ?? amount;
  if (final <= 0) return;
  damage(s, seat, final);
  addStress(s, seat, 1);
}
