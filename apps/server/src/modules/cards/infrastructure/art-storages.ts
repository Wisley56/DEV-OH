import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ArtStorageConfig } from '../../../config/app-config.js';
import type { ArtStorage } from '../application/ports.js';

/** Storage Bucket do Railway (API do S3). O bucket é privado: a arte sai pela rota do servidor. */
export class S3ArtStorage implements ArtStorage {
  private readonly client: S3Client;

  constructor(private readonly config: Extract<ArtStorageConfig, { kind: 's3' }>) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer) {
    await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: 'image/webp' }));
  }

  async get(key: string) {
    try {
      const out = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return out.Body ? Buffer.from(await out.Body.transformToByteArray()) : null;
    } catch (err) {
      if (err instanceof NoSuchKey) return null;
      throw err;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }
}

/** Pasta local (dev sem bucket). A chave nunca sai da pasta. */
export class FsArtStorage implements ArtStorage {
  private readonly root: string;

  constructor(dir: string) {
    this.root = resolve(dir);
  }

  private path(key: string) {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep)) throw new Error('Chave de arte inválida.');
    return p;
  }

  async put(key: string, body: Buffer) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
  }

  async get(key: string) {
    try {
      return await readFile(this.path(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }
}

/** Em memória (testes). `down` simula o bucket fora do ar. */
export class MemoryArtStorage implements ArtStorage {
  readonly files = new Map<string, Buffer>();
  down = false;

  private check() {
    if (this.down) throw new Error('armazenamento fora do ar');
  }

  async put(key: string, body: Buffer) {
    this.check();
    this.files.set(key, body);
  }

  async get(key: string) {
    this.check();
    return this.files.get(key) ?? null;
  }

  async delete(key: string) {
    this.check();
    this.files.delete(key);
  }
}

export function createArtStorage(config: ArtStorageConfig): ArtStorage {
  if (config.kind === 's3') return new S3ArtStorage(config);
  if (config.kind === 'fs') return new FsArtStorage(config.dir);
  return new MemoryArtStorage();
}
