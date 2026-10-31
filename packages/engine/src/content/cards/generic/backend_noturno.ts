import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'backend_noturno',
    name: 'Dev Back-end Noturno',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / Dev',
    attribute: 'TREVA',
    level: 4,
    atk: 1800,
    def: 1000,
    art: '/art/backend_noturno.webp',
    text: 'Só rende depois das 23h, movido a energético e lo-fi. Ninguém nunca viu a câmera dele ligada.',
  },
});
