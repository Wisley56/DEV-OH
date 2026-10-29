import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'teclado_rgb',
    name: 'Teclado Mecânico RGB',
    kind: 'task',
    rarity: 'comum',
    speed: 'equip',
    target: 'ownPro',
    art: 'icon:⌨️|#240046|#ff4ecd',
    text: 'Equipamento: equipe 1 Profissional seu — ele ganha +500 ATK. Se ele sair do campo, este card vai junto.',
    flavor: 'Clack clack clack. O RGB dá +30% de produtividade (fonte: confia).',
  },
  effects: {
    equip: () => ({ atk: 500 }),
  },
});
