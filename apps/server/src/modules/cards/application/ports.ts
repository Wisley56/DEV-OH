import type { CustomCardInput, CustomStatus } from '@devoh/engine';

/** Linha de `custom_cards`. */
export interface CustomCardRow {
  id: string;
  status: CustomStatus;
  input: CustomCardInput;
  serial: number | null;
  version: number;
  artVersion: number;
  artBytes: number;
  updatedAt: Date;
}

export type CardPatch = Partial<Pick<CustomCardRow, 'status' | 'input' | 'serial' | 'artVersion' | 'artBytes'>>;

export interface CardRepository {
  list(): Promise<CustomCardRow[]>;
  /** Publicados e aposentados: o que o jogo instala no catálogo. */
  listInstalled(): Promise<CustomCardRow[]>;
  get(id: string): Promise<CustomCardRow | null>;
  count(): Promise<number>;
  /** null se o id já existe. */
  insert(input: CustomCardInput, userId: string): Promise<CustomCardRow | null>;
  /**
   * Aplica `patch` só se a linha ainda bate com `guard` (versão e/ou versão da arte que o
   * chamador leu); `bump` sobe a versão. null = alguém mudou antes (ou a linha sumiu).
   */
  update(
    id: string,
    guard: { version?: number; artVersion?: number },
    patch: CardPatch,
    userId: string,
    bump: boolean,
  ): Promise<CustomCardRow | null>;
  nextSerial(): Promise<number>;
  delete(id: string): Promise<boolean>;
}

/** Onde mora a arte (bucket do Railway em produção). Chaves: `cards/<id>/v<N>.webp`. */
export interface ArtStorage {
  put(key: string, body: Buffer): Promise<void>;
  /** null se não existe. Lança se o armazenamento está fora do ar. */
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export const CARD_REPOSITORY = Symbol('CardRepository');
export const ART_STORAGE = Symbol('ArtStorage');

export const artKey = (id: string, version: number) => `cards/${id}/v${version}.webp`;
