import { card, defineCard, nameOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'ceo',
    name: 'CEO',
    kind: 'pro',
    rarity: 'secreta',
    typeLine: 'Humano / CEO',
    attribute: 'LUZ',
    level: 9,
    atk: 2400,
    def: 2800,
    unique: true,
    art: '/art/ceo.webp',
    text:
      'Palavras de poder: enquanto o CEO está em campo, os outros Profissionais seus ficam em Alerta e não podem ser destruídos por efeitos do oponente. ' +
      'Comandar: ganha +100 ATK para cada Profissional nos seus Desligados.',
    flavor: '"Resultados globais, metas de alta escala."',
  },
  effects: {
    atkBonus: (q) => 100 * q.s.players[q.seat].grave.filter((c) => card(c.cardId).kind === 'pro').length,
    protectAllyFromOppEffects: (_ctx, victim) =>
      `CEO: "Ninguém sai da empresa hoje." — "${nameOf(victim.card)}" ficou em Alerta e não foi destruído.`,
  },
});
