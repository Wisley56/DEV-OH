import { boxFits, inspectImage, renderCardArt, type Box } from '@devoh/card-art';
import { scoreCard, validateCustomInput, type CustomCardInput } from '@devoh/engine';
import { MAX_CUSTOM_CARDS, type CustomCardRecord, type SaveCustomCardPayload } from '@devoh/protocol';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import type { UserRecord } from '../../accounts/application/ports.js';
import { ArtService } from './art.service.js';
import { CatalogService } from './catalog.service.js';
import { artKey, CARD_REPOSITORY, type CardRepository, type CustomCardRow } from './ports.js';

/**
 * Campos que mudam o jogo: travados depois da 1ª publicação, para um duelo em andamento nunca
 * trocar de regra no meio. Nome, linha de tipo, descrição, história e arte seguem editáveis.
 */
const GAMEPLAY_FIELDS = [
  'kind',
  'rarity',
  'unique',
  'tags',
  'attribute',
  'level',
  'atk',
  'def',
  'speed',
  'bugType',
  'trigger',
  'target',
  'effects',
] as const satisfies readonly (keyof CustomCardInput)[];

const gameplay = (input: CustomCardInput) => JSON.stringify(GAMEPLAY_FIELDS.map((k) => input[k] ?? null));

export const toRecord = (row: CustomCardRow): CustomCardRecord => ({ ...row, updatedAt: row.updatedAt.toISOString() });

const STALE = 'Outra edição salvou esta carta antes. Recarregue para ver a versão nova.';
const NOT_FOUND = 'Carta não encontrada.';

/** Criador de cartas do painel admin: rascunhos, publicação (com a tabela de balanceamento) e arte. */
@Injectable()
export class CardsAdminService {
  private readonly audit = new Logger('AdminAudit');

  constructor(
    @Inject(CARD_REPOSITORY) private readonly repo: CardRepository,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(ArtService) private readonly art: ArtService,
  ) {}

  async list(): Promise<CustomCardRecord[]> {
    return (await this.repo.list()).map(toRecord);
  }

  async get(id: string): Promise<CustomCardRecord> {
    return toRecord(await this.row(id));
  }

  async create(user: UserRecord, { input }: SaveCustomCardPayload): Promise<CustomCardRecord> {
    if ((await this.repo.count()) >= MAX_CUSTOM_CARDS) throw new DomainError(`No máximo ${MAX_CUSTOM_CARDS} cartas no painel.`);
    const row = await this.repo.insert(input, user.id);
    if (!row) throw new DomainError('Já existe uma carta com esse id.', 409);
    this.log('card-create', user, input.id);
    return toRecord(row);
  }

  async save(user: UserRecord, id: string, { input, version }: SaveCustomCardPayload): Promise<CustomCardRecord> {
    if (input.id !== id) throw new DomainError('O id da carta não muda.');
    if (version === undefined) throw new DomainError('Informe a versão que você editou.');
    const current = await this.row(id);
    const installed = current.status !== 'draft';
    if (current.serial !== null && gameplay(current.input) !== gameplay(input))
      throw new DomainError(
        'Depois de publicada, só nome, linha de tipo, descrição, história e arte mudam. Para mudar as regras, duplique a carta e aposente esta.',
      );
    if (installed) {
      const errors = validateCustomInput(input);
      if (errors.length) throw new DomainError(errors[0]!, 400, errors);
    }
    const row = await this.repo.update(id, { version }, { input }, user.id, true);
    if (!row) throw new DomainError(STALE, 409);
    if (installed) await this.catalog.reload();
    return toRecord(row);
  }

  /** Só rascunho que nunca foi publicado: o resto se aposenta (decks e duelos antigos ainda o desenham). */
  async remove(user: UserRecord, id: string) {
    const row = await this.row(id);
    if (row.serial !== null) throw new DomainError('Carta já publicada não se apaga: aposente-a.');
    await this.repo.delete(id);
    if (row.artVersion) await this.art.remove(artKey(id, row.artVersion));
    this.log('card-delete', user, id);
  }

