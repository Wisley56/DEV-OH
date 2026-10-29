import { addStress, card, defineCard, log, prosOf, setPosition } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'sandro',
    name: 'Sandro Ilusionista',
    kind: 'pro',
    rarity: 'super',
    typeLine: 'Humano / Ilusionista',
    attribute: 'TREVA',
    level: 4,
    atk: 1500,
    def: 1200,
    unique: true,
    art: '/art/sandro.webp',
    text:
      'Sênior Ultra Experiente: ao ser invocado, cria a ilusão de 20+ anos de senioridade — todos os Profissionais do oponente vão para Defesa. ' +
      'Em contrapartida, seu Estresse +4. Desgaste: no início de cada turno seu, seus outros Profissionais de maior nível perdem 100 ATK.',
    flavor: 'Senioridade máxima… ou só uma ilusão?',
  },
  effects: {
    onSummon(ctx) {
      const targets = prosOf(ctx.s, ctx.opp).filter((p) => p.position === 'atk');
      log(ctx.s, 'effect', 'Sandro: "Sênior Ultra Experiente!" — o oponente se encolheu na Defesa.', { seat: ctx.me, cardId: 'sandro' });
      for (const p of targets) setPosition(ctx.s, p.card.iid, 'def');
      addStress(ctx.s, ctx.me, 4);
    },
    onStandby(ctx) {
      const others = prosOf(ctx.s, ctx.me).filter((p) => p.card.iid !== ctx.self.iid);
      if (!others.length) return;
      const top = Math.max(...others.map((p) => card(p.card.cardId).level ?? 0));
      const tired = others.filter((p) => (card(p.card.cardId).level ?? 0) === top);
      for (const p of tired) p.atkMod -= 100;
      log(ctx.s, 'effect', 'Desgaste da ilusão: os mais experientes perderam 100 ATK.', { seat: ctx.me, cardId: 'sandro' });
    },
  },
});
