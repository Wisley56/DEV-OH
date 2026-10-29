import { defineCard, findPro, isOnce, log, markOnce, prosOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'thy_techlead',
    name: 'Thy Gonzaguinha (Tech Lead)',
    kind: 'pro',
    rarity: 'secreta',
    typeLine: 'Humano / Tech Lead',
    attribute: 'TECH',
    level: 8,
    atk: 2800,
    def: 2400,
    unique: true,
    tags: ['thy'],
    art: '/art/thy_techlead.webp',
    text:
      'Politicagem: ganha +300 ATK para cada outro Profissional seu no campo. ' +
      'LÁ ELE! (1x por turno): quando for alvo de ataque, o ataque é anulado e a bucha vai pra outro departamento.',
    flavor: '"Refatoração holística e sincronização de escopo."',
  },
  effects: {
    atkBonus: (q) => 300 * (prosOf(q.s, q.seat).length - 1),
    onTargeted(ctx) {
      const f = findPro(ctx.s, ctx.self.iid);
      if (!f || isOnce(f.slot.oncePerTurn, 'laele', ctx.s.turn)) return false;
      markOnce(f.slot.oncePerTurn, 'laele', ctx.s.turn);
      log(ctx.s, 'effect', 'Thy: "LÁ ELE!" — repassou a bucha para outro departamento. Ataque anulado.', {
        seat: ctx.me,
        cardId: 'thy_techlead',
      });
      return true;
    },
  },
});
