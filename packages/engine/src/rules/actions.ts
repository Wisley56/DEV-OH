import { findPro, isNegated, newProSlot, other } from '../core/board';
import { card, effectsOf, nameOf } from '../core/catalog';
import { tributesNeeded, ZONES } from '../core/constants';
import { log, pname } from '../core/log';
import type { Action, ActionResult, CardInstance, GameState, ProSlot, Seat } from '../core/types';
import { fireBugs } from '../effects/bugs';
import { ctxFor } from '../effects/context';
import { attack } from './battle';
import { validTarget } from './targets';
import { endTurn } from './turn';
import { checkWin, lose } from './win';
import { resolveFlip, revealPro, setPosition, toGrave, tribute } from './zones';

/** Ponto de entrada das regras: aplica a ação numa cópia do estado. */
export function applyAction(state: GameState, seat: Seat, action: Action): ActionResult {
  const s = structuredClone(state);
  const err = run(s, seat, action);
  if (err) return { ok: false, error: err };
  checkWin(s);
  return { ok: true, state: s };
}

export function positionBlock(s: GameState, slot: ProSlot): string | null {
  if (slot.summonedTurn === s.turn) return 'Não pode mudar a posição no turno em que foi invocado.';
  if (slot.changedPosTurn === s.turn) return 'Já mudou de posição neste turno.';
  if (slot.attackedTurn === s.turn) return 'Já atacou neste turno.';
  if (slot.lockedUntilTurn >= s.turn) return 'Está encantado e não pode mudar de posição.';
  return null;
}

