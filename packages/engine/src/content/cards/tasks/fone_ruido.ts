import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'fone_ruido',
    name: 'Fone com Cancelamento de Ruído',
    kind: 'task',
    rarity: 'rara',
    speed: 'equip',
    target: 'ownPro',
    art: 'icon:🎧|#1b263b|#778da9',
    text: 'Equipamento: equipe 1 Profissional seu — ele ganha +600 DEF, e o dano de batalha envolvendo ele não dá Estresse a você.',
    flavor: 'Modo foco ativado. Reunião? Que reunião?',
  },
  effects: {
    equip: () => ({ def: 600 }),
    calmInBattle: () => true,
  },
});
