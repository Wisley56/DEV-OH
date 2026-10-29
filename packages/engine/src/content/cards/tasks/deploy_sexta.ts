import { damage, defineCard, destroyPro, destroySpell, log, prosOf, rand } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'deploy_sexta',
    name: 'Deploy na Sexta-Feira',
    kind: 'task',
    rarity: 'super',
    speed: 'normal',
    typeLine: 'Alto Risco',
    art: 'icon:🚀|#03071e|#dc2f02',
    text: 'Cara ou coroa. Cara: causa 3000 de dano ao oponente. Coroa: destrói todos os cards do seu campo.',
    flavor: 'O que pode dar errado às 17h50?',
  },
  effects: {
    onActivate(ctx) {
      const s = ctx.s;
      const ok = rand(s) < 0.5;
      log(s, 'coin', ok ? '🪙 CARA! O deploy de sexta passou liso!' : '🪙 COROA! O deploy de sexta derrubou tudo!', {
        seat: ctx.me,
        cardId: 'deploy_sexta',
      });
      if (ok) {
        damage(s, ctx.opp, 3000, 'Deploy na Sexta-Feira');
        return;
      }
      const p = s.players[ctx.me];
      for (const pro of prosOf(s, ctx.me)) destroyPro(s, pro.card.iid, { battle: false, self: true });
      for (const sp of [...p.spells, p.field]) if (sp) destroySpell(s, sp.card.iid);
    },
  },
});
