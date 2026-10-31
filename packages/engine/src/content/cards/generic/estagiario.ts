import { addStress, defineCard, getAtk, getDef, log, proLabel, prosOf, setPosition } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'estagiario',
    name: 'Estagiário Entusiasmado',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / Estagiário',
    attribute: 'LUZ',
    level: 2,
    atk: 900,
    def: 500,
    art: '/art/estagiario.webp',
    text:
      'Trouxe café pra todo mundo: ao ser invocado, seu Estresse −1. ' +
      'FLIP — Pegou a task errada: o Profissional em Ataque mais forte do oponente vai para Defesa (sem nenhum em Ataque, o de maior DEF vai para Ataque).',
    flavor: '"Posso pegar uma task?"',
  },
  effects: {
    onSummon(ctx) {
      addStress(ctx.s, ctx.me, -1);
    },
    onFlip(ctx) {
      const theirs = prosOf(ctx.s, ctx.opp).filter((p) => !p.faceDown);
      const atk = theirs.filter((p) => p.position === 'atk').sort((a, b) => getAtk(ctx.s, ctx.opp, b) - getAtk(ctx.s, ctx.opp, a))[0];
      const t = atk ?? theirs.sort((a, b) => getDef(ctx.s, ctx.opp, b) - getDef(ctx.s, ctx.opp, a))[0];
      if (!t) return;
      log(ctx.s, 'effect', `Estagiário pegou a task errada: ${proLabel(t)} trocou de posição.`, { seat: ctx.me, cardId: 'estagiario' });
      setPosition(ctx.s, t.card.iid, t.position === 'atk' ? 'def' : 'atk');
    },
  },
});
