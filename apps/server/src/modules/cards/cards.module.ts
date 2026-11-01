import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.js';
import { ArtService } from './application/art.service.js';
import { CardsAdminService } from './application/cards-admin.service.js';
import { CatalogService } from './application/catalog.service.js';
import { ART_STORAGE, CARD_REPOSITORY } from './application/ports.js';
import { createArtStorage } from './infrastructure/art-storages.js';
import { DrizzleCardRepository } from './infrastructure/drizzle-card.repository.js';
import { AdminCardsController } from './presentation/admin-cards.controller.js';
import { CardsController } from './presentation/cards.controller.js';

/** Cards criados no painel admin: banco, arte no bucket e o catálogo instalado no engine. */
@Module({
  controllers: [CardsController, AdminCardsController],
  providers: [
    CatalogService,
    CardsAdminService,
    ArtService,
    { provide: CARD_REPOSITORY, useClass: DrizzleCardRepository },
    { provide: ART_STORAGE, inject: [AppConfig], useFactory: (config: AppConfig) => createArtStorage(config.artStorage) },
  ],
  exports: [CatalogService, ART_STORAGE],
})
export class CardsModule {}
