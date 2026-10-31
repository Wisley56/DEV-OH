import { card, defineCard, draw, log, nameOf, randInt } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'stackoverflow',
    name: 'Stack Overflow Ancestral',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'Ferramenta / Ancestral',
    attribute: 'TREVA',
    level: 4,
    atk: 1000,
    def: 2100,
    art: '/art/stackoverflow.webp',
    text: 'Pergunta duplicada: ao ser invocado, adicione 1 Task aleatória dos seus Desligados à mão. FLIP — Resposta aceita: compre 1 card.',
    flavor: 'Marked as duplicate. Closed.',
  },
  effects: {
    onFlip(ctx) {
      log(ctx.s, 'effect', 'Stack Overflow: resposta aceita ✔', { seat: ctx.me, cardId: 'stackoverflow' });
      draw(ctx.s, ctx.me, 1);
    },
    onSummon(ctx) {
      const p = ctx.s.players[ctx.me];
      const tasks = p.grave.map((c, i) => ({ c, i })).filter(({ c }) => card(c.cardId).kind === 'task');
      if (!tasks.length) {
        log(ctx.s, 'effect', 'Stack Overflow: nenhuma resposta encontrada.', { seat: ctx.me });
        return;
      }
      const pick = tasks[randInt(ctx.s, tasks.length)];
      p.grave.splice(pick.i, 1);
      p.hand.push(pick.c);
      log(ctx.s, 'effect', `Stack Overflow ressuscitou "${nameOf(pick.c)}" para a mão.`, { seat: ctx.me, cardId: pick.c.cardId });
    },
  },
});
