import { defineCard, findPro, isOnce, log, markOnce, nameOf, setCardsOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'kelly',
    name: 'Kelly (CUIDADO…)',
    kind: 'pro',
    typeLine: 'Guerreiro / Sentinela / Efeito',
    attribute: 'LUZ',
    level: 4,
    atk: 1400,
    def: 1900,
    unique: true,
    art: '/art/kelly.webp',
    text:
      'CUIDADO…: ao ser invocada, revela todos os cards virados do oponente. ' +
      '1x por turno: quando um Profissional do oponente declara ataque, o ataque é negado.',
    flavor: 'Ela já viu esse filme antes.',
  },
  effects: {
    onSummon(ctx) {
      const sets = setCardsOf(ctx.s, ctx.opp);
      for (const x of sets) x.revealed = true;
      log(
        ctx.s,
        'effect',
        sets.length
          ? `Kelly: "CUIDADO…" — revelou: ${sets.map((x) => `"${nameOf(x.card)}"`).join(', ')}.`
          : 'Kelly: "CUIDADO…" — mas o oponente não tinha nada escondido.',
        { seat: ctx.me, cardId: 'kelly' },
      );
    },
    guardAttack(ctx) {
      const f = findPro(ctx.s, ctx.self.iid);
      if (!f || isOnce(f.slot.oncePerTurn, 'cuidado', ctx.s.turn)) return false;
      markOnce(f.slot.oncePerTurn, 'cuidado', ctx.s.turn);
      log(ctx.s, 'effect', 'Kelly: "CUIDADO…" — o ataque foi negado.', { seat: ctx.me, cardId: 'kelly' });
      return true;
    },
  },
});
