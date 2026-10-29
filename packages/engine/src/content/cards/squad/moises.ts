import { addStress, defineCard, destroyPro, findPro, log, setPosition } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'moises',
    name: 'Moisés do Jiu-Jitsu',
    kind: 'pro',
    rarity: 'super',
    typeLine: 'Humano / Lutador',
    attribute: 'TERRA',
    level: 5,
    atk: 2000,
    def: 1700,
    unique: true,
    tags: ['careca'],
    art: '/art/moises.webp',
    text:
      'Finalização: se for destruído em batalha, aplica um mata-leão e destrói o Profissional que o destruiu. ' +
      'Cochilo (1x por turno): reduza seu Estresse em 2; este card vai para Defesa.',
    flavor: '"ZZZZZ… Eu não tô suportando mais…"',
    ignition: { label: 'Cochilo' },
  },
  effects: {
    canIgnite: (ctx) => (ctx.s.players[ctx.me].stress > 0 ? null : 'Sem Estresse, sem cochilo.'),
    onIgnite(ctx) {
      log(ctx.s, 'effect', 'Moisés: "ZZZZ… eu não tô suportando mais…" — tirou um cochilo.', { seat: ctx.me, cardId: 'moises' });
      addStress(ctx.s, ctx.me, -2);
      setPosition(ctx.s, ctx.self.iid, 'def');
    },
    onDestroyed(ctx, info) {
      if (!info.battle || !info.byIid) return;
      if (!findPro(ctx.s, info.byIid)) return;
      log(ctx.s, 'effect', 'Moisés aplicou um mata-leão na saída: finalização!', { seat: ctx.me, cardId: 'moises' });
      destroyPro(ctx.s, info.byIid, { battle: false, bySeat: ctx.me });
    },
  },
});