  /** Publica um rascunho ou volta um aposentado à coleção. Precisa caber na tabela de balanceamento. */
  async publish(user: UserRecord, id: string): Promise<CustomCardRecord> {
    const current = await this.row(id);
    if (current.status === 'published') throw new DomainError('A carta já está publicada.');
    const problems = validateCustomInput(current.input);
    if (!problems.length) problems.push(...scoreCard(current.input, false).problems);
    if (!current.artVersion) problems.push('Envie a arte da carta antes de publicar.');
    if (problems.length) throw new DomainError(`Não dá para publicar: ${problems[0]}`, 422, problems);
    const serial = current.serial ?? (await this.repo.nextSerial());
    const row = await this.repo.update(id, { version: current.version }, { status: 'published', serial }, user.id, true);
    if (!row) throw new DomainError(STALE, 409);
    await this.catalog.reload();
    this.log(current.status === 'retired' ? 'card-restore' : 'card-publish', user, id);
    return toRecord(row);
  }

  /** Tira da coleção e dos decks novos; continua desenhável. */
  async retire(user: UserRecord, id: string): Promise<CustomCardRecord> {
    const current = await this.row(id);
    if (current.status !== 'published') throw new DomainError('Só carta publicada pode ser aposentada.');
    const row = await this.repo.update(id, { version: current.version }, { status: 'retired' }, user.id, true);
    if (!row) throw new DomainError(STALE, 409);
    await this.catalog.reload();
    this.log('card-retire', user, id);
    return toRecord(row);
  }

  /**
   * Recebe a imagem (PNG, JPEG ou WebP), recorta e grava o WebP 720×620 no armazenamento.
   * Grava antes no bucket e só então no banco; a versão anterior é apagada depois.
   */
  async uploadArt(user: UserRecord, id: string, body: Buffer, crop?: Box): Promise<CustomCardRecord> {
    const current = await this.row(id);
    let image: { width: number; height: number };
    try {
      image = await inspectImage(body);
    } catch {
      throw new DomainError('O arquivo não é uma imagem PNG, JPEG ou WebP válida (ou é grande demais).');
    }
    if (crop && !boxFits(crop, image.width, image.height)) throw new DomainError('O recorte sai da imagem.');
    const webp = await renderCardArt(body, crop).catch(() => {
      throw new DomainError('Não deu para processar essa imagem.');
    });
    const version = current.artVersion + 1;
    await this.art.write(artKey(id, version), webp);
    const row = await this.repo.update(
      id,
      { artVersion: current.artVersion },
      { artVersion: version, artBytes: webp.length },
      user.id,
      false,
    );
    if (!row) {
      await this.art.remove(artKey(id, version));
      throw new DomainError(STALE, 409);
    }
    if (current.artVersion) await this.art.remove(artKey(id, current.artVersion));
    if (row.status !== 'draft') await this.catalog.reload();
    this.log('card-art', user, id);
    return toRecord(row);
  }

  async deleteArt(user: UserRecord, id: string): Promise<CustomCardRecord> {
    const current = await this.row(id);
    if (current.status !== 'draft') throw new DomainError('Carta publicada precisa de arte: envie outra no lugar.');
    if (!current.artVersion) return toRecord(current);
    const row = await this.repo.update(id, { artVersion: current.artVersion }, { artVersion: 0, artBytes: 0 }, user.id, false);
    if (!row) throw new DomainError(STALE, 409);
    await this.art.remove(artKey(id, current.artVersion));
    return toRecord(row);
  }

  /** A arte atual de qualquer carta (inclusive rascunho), para o preview do painel. */
  async currentArt(id: string): Promise<Buffer | null> {
    const row = await this.row(id);
    return row.artVersion ? this.art.read(artKey(id, row.artVersion)) : null;
  }

  private async row(id: string) {
    const row = await this.repo.get(id);
    if (!row) throw new DomainError(NOT_FOUND, 404);
    return row;
  }

  private log(event: string, user: UserRecord, card: string) {
    this.audit.log({ event, card, by: user.username });
  }
}
