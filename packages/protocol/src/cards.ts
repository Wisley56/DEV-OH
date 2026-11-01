import type { CustomCardInput, CustomStatus, PublishedCustomCard } from '@devoh/engine';

/** Contrato HTTP dos cards criados no painel admin (`/api/cards/*` e `/api/admin/cards/*`). */

/** Teto de cards do painel (rascunhos + publicados + aposentados). */
export const MAX_CUSTOM_CARDS = 300;

/**
 * GET /api/cards/custom: o que o jogo precisa para conhecer os cards do painel. `revision`
 * muda a cada publicação; o `RoomState` traz a do servidor para o cliente se atualizar.
 */
export interface CustomCatalog {
  revision: string;
  cards: PublishedCustomCard[];
}

/** Um card do painel como o admin vê. */
export interface CustomCardRecord {
  id: string;
  status: CustomStatus;
  input: CustomCardInput;
  /** Ordem de publicação (código DVOH-X01); null enquanto nunca publicado. */
  serial: number | null;
  /** Trava otimista: o PUT manda a versão que leu; outra edição no meio dá 409. */
  version: number;
  /** 0 = sem arte. Sobe a cada upload. */
  artVersion: number;
  artBytes: number;
  updatedAt: string;
}

/** POST /api/admin/cards (cria) e PUT /api/admin/cards/:id (salva, com `version`). */
export interface SaveCustomCardPayload {
  input: CustomCardInput;
  version?: number;
}

/** Caixa de recorte do upload de arte (pixels da imagem enviada), na query do PUT …/art. */
export interface ArtCropQuery {
  left: number;
  top: number;
  width: number;
  height: number;
}
