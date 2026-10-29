import { card, hasCard } from '../core/catalog';
import { DECK_MAX, DECK_MIN, MAX_COPIES } from '../core/constants';

/** Cópias permitidas de um card no deck: pessoa da squad 1, demais até MAX_COPIES. */
export const maxCopies = (cardId: string) => (card(cardId).unique ? 1 : MAX_COPIES);

/** Retorna lista de problemas; vazia = deck válido. */
export function validateDeck(cards: string[]): string[] {
  const errors: string[] = [];
  if (cards.length < DECK_MIN) errors.push(`O deck precisa de pelo menos ${DECK_MIN} cards (tem ${cards.length}).`);
  if (cards.length > DECK_MAX) errors.push(`O deck pode ter no máximo ${DECK_MAX} cards (tem ${cards.length}).`);
  const counts = new Map<string, number>();
  for (const id of cards) {
    if (!hasCard(id)) {
      errors.push(`Card desconhecido: ${id}`);
      continue;
    }
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    const max = maxCopies(id);
    if (n > max) errors.push(`"${card(id).name}": máximo ${max} cópia(s).`);
  }
  return errors;
}
