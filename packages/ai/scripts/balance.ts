/**
 * Balanceamento pelo terminal: bots jogando entre si e relatório em Markdown.
 * (No web, o painel admin em /admin/balanceamento roda a mesma simulação com gráficos.)
 *
 *   npm run balance                       # decks iniciais, 40 partidas por confronto, normal × normal
 *   npm run balance -- --games 100        # mais partidas (mais lento, menos ruído)
 *   npm run balance -- --random           # + decks gerados, para testar todos os cards do catálogo
 *   npm run balance -- --random-only      # só decks gerados
 *   npm run balance -- --min-games 100    # decks gerados: cada card em pelo menos 100 partidas (padrão 60)
 *   npm run balance -- --hard             # inclui o bot difícil (hard × normal), bem mais lento
 *   npm run balance -- --seed 7           # outras seeds (padrão 0)
 *   npm run balance -- --out docs/balance/latest.md
 *   npm run balance -- --json balance.json   # relatório para importar no painel admin
 *
 * Roda direto do código-fonte (condição "source" dos pacotes), sem precisar de build.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_CONFIG, reportsToMarkdown, runBalance, type BalanceConfig, type BalanceMode } from '../src/balance';
import type { BotLevel } from '../src/index';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const num = (name: string, fallback: number) => {
  const v = Number(opt(name) ?? fallback);
  if (!Number.isFinite(v) || v < 0) throw new Error(`--${name} precisa ser um número >= 0`);
  return Math.floor(v);
};

const mode: BalanceMode = flag('random-only') ? 'random' : flag('random') ? 'both' : 'starters';
const base: Omit<BalanceConfig, 'levels'> = {
  mode,
  gamesPerMatchup: num('games', DEFAULT_CONFIG.gamesPerMatchup),
  minGamesPerCard: num('min-games', DEFAULT_CONFIG.minGamesPerCard),
  seed: num('seed', DEFAULT_CONFIG.seed),
};

const write = (file: string, content: string) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

const started = Date.now();
const runs: [BotLevel, BotLevel][] = [['normal', 'normal']];
if (flag('hard')) runs.push(['hard', 'normal']);
const reports = runs.map((levels) => runBalance({ ...base, levels }));
const markdown = reportsToMarkdown(reports);
console.log(markdown);
console.error(`(${((Date.now() - started) / 1000).toFixed(1)} s)`);

const out = opt('out');
if (out) write(out, markdown);
const json = opt('json');
// Um relatório por arquivo: com --hard, o segundo vai para <nome>.hard.json.
if (json) reports.forEach((r, i) => write(i ? json.replace(/(\.json)?$/, '.hard.json') : json, JSON.stringify(r, null, 2)));
