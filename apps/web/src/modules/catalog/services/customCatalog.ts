import { installCustomCards, type PublishedCustomCard } from '@devoh/engine';
import type { CustomCatalog } from '@devoh/protocol';
import { api } from '../../../shared/lib/api';

/**
 * Cards criados no painel admin: baixados do servidor e instalados no engine deste navegador.
 * O `revision` é o mesmo do servidor; o RoomState traz o dele, e diferente = baixar de novo.
 * A resposta tem ETag: sem mudança, o navegador revalida com 304 e reaproveita o cache.
 */

let current: CustomCatalog = { revision: '', cards: [] };
let pending: Promise<void> | null = null;

/** Publicados e aposentados instalados agora (o simulador manda estes para o worker). */
export const customCards = (): readonly PublishedCustomCard[] => current.cards;

export const customRevision = () => current.revision;

/** Baixa e instala. Nunca rejeita: sem servidor, o jogo segue só com os cards em código. */
export function loadCustomCards(): Promise<void> {
  pending ??= api<CustomCatalog>('/cards/custom')
    .then((next) => {
      current = next;
      installCustomCards(next.cards);
    })
    .catch(() => undefined)
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Espera o catálogo por no máximo `ms`: a primeira tela não fica presa num servidor lento. */
export function loadCustomCardsWithin(ms: number): Promise<void> {
  return Promise.race([loadCustomCards(), new Promise<void>((r) => setTimeout(r, ms))]);
}

/** O servidor está em outra revisão: recarrega em segundo plano. */
export function ensureCatalogRevision(revision: string | undefined) {
  if (revision && revision !== current.revision) void loadCustomCards();
}