function run(s: GameState, seat: Seat, a: Action): string | null {
  if (s.winner !== null) return 'O duelo já acabou.';
  if (a.type === 'surrender') {
    lose(s, seat, `${pname(s, seat)} desistiu… pediu as contas.`, 'surrender');
    return null;
  }
  if (seat !== s.active) return 'Não é o seu turno.';
  const p = s.players[seat];
  const opp = other(seat);

  switch (a.type) {
    case 'summon': {
      const err = placePro(s, seat, a.iid, a.tributes, a.zone, a.position, false);
      if (err) return err;
      const c = findPro(s, a.iid)!.slot.card;
      const d = card(c.cardId);
      if (d.target && a.target && !validTarget(s, seat, d.target, a.target)) return 'Alvo inválido.';
      log(s, 'summon', `${p.name} invocou "${d.name}" em ${a.position === 'atk' ? 'Ataque' : 'Defesa'}.`, {
        seat,
        cardId: d.id,
        iid: c.iid,
      });
      summoned(s, c, a.target);
      return null;
    }

    case 'flipSummon': {
      if (s.phase !== 'main') return 'Só dá para virar na Fase Principal.';
      const f = findPro(s, a.iid);
      if (!f || f.seat !== seat) return 'Profissional inválido.';
      if (!f.slot.faceDown) return 'Este Profissional já está virado para cima.';
      if (f.slot.summonedTurn === s.turn) return 'Não dá para virar no turno em que foi baixado.';
      const block = positionBlock(s, f.slot);
      if (block) return block;
      f.slot.changedPosTurn = s.turn;
      revealPro(s, f.slot);
      log(s, 'summon', `${p.name} fez a Invocação-Virar de "${nameOf(f.slot.card)}".`, { seat, cardId: f.slot.card.cardId, iid: a.iid });
      setPosition(s, a.iid, 'atk');
      const now = findPro(s, a.iid);
      if (!now) return null;
      resolveFlip(s, now.slot, 'summon');
      summoned(s, now.slot.card);
      return null;
    }

    case 'activate': {
      if (p.shockedUntilTurn >= s.turn) return 'Você está Chocado e não pode ativar Tasks!';
      // Da mão ou do campo (Task baixada virada).
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      const si = hi < 0 ? p.spells.findIndex((x) => x?.faceDown && x.card.iid === a.iid) : -1;
      if (hi < 0 && si < 0) return 'Card não está na sua mão.';
      const set = si >= 0 ? p.spells[si]! : null;
      const c = set ? set.card : p.hand[hi];
      const d = card(c.cardId);
      if (d.kind !== 'task') return 'Esse card não é uma Task.';
      const quick = d.speed === 'quick';
      if (s.phase !== 'main' && !(quick && s.phase === 'battle')) return 'Tasks só na Fase Principal (Rápidas também na Batalha).';
      if (set && quick && set.setTurn === s.turn) return 'Task Rápida baixada só pode ser ativada a partir do próximo turno.';
      const fx = effectsOf(d.id);
      const ctx = ctxFor(s, c, a.target);
      const cant = fx?.canActivate?.(ctx);
      if (cant) return cant;
      const equip = d.speed === 'equip';
      if (d.target) {
        if ((d.targetRequired || equip) && !validTarget(s, seat, d.target, a.target)) return 'Escolha um alvo válido.';
        if (a.target && !validTarget(s, seat, d.target, a.target)) return 'Alvo inválido.';
      }
      const stays = d.speed === 'continuous' || equip;
      if (stays && !set) {
        if (!p.spells.some((x) => !x)) return 'Sem zona livre para Tasks/Bugs.';
        if (a.zone !== undefined && !zoneFreeAfter(p.spells, a.zone)) return 'Essa zona está ocupada.';
      }
      if (set) p.spells[si] = null;
      else p.hand.splice(hi, 1);
      log(s, 'task', `${p.name} ativou a Task "${d.name}".`, { seat, cardId: d.id, iid: c.iid });
      const ev = fireBugs(s, opp, ['oppTask'], { trigger: 'oppTask', task: c.iid });
      if (ev.negated) {
        toGrave(s, c);
        log(s, 'effect', `"${d.name}" foi anulada.`, { seat });
        return null;
      }
      if (equip && !findPro(s, a.target)) {
        toGrave(s, c);
        log(s, 'effect', `"${d.name}" ficou sem quem equipar.`, { seat });
        return null;
      }
      if (d.speed === 'field') {
        if (p.field) {
          toGrave(s, p.field.card);
          log(s, 'info', `"${nameOf(p.field.card)}" saiu de campo.`, { seat });
        }
        p.field = { card: c, faceDown: false, revealed: true, setTurn: s.turn };
      } else if (stays) {
        const zone = set ? si : (a.zone ?? p.spells.findIndex((x) => !x));
        p.spells[zone] = { card: c, faceDown: false, revealed: true, setTurn: s.turn, ...(equip && { equippedTo: a.target }) };
      }
      fx?.onActivate?.(ctx);
      if (!stays && d.speed !== 'field') toGrave(s, c);
      return null;
    }

    case 'set': {
      if (s.phase !== 'main') return 'Só dá para baixar cards na Fase Principal.';
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      if (hi < 0) return 'Card não está na sua mão.';
      const c = p.hand[hi];
      const d = card(c.cardId);
      if (d.kind === 'pro') {
        const err = placePro(s, seat, a.iid, a.tributes, a.zone, 'def', true);
        if (err) return err;
        log(s, 'summon', `${p.name} baixou um Profissional virado.`, { seat, iid: c.iid });
        return null;
      }
      if (d.speed === 'field') return 'Task de Campo não pode ser baixada virada: ative direto.';
      const z = a.zone ?? p.spells.findIndex((x) => !x);
      if (z < 0) return 'Sem zona livre para Tasks/Bugs.';
      if (!zoneFreeAfter(p.spells, z)) return 'Essa zona está ocupada.';
      p.hand.splice(hi, 1);
      p.spells[z] = { card: c, faceDown: true, revealed: false, setTurn: s.turn };
      // Não diz se é Task ou Bug: o oponente não pode saber.
      log(s, 'info', `${p.name} baixou um card virado.`, { seat });
      return null;
    }

    case 'changePosition': {
      if (s.phase !== 'main') return 'Mude posições na Fase Principal.';
      const f = findPro(s, a.iid);
      if (!f || f.seat !== seat) return 'Profissional inválido.';
      if (f.slot.faceDown) return 'Card virado: use a Invocação-Virar.';
      const err = positionBlock(s, f.slot);
      if (err) return err;
      f.slot.changedPosTurn = s.turn;
      const to = f.slot.position === 'atk' ? 'def' : 'atk';
      log(s, 'info', `"${nameOf(f.slot.card)}" mudou para ${to === 'atk' ? 'Ataque' : 'Defesa'}.`, { seat, cardId: f.slot.card.cardId });
      setPosition(s, a.iid, to);
      return null;
    }

    case 'ignition': {
      if (s.phase !== 'main') return 'Efeitos só na Fase Principal.';
      const f = findPro(s, a.iid);
      if (!f || f.seat !== seat) return 'Profissional inválido.';
      const d = card(f.slot.card.cardId);
      if (!d.ignition) return 'Este card não tem efeito ativável.';
      if (f.slot.ignitionTurn === s.turn) return 'Efeito já usado neste turno.';
      if (f.slot.faceDown) return 'Card virado não usa efeitos.';
      if (isNegated(s, f.slot)) return 'Os efeitos deste card estão anulados neste turno.';
      const ctx = ctxFor(s, f.slot.card, a.target);
      const cant = effectsOf(d.id)?.canIgnite?.(ctx);
      if (cant) return cant;
      if (d.ignition.target && !validTarget(s, seat, d.ignition.target, a.target)) return 'Escolha um alvo válido.';
      f.slot.ignitionTurn = s.turn;
      effectsOf(d.id)?.onIgnite?.(ctx);
      return null;
    }

    case 'goBattle': {
      if (s.phase !== 'main') return 'Você já está na Batalha.';
      if (s.turn === 1) return 'Não tem Batalha no primeiro turno do duelo.';
      s.phase = 'battle';
      log(s, 'info', `${p.name} entrou na Fase de Batalha.`, { seat });
      return null;
    }

    case 'attack':
      return attack(s, seat, a.iid, a.target);

    case 'endTurn':
      endTurn(s);
      return null;
  }
}

