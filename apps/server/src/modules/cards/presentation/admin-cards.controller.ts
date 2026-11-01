import { MAX_UPLOAD_BYTES, type Box } from '@devoh/card-art';
import type { CustomCardRecord, SaveCustomCardPayload } from '@devoh/protocol';
import { ArtCropSchema, SaveCustomCardSchema } from '@devoh/protocol/schemas';
import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../../../common/domain-error.js';
import { Throttle } from '../../../common/security/throttle.js';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import type { UserRecord } from '../../accounts/application/ports.js';
import { AdminOnly } from '../../accounts/presentation/admin.guard.js';
import { CurrentUser } from '../../accounts/presentation/auth.guard.js';
import { CardsAdminService } from '../application/cards-admin.service.js';

/** Tipos aceitos no upload (o formato real ainda é conferido pelos bytes). */
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream']);
const TOO_BIG = `A imagem passa de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`;

/** Criador de cartas. Toda rota exige conta admin (o AdminGuard roda antes de ler qualquer corpo). */
@Controller('admin/cards')
@AdminOnly()
export class AdminCardsController {
  constructor(@Inject(CardsAdminService) private readonly cards: CardsAdminService) {}

  @Get()
  @Header('cache-control', 'no-store')
  @Throttle('admin')
  list(): Promise<CustomCardRecord[]> {
    return this.cards.list();
  }

  @Post()
  @Throttle('admin')
  create(@CurrentUser() user: UserRecord, @Body(new ZodValidationPipe(SaveCustomCardSchema)) body: SaveCustomCardPayload) {
    return this.cards.create(user, body);
  }

  @Get(':id')
  @Header('cache-control', 'no-store')
  @Throttle('admin')
  get(@Param('id') id: string) {
    return this.cards.get(id);
  }

  @Put(':id')
  @Throttle('admin')
  save(
    @CurrentUser() user: UserRecord,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SaveCustomCardSchema)) body: SaveCustomCardPayload,
  ) {
    return this.cards.save(user, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @Throttle('admin')
  async remove(@CurrentUser() user: UserRecord, @Param('id') id: string) {
    await this.cards.remove(user, id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Throttle('admin')
  publish(@CurrentUser() user: UserRecord, @Param('id') id: string) {
    return this.cards.publish(user, id);
  }

  @Post(':id/retire')
  @HttpCode(200)
  @Throttle('admin')
  retire(@CurrentUser() user: UserRecord, @Param('id') id: string) {
    return this.cards.retire(user, id);
  }

  /** Volta um aposentado para a coleção (passa pela mesma checagem do publicar). */
  @Post(':id/restore')
  @HttpCode(200)
  @Throttle('admin')
  restore(@CurrentUser() user: UserRecord, @Param('id') id: string) {
    return this.cards.publish(user, id);
  }

  /** Arte atual, inclusive de rascunho (o público só vê a de carta publicada). */
  @Get(':id/art')
  @Throttle('admin')
  async art(@Param('id') id: string, @Res() res: Response) {
    const body = await this.cards.currentArt(id);
    if (!body) throw new DomainError('Esta carta ainda não tem arte.', 404);
    res.set({ 'content-type': 'image/webp', 'cache-control': 'private, no-store' });
    return res.send(body);
  }

  /**
   * Upload da arte: o corpo é a imagem crua (até 8 MB); o recorte vai na query
   * (`left`, `top`, `width`, `height`, em pixels da imagem). Sem recorte, a imagem inteira.
   */
  @Put(':id/art')
  @Throttle('upload')
  async uploadArt(@CurrentUser() user: UserRecord, @Param('id') id: string, @Query() query: Record<string, unknown>, @Req() req: Request) {
    const type = (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
    if (!IMAGE_TYPES.has(type)) throw new DomainError('Envie uma imagem PNG, JPEG ou WebP.', 415);
    const crop = parseCrop(query);
    const body = await readBody(req, MAX_UPLOAD_BYTES);
    return this.cards.uploadArt(user, id, body, crop);
  }

  @Delete(':id/art')
  @Throttle('admin')
  deleteArt(@CurrentUser() user: UserRecord, @Param('id') id: string) {
    return this.cards.deleteArt(user, id);
  }
}

function parseCrop(query: Record<string, unknown>): Box | undefined {
  const keys = ['left', 'top', 'width', 'height'] as const;
  if (!keys.some((k) => query[k] !== undefined)) return undefined;
  const r = ArtCropSchema.safeParse(Object.fromEntries(keys.map((k) => [k, query[k]])));
  if (!r.success || !r.data) throw new DomainError('Recorte inválido.');
  return r.data;
}

/** Lê o corpo cru com teto: pelo Content-Length antes de ler, e contando os bytes durante. */
async function readBody(req: Request, max: number): Promise<Buffer> {
  if (Number(req.headers['content-length'] ?? 0) > max) throw new DomainError(TOO_BIG, 413);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > max) throw new DomainError(TOO_BIG, 413);
    chunks.push(chunk);
  }
  if (!size) throw new DomainError('Envie a imagem no corpo do pedido.');
  return Buffer.concat(chunks);
}
