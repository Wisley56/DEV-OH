import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { ART_STORAGE, type ArtStorage } from './ports.js';

/** Quantas artes ficam em memória (cada WebP 720×620 tem uns 30–100 KB). */
const CACHE_ENTRIES = 200;

/**
 * Leitura e escrita da arte no armazenamento, com cache LRU em memória: a mesma arte
 * não vai ao bucket a cada pedido e as já servidas seguem saindo se o bucket cair.
 */
@Injectable()
export class ArtService {
  private readonly logger = new Logger('Art');
  private readonly cache = new Map<string, Buffer>();

  constructor(@Inject(ART_STORAGE) private readonly storage: ArtStorage) {}

  async read(key: string): Promise<Buffer | null> {
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    let body: Buffer | null;
    try {
      body = await this.storage.get(key);
    } catch (err) {
      this.logger.error({ event: 'art-storage-down', op: 'get', error: String(err) });
      throw new DomainError('A arte está indisponível agora. Tente de novo daqui a pouco.', 503);
    }
    if (body) this.remember(key, body);
    return body;
  }

  async write(key: string, body: Buffer) {
    try {
      await this.storage.put(key, body);
    } catch (err) {
      this.logger.error({ event: 'art-storage-down', op: 'put', error: String(err) });
      throw new DomainError('Não deu para guardar a arte agora (armazenamento fora do ar). Tente de novo.', 503);
    }
    this.remember(key, body);
  }

  /** Apaga sem falhar: uma arte velha esquecida no bucket não quebra nada. */
  async remove(key: string) {
    this.cache.delete(key);
    try {
      await this.storage.delete(key);
    } catch (err) {
      this.logger.warn({ event: 'art-orphan', key, error: String(err) });
    }
  }

  private remember(key: string, body: Buffer) {
    this.cache.set(key, body);
    if (this.cache.size > CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value!);
  }
}
