import { defineCard, getAtk, heal, log, proLabel, prosOf, setPosition } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'paquito',
    name: 'Paquito Erótico',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'Humano / Cantor',
    attribute: 'FOGO',
    level: 3,
    atk: 1100,
    def: 800,
    unique: true,
    art: '/art/paquito.webp',
    text: 'Prepara o coração…: ao ser invocado, o Profissional em Ataque mais forte do oponente vai para Defesa, encantado (não muda de posição no próximo turno), e você recupera 500 LP.',
    flavor: '♪ Prepara o coração… ♪',
  },
  effects: {
    onSummon(ctx) {
      const targets = prosOf(ctx.s, ctx.opp).filter((p) => p.position === 'atk');
      if (targets.length) {
        targets.sort((a, b) => getAtk(ctx.s, ctx.opp, b) - getAtk(ctx.s, ctx.opp, a));
        const t = targets[0];
        log(ctx.s, 'effect', `♪ Prepara o coração… ♪ ${proLabel(t)} ficou encantado.`, { seat: ctx.me, cardId: 'paquito' });
        setPosition(ctx.s, t.card.iid, 'def');
        t.lockedUntilTurn = ctx.s.turn + 1;
      }
      heal(ctx.s, ctx.me, 500);
    },
  },
});
