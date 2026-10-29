import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'juju_serio',
    name: 'Juju Sério',
    kind: 'task',
    speed: 'continuous',
    typeLine: 'Task / Contínua',
    art: '/art/juju_serio.webp',
    text: 'Enquanto estiver virada para cima: os Profissionais do oponente em Defesa perdem 800 DEF, e "Juju" no seu campo ganha foco total (+500 ATK).',
    flavor: 'O olhar por cima dos óculos já resolve metade dos problemas.',
  },
  effects: {
    oppAura: (q) => (q.slot.position === 'def' ? { def: -800 } : {}),
    auraAtk: (q) => (q.def.id === 'juju' ? 500 : 0),
  },
});
