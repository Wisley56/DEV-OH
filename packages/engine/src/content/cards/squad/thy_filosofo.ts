import { addStress, defineCard, findPro, log } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'thy_filosofo',
    name: 'Thy Gonzaguinha (O Filósofo do Prazo)',
    kind: 'pro',
    rarity: 'super',
    typeLine: 'Humano / Tech Lead',
    attribute: 'AGUA',
    level: 6,
    atk: 1800,
    def: 2600,
    unique: true,
    tags: ['thy'],
    art: '/art/thy_filosofo.webp',
    text:
      'Reflexão Enrolativa (1x por turno): mão na boca, cara de preocupação — reduza seu Estresse em 2. ' +
      'Sumiço de Sexta-Feira: em Defesa, não pode ser destruído em batalha.',
    flavor: '"É a entropia sistêmica do back-end."',
    ignition: { label: 'Reflexão Enrolativa' },
  },
  effects: {
    canIgnite: (ctx) => (ctx.s.players[ctx.me].stress > 0 ? null : 'Seu Estresse já está zerado.'),
    onIgnite(ctx) {
      log(ctx.s, 'effect', 'Thy colocou a mão na boca, pensativo… o PO achou que era estratégia.', {
        seat: ctx.me,
        cardId: 'thy_filosofo',
      });
      addStress(ctx.s, ctx.me, -2);
    },
    saveFromBattle: (ctx) =>
      findPro(ctx.s, ctx.self.iid)?.slot.position === 'def' ? 'Thy sumiu na sexta-feira: não foi destruído.' : null,
  },
});
