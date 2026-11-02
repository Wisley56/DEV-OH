import type { CustomCatalog } from '@devoh/protocol';
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../../../common/domain-error.js';
import { Throttle } from '../../../common/security/throttle.js';
import { ArtService } from '../application/art.service.js';
import { CatalogService } from '../application/catalog.service.js';
import { artKey } from '../application/ports.js';

/** Cards do painel para o jogo (qualquer visitante: a coleção e os duelos precisam deles). */
@Controller('cards')
export class CardsController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(ArtService) private readonly art: ArtService,
  ) {}

  /** Publicados e aposentados. A ETag é a revisão: sem mudança, 304 sem corpo. */
  @Get('custom')
  @Throttle('cards')
  custom(@Req() req: Request, @Res() res: Response) {
    const snapshot: CustomCatalog = this.catalog.snapshot();
    const etag = `"${snapshot.revision}"`;
    res.set({ etag, 'cache-control': 'no-cache' });
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    return res.json(snapshot);
  }

  /** WebP da carta. Com `v` da versão atual, o navegador guarda para sempre (cada upload muda o `v`). */
  @Get(':id/art')
  @Throttle('cards')
  async artOf(@Param('id') id: string, @Query('v') v: string | undefined, @Res() res: Response) {
    const card = this.catalog.find(id);
    if (!card) throw new DomainError('Carta não encontrada.', 404);
    const body = await this.art.read(artKey(id, card.artVersion));
    if (!body) throw new DomainError('Arte não encontrada.', 404);
    const current = v === String(card.artVersion);
    res.set({
      'content-type': 'image/webp',
      'cache-control': current ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    return res.send(body);
  }
}
