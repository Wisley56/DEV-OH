import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { applyAction, createGame, getView, STARTER_DECKS, type GameState, type Seat } from '@devoh/engine';
import { botAction, type BotLevel } from './index';

/**
 * Teste de paridade: partidas bot×bot com seed fixa precisam produzir
 * exatamente o mesmo histórico de ações e de log. Protege refatorações do
 * engine contra mudanças de comportamento sem querer.
 * Para regravar (só quando a mudança de regra for intencional): vitest -u
 */
function play(seed: number, levels: [BotLevel, BotLevel]) {
  const d0 = STARTER_DECKS[seed % 3];
  const d1 = STARTER_DECKS[(seed + 1) % 3];
  let s: GameState = createGame({
    players: [
      { name: 'A', deck: d0.cards },
      { name: 'B', deck: d1.cards },
    ],
    seed,
    first: (seed % 2) as Seat,
  });
  const hash = createHash('sha256');
  let lastLog = 0;
  let steps = 0;
  const feedLog = () => {
    for (const l of s.log) if (l.id > lastLog) hash.update(`${l.id}|${l.kind}|${l.seat ?? ''}|${l.text}\n`);
    lastLog = s.log.at(-1)?.id ?? lastLog;
  };
  feedLog();
  for (; s.winner === null && steps < 3000; steps++) {
    const a = botAction(s, s.active, levels[s.active]);
    hash.update(`${s.active}>${JSON.stringify(a)}\n`);
    const r = applyAction(s, s.active, a);
    if (!r.ok) throw new Error(`seed ${seed}: ação ilegal ${JSON.stringify(a)}: ${r.error}`);
    s = r.state;
    feedLog();
  }
  hash.update(JSON.stringify([getView(s, 0), getView(s, 1)]));
  return `${seed} ${levels.join('/')} winner=${s.winner} turn=${s.turn} lp=${s.players[0].lp}/${s.players[1].lp} steps=${steps} ${hash.digest('hex').slice(0, 16)}`;
}

describe('golden de paridade', () => {
  it('partidas com seed fixa são idênticas', async () => {
    const lines: string[] = [];
    for (let seed = 1; seed <= 40; seed++) lines.push(play(seed, ['normal', 'normal']));
    for (let seed = 101; seed <= 110; seed++) lines.push(play(seed, seed % 2 ? ['hard', 'normal'] : ['normal', 'hard']));
    await expect(lines.join('\n') + '\n').toMatchFileSnapshot('./__golden__/games.txt');
  }, 120_000);
});
