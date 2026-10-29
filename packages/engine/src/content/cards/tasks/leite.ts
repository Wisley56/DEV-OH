import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'leite',
    name: 'Estoque de Leite',
    kind: 'task',
    rarity: 'rara',
    speed: 'continuous',
    art: 'icon:🥛|#5e6472|#e9ecef',
    text: 'Fica no campo. O ATK base de "Danilo (DEV Raiz)" dobra. Seus Profissionais TERRA ganham +300 ATK.',
  },
  effects: {
    auraAtk: (q) => (q.def.attribute === 'TERRA' ? 300 : 0),
  },
});
