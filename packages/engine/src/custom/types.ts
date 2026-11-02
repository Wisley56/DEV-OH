import type { Attribute, BugTrigger, BugType, CardKind, Rarity, TargetKind, TaskSpeed } from '../core/types';
import type { EffectPart } from '../dsl/types';

/** Todo card criado no painel admin tem id com este prefixo; nenhum card em código usa. */
export const CUSTOM_PREFIX = 'x_';

export type CustomStatus = 'draft' | 'published' | 'retired';

/**
 * O que o admin edita no criador de cartas. A arte não entra aqui: vem do upload, pelo
 * `artVersion` do registro. O texto de efeito é sempre gerado dos blocos (dsl/describe).
 */
export interface CustomCardInput {
  id: string;
  name: string;
  kind: CardKind;
  rarity: Rarity;
  typeLine?: string;
  /** Descrição de um Profissional Normal (sem efeito). */
  lore?: string;
  /** A história cômica (itálico na carta). */
  flavor?: string;
  unique?: boolean;
  tags?: string[];
  attribute?: Attribute;
  level?: number;
  atk?: number;
  def?: number;
  speed?: TaskSpeed;
  bugType?: BugType;
  trigger?: BugTrigger;
  /** O alvo que o jogador escolhe ao ativar (Task, Equipamento ou efeito ativável). */
  target?: TargetKind;
  effects?: EffectPart[];
}

/** Card do painel que o jogo conhece: publicado (na coleção) ou aposentado (só desenha). */
export interface PublishedCustomCard {
  input: CustomCardInput;
  /** Ordem de publicação, fixa: vira o código DVOH-X01. */
  serial: number;
  artVersion: number;
  status: Exclude<CustomStatus, 'draft'>;
}

export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX);

export const customCode = (serial: number) => `DVOH-X${String(serial).padStart(2, '0')}`;

/** A arte é servida pelo servidor; `v` muda a cada upload, então o cache pode ser imutável. */
export const customArtUrl = (id: string, version: number) => `/api/cards/${encodeURIComponent(id)}/art?v=${version}`;
