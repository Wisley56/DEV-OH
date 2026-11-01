import { createHash } from 'node:crypto';
import { installCustomCards, type PublishedCustomCard } from '@devoh/engine';
import type { CustomCatalog } from '@devoh/protocol';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CARD_REPOSITORY, type CardRepository, type CustomCardRow } from './ports.js';

/**
 * Catálogo de cards do painel em memória: instalado no engine ao subir (antes do `listen`) e
 * a cada publicação. Premissa: uma réplica só do servidor (veja DEVELOPER.md).
 */
@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger('Catalog');
  private catalog: CustomCatalog = { revision: revisionOf([]), cards: [] };

  constructor(@Inject(CARD_REPOSITORY) private readonly repo: CardRepository) {}

  async onModuleInit() {
    await this.reload();
  }

  get revision() {
    return this.catalog.revision;
  }

  /** O que GET /api/cards/custom devolve. */
  snapshot(): CustomCatalog {
    return this.catalog;
  }

  /** Card instalado (publicado ou aposentado), ou undefined. */
  find(id: string): PublishedCustomCard | undefined {
    return this.catalog.cards.find((c) => c.input.id === id);
  }

  /** Relê do banco e reinstala no engine. */
  async reload() {
    const cards = (await this.repo.listInstalled()).map(toPublished);
    const { rejected } = installCustomCards(cards);
    for (const r of rejected) this.logger.warn({ event: 'card-rejected', card: r.id, reason: r.reason });
    const installed = cards.filter((c) => !rejected.some((r) => r.id === c.input.id));
    this.catalog = { revision: revisionOf(installed), cards: installed };
  }
}

const toPublished = (row: CustomCardRow): PublishedCustomCard => ({
  input: row.input,
  serial: row.serial ?? 0,
  artVersion: row.artVersion,
  status: row.status === 'retired' ? 'retired' : 'published',
});

const revisionOf = (cards: PublishedCustomCard[]) => createHash('sha256').update(JSON.stringify(cards)).digest('base64url').slice(0, 16);
