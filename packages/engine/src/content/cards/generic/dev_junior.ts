import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'dev_junior',
    name: 'Dev Júnior',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / Dev',
    attribute: 'LUZ',
    level: 3,
    atk: 1500,
    def: 1100,
    art: '/art/dev_junior.webp',
    text: 'Primeiro emprego, 14 abas do Stack Overflow abertas e uma vontade enorme de mostrar serviço. Ainda acha que "funciona na minha máquina" é argumento.',
  },
});