/**
 * Invocação normal (para cima) ou baixar virado: valida e paga os sacrifícios e põe o card na zona.
 * Usa a invocação do turno. Retorna a mensagem de erro, ou null.
 */
function placePro(
  s: GameState,
  seat: Seat,
  iid: string,
  tributes: string[] | undefined,
  zoneArg: number | undefined,
  position: 'atk' | 'def',
  faceDown: boolean,
): string | null {
  const p = s.players[seat];
  if (s.phase !== 'main') return 'Só dá para invocar na Fase Principal.';
  if (p.summonedThisTurn) return 'Você já invocou neste turno.';
  const hi = p.hand.findIndex((c) => c.iid === iid);
  if (hi < 0) return 'Card não está na sua mão.';
  const c = p.hand[hi];
  const d = card(c.cardId);
  if (d.kind !== 'pro') return 'Só Profissionais podem ser invocados.';
  const need = tributesNeeded(d.level ?? 1);
  const tribs = [...new Set(tributes ?? [])];
  if (tribs.length !== need) return need ? `Precisa sacrificar ${need} Profissional(is).` : 'Este card não precisa de sacrifício.';
  for (const t of tribs) {
    const f = findPro(s, t);
    if (!f || f.seat !== seat) return 'Sacrifício inválido.';
  }
  const freeAfter = p.pros.filter((x) => !x).length + tribs.length;
  if (freeAfter < 1) return 'Sem zona livre para Profissionais.';
  if (zoneArg !== undefined && !zoneFreeAfter(p.pros, zoneArg, tribs)) return 'Essa zona está ocupada.';
  for (const t of tribs) tribute(s, t);
  p.hand.splice(hi, 1);
  const zone = zoneArg ?? p.pros.findIndex((x) => !x);
  p.pros[zone] = newProSlot(c, position, s.turn, faceDown);
  p.summonedThisTurn = true;
  return null;
}

/** Depois de uma invocação para cima (normal ou Invocação-Virar): Bugs do oponente e o efeito "ao ser invocado". */
function summoned(s: GameState, c: CardInstance, target?: string) {
  fireBugs(s, other(c.owner), ['oppSummon'], { trigger: 'oppSummon', summoned: c.iid });
  if (findPro(s, c.iid) && s.winner === null) effectsOf(c.cardId)?.onSummon?.(ctxFor(s, c, target));
}

/** A zona existe e estará livre (contando os Profissionais que saem como sacrifício). */
function zoneFreeAfter(slots: ({ card: { iid: string } } | null)[], zone: number, leaving: string[] = []) {
  if (!Number.isInteger(zone) || zone < 0 || zone >= ZONES) return false;
  const x = slots[zone];
  return !x || leaving.includes(x.card.iid);
}
