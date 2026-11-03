import type { GameState, Seat } from '../../../core/types';
import { card, defineCard } from '../../../effects/api';

/** +200 ATK por card de IA, até +800 (o teto segura o espelho de decks de IA). */
const PER_CARD = 200;
const MAX_BONUS = 800;

const isIa = (cardId: string) => !!card(cardId).tags?.includes('ia');

/** Cards de IA virados para cima em campo e nos Desligados de um jogador (virado para baixo não conta: não revela nada). */
function iaCount(s: GameState, seat: Seat) {
  const p = s.players[seat];
  const onField = [
    ...p.pros.filter((x) => x && !x.faceDown),
    ...p.spells.filter((x) => x && !x.faceDown),
    ...(p.field ? [p.field] : []),
  ].filter((x) => isIa(x!.card.cardId)).length;
  return onField + p.grave.filter((c) => isIa(c.cardId)).length;
}

export default defineCard({
  def: {
    id: 'wisley_ia',
    name: 'Wisley, o Empresário de IA',
    kind: 'pro',
    rarity: 'super',
    typeLine: 'Humano / Empresário',
    attribute: 'TREVA',
    level: 4,
    atk: 1600,
    def: 1400,
    unique: true,
    art: '/art/wisley_ia.webp',
    text: 'Automatizar: ganha +200 ATK para cada Profissional ou Task de IA em campo (virado para cima) ou nos Desligados, dos dois lados (máximo +800).',
    flavor: 'Sua foto de perfil do LinkedIn e do GitHub é tão gerada por IA que os seus adversários ficam confusos.',
  },
  effects: {
    atkBonus: (q) => Math.min(MAX_BONUS, PER_CARD * (iaCount(q.s, 0) + iaCount(q.s, 1))),
  },
});
