import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'arquiteta',
    name: 'Arquiteta de Software',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'Humano / Arquiteta',
    attribute: 'AGUA',
    level: 6,
    atk: 2600,
    def: 1900,
    art: '/art/arquiteta.webp',
    text: 'Desenhou os microsserviços num guardanapo e acertou de primeira. Responde toda pergunta com "depende" — e sempre depende mesmo.',
  },
});
