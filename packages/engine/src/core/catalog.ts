import type { CardEffects } from '../effects/types';
import type { CardDef, CardInstance, ProSlot } from './types';

/**
 * Porta do catálogo de cards: o kernel de regras só conhece esta interface.
 * O conteúdo (os cards do DEV-OH!) é instalado pelo index do pacote.
 */
export interface CardCatalog {
  list: readonly CardDef[];
  defs: Readonly<Record<string, CardDef>>;
  effects: Readonly<Record<string, CardEffects>>;
}

let installed: CardCatalog | null = null;

export function installCatalog(catalog: CardCatalog) {
  installed = catalog;
}

function catalog(): CardCatalog {
  if (!installed) throw new Error('Catálogo de cards não instalado.');
  return installed;
}

export function card(id: string): CardDef {
  const c = Object.hasOwn(catalog().defs, id) ? catalog().defs[id] : undefined;
  if (!c) throw new Error(`Card desconhecido: ${id}`);
  return c;
}

/** Card da coleção (pode ir no deck). Cards internos, como o oculto dos bots, ficam de fora. */
export const hasCard = (id: string) => catalog().list.some((c) => c.id === id);
export const cardList = () => catalog().list;
export const effectsOf = (id: string): CardEffects | undefined =>
  Object.hasOwn(catalog().effects, id) ? catalog().effects[id] : undefined;
export const nameOf = (c: CardInstance | string) => card(typeof c === 'string' ? c : c.cardId).name;

/** Nome de um Profissional em campo para o log: "Nome", ou "um Profissional virado" (sem vazar a identidade). */
export const proLabel = (slot: ProSlot) => (slot.faceDown ? 'um Profissional virado' : `"${nameOf(slot.card)}"`);
