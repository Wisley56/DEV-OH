import { findPro, other } from '../core/board';
import { card, effectsOf, nameOf } from '../core/catalog';
import { log } from '../core/log';
import type { BugTrigger, CardInstance, GameState, Seat } from '../core/types';
import { fireBugs } from '../effects/bugs';
import { ctxFor } from '../effects/context';
import { validTarget } from './targets';
import { toGrave } from './zones';

/**
 * Resolve uma Task que já saiu da mão ou da zona: o oponente pode anulá-la com Bugs (oppTask),
 * Equipamento sem equipado vai para o cemitério e Contínua/Equipamento ficam na zona `zone` (ausente = a primeira livre).
 */
export function resolveTask(s: GameState, seat: Seat, c: CardInstance, target: string | undefined, zone?: number) {
  const p = s.players[seat];
  const d = card(c.cardId);
  log(s, 'task', `${p.name} ativou a Task "${d.name}".`, { seat, cardId: d.id, iid: c.iid });
  const ev = fireBugs(s, other(seat), ['oppTask'], { trigger: 'oppTask', task: c.iid });
  if (ev.negated) {
    toGrave(s, c);
    log(s, 'effect', `"${d.name}" foi anulada.`, { seat });
    return;
  }
  const equip = d.speed === 'equip';
  if (equip && !findPro(s, target)) {
    toGrave(s, c);
    log(s, 'effect', `"${d.name}" ficou sem quem equipar.`, { seat });
    return;
  }
  const stays = d.speed === 'continuous' || equip;
  if (d.speed === 'field') {
    if (p.field) {
      toGrave(s, p.field.card);
      log(s, 'info', `"${nameOf(p.field.card)}" saiu de campo.`, { seat });
    }
    p.field = { card: c, faceDown: false, revealed: true, setTurn: s.turn };
  } else if (stays) {
    p.spells[zone ?? p.spells.findIndex((x) => !x)] = {
      card: c,
      faceDown: false,
      revealed: true,
      setTurn: s.turn,
      ...(equip && { equippedTo: target }),
    };
  }
  effectsOf(d.id)?.onActivate?.(ctxFor(s, c, target));
  if (!stays && d.speed !== 'field') toGrave(s, c);
}

/**
 * Task baixada com gatilho (`trigger`, ex.: Moisés Bombado) dispara sozinha como um Bug,
 * mirando `target` (o Profissional atacado). Só uma por evento; não no turno em que foi baixada.
 */
export function fireSetTasks(s: GameState, seat: Seat, trigger: BugTrigger, target: string) {
  const p = s.players[seat];
  if (s.winner !== null || p.shockedUntilTurn >= s.turn) return;
  const i = p.spells.findIndex((x) => {
    if (!x?.faceDown || x.setTurn === s.turn) return false;
    const d = card(x.card.cardId);
    if (d.kind !== 'task' || d.trigger !== trigger) return false;
    if (d.target && !validTarget(s, seat, d.target, target)) return false;
    return !effectsOf(d.id)?.canActivate?.(ctxFor(s, x.card, target));
  });
  if (i < 0) return;
  const c = p.spells[i]!.card;
  p.spells[i] = null;
  resolveTask(s, seat, c, target, i);
}
