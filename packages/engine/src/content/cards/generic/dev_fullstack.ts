import { defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'dev_fullstack',
    name: 'Dev Fullstack',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / Dev',
    attribute: 'TECH',
    level: 4,
    atk: 1900,
    def: 1300,
    art: '/art/dev_fullstack.webp',
    text: 'Faz o front, o back, o banco, o deploy e ainda arruma a impressora. Ninguém sabe quando ele dorme — nem ele.',
  },
});
