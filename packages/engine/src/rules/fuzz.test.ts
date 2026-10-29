import { describe, expect, it } from 'vitest';
import { applyAction, CARD_LIST, createGame, getView, maxCopies, validateDeck } from '../index';
import { ZONES } from '../core/constants';
import type { Action, GameState, Seat } from '../core/types';

/**
 * Fuzz: jogadas aleatórias (válidas, inválidas e de quem não está na vez) com
 * decks aleatórios. O engine nunca pode lançar exceção, alterar o estado
 * recebido nem quebrar invariantes — no servidor, isso seria um crash por payload.
 */
function prng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomDeck(rand: () => number) {
  const pool = CARD_LIST.flatMap((c) => Array<string>(maxCopies(c.id)).fill(c.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 20 + Math.floor(rand() * 11));
}

/** Todos os iids do estado (mãos, campo, cemitério, deck) + lixo. */
function iids(s: GameState) {
  const out = ['', 'x', '999999', 'c1', '__proto__'];
  for (const p of s.players) {
    for (const c of [...p.hand, ...p.grave, ...p.deck]) out.push(c.iid);
    for (const z of [...p.pros, ...p.spells, p.field]) if (z) out.push(z.card.iid);
  }
  return out;
}

function randomAction(s: GameState, rand: () => number): Action {
  const ids = iids(s);
  const pick = () => ids[Math.floor(rand() * ids.length)];
  const maybe = () => (rand() < 0.5 ? pick() : undefined);
  const pos = rand() < 0.5 ? 'atk' : 'def';
  // Zona: ausente, válida ou inválida.
  const zone = rand() < 0.5 ? undefined : Math.floor(rand() * 5) - 1;
  switch (Math.floor(rand() * 9)) {
    case 0:
      return { type: 'summon', iid: pick(), position: pos, tributes: rand() < 0.5 ? [pick(), pick()] : undefined, target: maybe(), zone };
    case 1:
      return { type: 'activate', iid: pick(), target: maybe(), zone };
    case 2:
      return { type: 'set', iid: pick(), zone };
    case 3:
      return { type: 'changePosition', iid: pick() };
    case 4:
      return { type: 'ignition', iid: pick(), target: maybe() };
    case 5:
      return { type: 'goBattle' };
    case 6:
      return { type: 'attack', iid: pick(), target: maybe() };
    case 7:
      return { type: 'endTurn' };
    default:
      // Desistência rara, para as partidas durarem.
      return rand() < 0.02 ? { type: 'surrender' } : { type: 'endTurn' };
  }
}

function checkInvariants(s: GameState) {
  const seen = new Set<string>();
  for (const p of s.players) {
    expect(Number.isFinite(p.lp)).toBe(true);
    expect(p.stress).toBeGreaterThanOrEqual(0);
    expect(p.stress).toBeLessThanOrEqual(10);
    expect(p.pros).toHaveLength(ZONES);
    expect(p.spells).toHaveLength(ZONES);
    const cards = [...p.hand, ...p.grave, ...p.deck, ...[...p.pros, ...p.spells, p.field].flatMap((z) => (z ? [z.card] : []))];
    for (const c of cards) {
      expect(seen.has(c.iid), `iid ${c.iid} em dois lugares`).toBe(false);
      seen.add(c.iid);
    }
  }
  getView(s, 0);
  getView(s, 1);
}

describe('fuzz do engine', () => {
  it('aguenta milhares de jogadas aleatórias sem exceção nem corrupção', () => {
    let applied = 0;
    for (let g = 0; g < 40; g++) {
      const rand = prng(1000 + g);
      const decks = [randomDeck(rand), randomDeck(rand)];
      decks.forEach((d) => expect(validateDeck(d)).toEqual([]));
      let s = createGame({
        players: [
          { name: 'A', deck: decks[0] },
          { name: 'B', deck: decks[1] },
        ],
        seed: g,
        first: (g % 2) as Seat,
      });
      for (let step = 0; step < 400 && s.winner === null; step++) {
        const seat: Seat = rand() < 0.85 ? s.active : ((1 - s.active) as Seat);
        const action = randomAction(s, rand);
        const before = JSON.stringify(s);
        const r = applyAction(s, seat, action);
        expect(JSON.stringify(s), 'applyAction alterou o estado recebido').toBe(before);
        if (!r.ok) {
          expect(typeof r.error).toBe('string');
          continue;
        }
        applied++;
        s = r.state;
        checkInvariants(s);
      }
    }
    expect(applied).toBeGreaterThan(1000);
    // Leva ~2 s sozinho; com os outros pacotes rodando em paralelo, mais.
  }, 60_000);
});
