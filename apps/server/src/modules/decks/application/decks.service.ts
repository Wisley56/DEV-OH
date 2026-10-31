import { validateDeck } from '@devoh/engine';
import { MAX_DECKS, type DeckPayload } from '@devoh/protocol';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';

export interface DeckRepository {
  list(userId: string): Promise<DeckPayload[]>;
  count(userId: string): Promise<number>;
  exists(userId: string, id: string): Promise<boolean>;
  /** Cria ou substitui o deck `id` da conta. */
  upsert(userId: string, deck: DeckPayload): Promise<void>;
  /** Insere os que ainda não existem (mesmo id fica como está); retorna quantos entraram. */
  insertMissing(userId: string, decks: DeckPayload[]): Promise<number>;
  delete(userId: string, id: string): Promise<boolean>;
}

export const DECK_REPOSITORY = Symbol('DeckRepository');

/** Decks de cada conta: só o dono vê e mexe; os cards passam pela mesma regra do engine. */
@Injectable()
export class DecksService {
  constructor(@Inject(DECK_REPOSITORY) private readonly repo: DeckRepository) {}

  list(userId: string) {
    return this.repo.list(userId);
  }

  async save(userId: string, deck: DeckPayload) {
    this.check(deck);
    if (!(await this.repo.exists(userId, deck.id)) && (await this.repo.count(userId)) >= MAX_DECKS) {
      throw new DomainError(`No máximo ${MAX_DECKS} decks por conta. Apague um para criar outro.`);
    }
    await this.repo.upsert(userId, deck);
  }

  async remove(userId: string, id: string) {
    if (!(await this.repo.delete(userId, id))) throw new DomainError('Deck não encontrado.', 404);
  }

  /** Importação dos decks que estavam no navegador (1º login): ignora os inválidos e o que passar do teto. */
  async import(userId: string, decks: DeckPayload[]): Promise<{ imported: number }> {
    const room = MAX_DECKS - (await this.repo.count(userId));
    const valid = decks.filter((d) => !validateDeck(d.cards).length).slice(0, Math.max(0, room));
    return { imported: valid.length ? await this.repo.insertMissing(userId, valid) : 0 };
  }

  private check(deck: DeckPayload) {
    const err = validateDeck(deck.cards)[0];
    if (err) throw new DomainError(err);
  }
}
