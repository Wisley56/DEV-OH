import type { CardEffects } from '../effects/types';
import type { CardDef, CardInstance, ProSlot } from './types';

/**
 * Porta do catálogo de cards: o kernel de regras só conhece esta interface.
 * O conteúdo (os cards do DEV-OH!) é instalado pelo index do pacote.
 */
export interface CardCatalog {
  /** Cards da coleção (podem ir no deck), na ordem da coleção. */
  list: readonly CardDef[];
  /** Todo card que o jogo sabe desenhar: a coleção mais os internos e os aposentados. */
  defs: Readonly<Record<string, CardDef>>;
  effects: Readonly<Record<string, CardEffects>>;
  /** Código de coleção fixo de um card (os criados no painel); os outros seguem a ordem da lista. */
  codes?: Readonly<Record<string, string>>;
}

let installed: CardCatalog | null = null;
let inList = new Set<string>();
let revision = 0;
const listeners = new Set<() => void>();

/** Instala (ou troca) o catálogo. Quem desenha a coleção é avisado pela assinatura. */
export function installCatalog(catalog: CardCatalog) {
  installed = catalog;
  inList = new Set(catalog.list.map((c) => c.id));
  revision++;
  for (const fn of listeners) fn();
}

/** Muda a cada catálogo instalado: serve de dependência para memos e caches da interface. */
export const catalogRevision = () => revision;

export function subscribeCatalog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
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

/** Card da coleção (pode ir no deck). Cards internos, como o oculto dos bots, e os aposentados ficam de fora. */
export const hasCard = (id: string) => (catalog(), inList.has(id));
/** O jogo sabe desenhar o card (mesmo fora da coleção). */
export const cardExists = (id: string) => Object.hasOwn(catalog().defs, id);
export const cardList = () => catalog().list;
export const codeOf = (id: string): string | undefined => {
  const codes = catalog().codes;
  return codes && Object.hasOwn(codes, id) ? codes[id] : undefined;
};
export const effectsOf = (id: string): CardEffects | undefined =>
  Object.hasOwn(catalog().effects, id) ? catalog().effects[id] : undefined;
export const nameOf = (c: CardInstance | string) => card(typeof c === 'string' ? c : c.cardId).name;

/** Nome de um Profissional em campo para o log: "Nome", ou "um Profissional virado" (sem vazar a identidade). */
export const proLabel = (slot: ProSlot) => (slot.faceDown ? 'um Profissional virado' : `"${nameOf(slot.card)}"`);
