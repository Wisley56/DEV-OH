import { findPro, newProSlot, other } from '../core/board';
import { card, effectsOf, nameOf } from '../core/catalog';
import { tributesNeeded } from '../core/constants';
import { log, pname } from '../core/log';
import type { Action, ActionResult, GameState, ProSlot, Seat } from '../core/types';
import { fireBugs } from '../effects/bugs';
import { ctxFor } from '../effects/context';
import { attack } from './battle';
import { validTarget } from './targets';
import { endTurn } from './turn';
import { checkWin } from './win';
import { setPosition, toGrave, tribute } from './zones';

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
    log(s, 'info', `${pname(s, seat)} desistiu… pediu as contas.`, { seat });
    s.winner = other(seat);
    s.phase = 'ended';
    log(s, 'win', `${pname(s, s.winner)} venceu o duelo!`, { seat: s.winner });
    return null;
  }
  if (seat !== s.active) return 'Não é o seu turno.';
  const p = s.players[seat];
  const opp = other(seat);

  switch (a.type) {
    case 'summon': {
      if (s.phase !== 'main') return 'Só dá para invocar na Fase Principal.';
      if (p.summonedThisTurn) return 'Você já invocou neste turno.';
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      if (hi < 0) return 'Card não está na sua mão.';
      const c = p.hand[hi];
      const d = card(c.cardId);
      if (d.kind !== 'pro') return 'Só Profissionais podem ser invocados.';
      const need = tributesNeeded(d.level ?? 1);
      const tribs = [...new Set(a.tributes ?? [])];
      if (tribs.length !== need) return need ? `Precisa sacrificar ${need} Profissional(is).` : 'Este card não precisa de sacrifício.';
      for (const t of tribs) {
        const f = findPro(s, t);
        if (!f || f.seat !== seat) return 'Sacrifício inválido.';
      }
      const freeAfter = p.pros.filter((x) => !x).length + tribs.length;
      if (freeAfter < 1) return 'Sem zona livre para Profissionais.';
      if (d.target && a.target && !validTarget(s, seat, d.target, a.target)) return 'Alvo inválido.';
      for (const t of tribs) tribute(s, t);
      p.hand.splice(hi, 1);
      const zone = p.pros.findIndex((x) => !x);
      p.pros[zone] = newProSlot(c, a.position, s.turn);
      p.summonedThisTurn = true;
      log(s, 'summon', `${p.name} invocou "${d.name}" em ${a.position === 'atk' ? 'Ataque' : 'Defesa'}.`, { seat, cardId: d.id });
      fireBugs(s, opp, ['oppSummon'], { trigger: 'oppSummon', summoned: c.iid });
      if (findPro(s, c.iid) && s.winner === null) effectsOf(d.id)?.onSummon?.(ctxFor(s, c, a.target));
      return null;
    }

    case 'activate': {
      if (s.phase !== 'main') return 'Tasks só na Fase Principal.';
      if (p.shockedUntilTurn >= s.turn) return 'Você está Chocado e não pode ativar Tasks!';
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      if (hi < 0) return 'Card não está na sua mão.';
      const c = p.hand[hi];
      const d = card(c.cardId);
      if (d.kind !== 'task') return 'Esse card não é uma Task.';
      const fx = effectsOf(d.id);
      const ctx = ctxFor(s, c, a.target);
      const cant = fx?.canActivate?.(ctx);
      if (cant) return cant;
      if (d.target) {
        if (d.targetRequired && !validTarget(s, seat, d.target, a.target)) return 'Escolha um alvo válido.';
        if (a.target && !validTarget(s, seat, d.target, a.target)) return 'Alvo inválido.';
      }
      if (d.speed === 'continuous' && !p.spells.some((x) => !x)) return 'Sem zona livre para Tasks/Bugs.';
      p.hand.splice(hi, 1);
      log(s, 'task', `${p.name} ativou a Task "${d.name}".`, { seat, cardId: d.id });
      const ev = fireBugs(s, opp, ['oppTask'], { trigger: 'oppTask', task: c.iid });
      if (ev.negated) {
        toGrave(s, c);
        log(s, 'effect', `"${d.name}" foi anulada.`, { seat });
        return null;
      }
      if (d.speed === 'field') {
        if (p.field) {
          toGrave(s, p.field.card);
          log(s, 'info', `"${nameOf(p.field.card)}" saiu de campo.`, { seat });
        }
        p.field = { card: c, faceDown: false, revealed: true, setTurn: s.turn };
      } else if (d.speed === 'continuous') {
        p.spells[p.spells.findIndex((x) => !x)] = { card: c, faceDown: false, revealed: true, setTurn: s.turn };
      }
      fx?.onActivate?.(ctx);
      if (d.speed === 'normal' || !d.speed) toGrave(s, c);
      return null;
    }

    case 'set': {
      if (s.phase !== 'main') return 'Só dá para baixar cards na Fase Principal.';
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      if (hi < 0) return 'Card não está na sua mão.';
      const c = p.hand[hi];
      if (card(c.cardId).kind !== 'bug') return 'Só Bugs podem ser baixados virados.';
      const z = p.spells.findIndex((x) => !x);
      if (z < 0) return 'Sem zona livre para Tasks/Bugs.';
      p.hand.splice(hi, 1);
      p.spells[z] = { card: c, faceDown: true, revealed: false, setTurn: s.turn };
      log(s, 'info', `${p.name} baixou um Bug virado.`, { seat });
      return null;
    }

    case 'changePosition': {
      if (s.phase !== 'main') return 'Mude posições na Fase Principal.';
      const f = findPro(s, a.iid);
      if (!f || f.seat !== seat) return 'Profissional inválido.';
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
