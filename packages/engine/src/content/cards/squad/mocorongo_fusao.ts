import type { CardDef } from '../../../core/types';
import { MOCORONGO_PIECES } from './mocorongo_piece';

/**
 * Devs Mocorongos: fusão das 5 peças. Card interno (fora da coleção e dos decks): só entra em
 * campo pela ação `fusion`, que vence o duelo.
 */
export const MOCORONGO_FUSION: CardDef = {
  id: 'mocorongo_fusao',
  name: 'Devs Mocorongos',
  kind: 'pro',
  rarity: 'secreta',
  typeLine: 'Humano / Fusão',
  attribute: 'TREVA',
  level: 10,
  atk: 0,
  def: 0,
  atkLabel: '????',
  defLabel: '????',
  unique: true,
  tags: ['fusao'],
  fusionOf: [...MOCORONGO_PIECES],
  art: '/art/mocorongo_fusao.webp',
  text:
    'Não vai no deck. Reúna "Thy Mocorongo", "Wisley Mocorongo", "Douglas Mocorongo", "Danilo Mocorongo" e ' +
    '"Vitor Mocorongo EAD" entre a sua mão e o seu campo e, na sua Fase Principal, envie os 5 ao cemitério para invocá-lo: você vence o duelo. ' +
    'Nenhum oponente resiste ao time mais caótico da história da TI.',
  flavor: '"Só Deus sabe por que funciona. Deploy em prod."',
};
