import { defineCard, destroySpell, log, negatePro, proOnField, prosOf, randInt, setPosition, type EffectCtx } from '../../../effects/api';

/** Cards do oponente nas zonas de Task/Bug e de Campo. */
function oppCards(ctx: EffectCtx) {
  const p = ctx.s.players[ctx.opp];
  return [...p.spells, p.field].filter((x) => !!x);
}

export default defineCard({
  def: {
    id: 'mao_moises',
    name: 'A Mão do Moisés',
    kind: 'task',
    speed: 'normal',
    typeLine: 'Task / Tudo ou Nada',
    art: '/art/mao_moises.webp',
    text:
      'Tudo ou nada (8 ou 80)! Jogue um dado (+1 se "Moisés do Jiu-Jitsu" estiver no seu campo). ' +
      '4 ou mais: destrói todos os cards nas zonas de Task/Bug e de Campo do oponente. ' +
      'Menos: a mão acerta a sua squad — 1 Profissional seu vai para Defesa, fica com os efeitos anulados e não muda de posição até o fim do seu próximo turno.',
    flavor: 'Quando a mão desce, não sobra bug.',
  },
  effects: {
    canActivate: (ctx) => (oppCards(ctx).length ? null : 'O oponente não tem cards nas zonas de Task/Bug nem de Campo.'),
    onActivate(ctx) {
      const s = ctx.s;
      const bonus = proOnField(s, ctx.me, 'moises') ? 1 : 0;
      const roll = randInt(s, 6) + 1;
      const ok = roll + bonus >= 4;
      log(
        s,
        'coin',
        `🎲 Dado: ${roll}${bonus ? ' (+1 do Moisés)' : ''}. ${ok ? 'A Mão do Moisés derrubou tudo!' : 'A mão pegou a própria squad!'}`,
        {
          seat: ctx.me,
          cardId: 'mao_moises',
          roll: { face: roll, bonus, ok },
        },
      );
      if (ok) {
        for (const x of oppCards(ctx)) destroySpell(s, x.card.iid);
        return;
      }
      const mine = prosOf(s, ctx.me);
      if (!mine.length) return;
      const hit = mine[randInt(s, mine.length)];
      setPosition(s, hit.card.iid, 'def');
      hit.lockedUntilTurn = s.turn + 2;
      negatePro(s, hit.card.iid, s.turn + 2);
    },
  },
});
