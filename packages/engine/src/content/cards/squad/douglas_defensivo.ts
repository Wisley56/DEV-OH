import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'douglas_defensivo',
    name: 'Douglas (Modo Defensivo)',
    kind: 'pro',
    typeLine: 'Humano / Dev Full Stack / Efeito',
    attribute: 'TERRA',
    level: 7,
    atk: 0,
    def: 2800,
    unique: true,
    tags: ['douglas'],
    art: '/art/douglas_defensivo.webp',
    text:
      'SOCORRO! SOCORRO!: não pode ser destruído em batalha nem por efeitos do oponente — saiu da call e fechou o Slack. ' +
      'Ao mudar para Ataque vira "Douglas (Modo de Ataque)".',
    flavor: '"É só um botão, faz em 5 minutos?"',
  },
  effects: {
    saveFromBattle: () => 'Douglas: "SOCORRO!" — não foi destruído.',
    immuneToOppEffects: () => 'Douglas (Modo Defensivo): "SOCORRO! SOCORRO!" — saiu da call e ficou imune.',
    onPositionChange: (_ctx, to) => (to === 'atk' ? 'douglas_ataque' : undefined),
  },
});
