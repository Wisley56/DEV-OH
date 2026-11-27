import { newInstance, newProSlot, other } from '../core/board';
import { card, cardExists, nameOf } from '../core/catalog';
import { log, pname } from '../core/log';
import type { CardInstance, GameState, Seat } from '../core/types';
import { lose } from './win';
import { leaveField, toGrave } from './zones';

/**
 * As peças de uma fusão que o jogador tem (uma por peça), procuradas na mão e depois no
 * próprio campo (viradas ou não); null se faltar alguma.
 */
function piecesOwned(s: GameState, seat: Seat, fusionId: string): CardInstance[] | null {
  if (!cardExists(fusionId)) return null;
  const need = card(fusionId).fusionOf;
  if (!need?.length) return null;
  const p = s.players[seat];
  const pool = [...p.hand, ...p.pros.flatMap((x) => (x ? [x.card] : []))];
  const found: CardInstance[] = [];
  for (const id of need) {
    const c = pool.find((h) => h.cardId === id);
    if (!c) return null;
    found.push(c);
  }
  return found;
}

/** O card é peça de alguma fusão? (o descarte por limite de mão poupa as peças). */
export function isFusionPiece(cardId: string, fusionIds: readonly string[]): boolean {
  return fusionIds.some((f) => card(f).fusionOf?.includes(cardId));
}

/** Por que a fusão não pode ser feita agora (ou null se pode). */
export function fusionBlock(s: GameState, seat: Seat, fusionId: string): string | null {
  if (s.winner !== null) return 'O duelo já acabou.';
  if (s.active !== seat) return 'Não é o seu turno.';
  if (s.phase !== 'main') return 'A fusão só pode ser feita na Fase Principal.';
  if (!cardExists(fusionId) || !card(fusionId).fusionOf) return 'Fusão desconhecida.';
  if (!piecesOwned(s, seat, fusionId)) return `Faltam peças de "${nameOf(fusionId)}" na mão ou no campo.`;
  return null;
}

/**
 * Reúne as peças: elas saem da mão e do campo para o cemitério, a fusão entra no campo (se não
 * sobrar zona livre, vai direto para o cemitério) e o dono vence o duelo.
 */
export function fuse(s: GameState, seat: Seat, fusionId: string): string | null {
  const block = fusionBlock(s, seat, fusionId);
  if (block) return block;
  const p = s.players[seat];
  const pieces = piecesOwned(s, seat, fusionId)!;
  for (const c of pieces) {
    const hi = p.hand.indexOf(c);
    if (hi >= 0) {
      p.hand.splice(hi, 1);
      toGrave(s, c);
    } else leaveField(s, c.iid);
  }
  const fusion = newInstance(s, fusionId, seat);
  const zone = p.pros.findIndex((x) => !x);
  if (zone >= 0) p.pros[zone] = newProSlot(fusion, 'atk', s.turn);
  else p.grave.push(fusion);
  log(s, 'summon', `${p.name} reuniu ${pieces.map((c) => `"${nameOf(c)}"`).join(', ')} e invocou "${nameOf(fusionId)}"!`, {
    seat,
    cardId: fusionId,
    iid: fusion.iid,
    fx: 'fusion',
  });
  lose(
    s,
    other(seat),
    `${pname(s, other(seat))} não resistiu: o time de devs mais caótico da história da TI foi reunido. Produção caiu de vez.`,
    'fusion',
  );
  return null;
}
