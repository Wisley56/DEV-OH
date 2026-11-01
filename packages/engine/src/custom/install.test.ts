import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BASE_CARD_LIST,
  card,
  cardExists,
  cardInfo,
  cardList,
  catalogRevision,
  installCustomCards,
  maxCopies,
  setCode,
  STARTER_DECKS,
  subscribeCatalog,
  validateCustomInput,
  validateDeck,
  type CustomCardInput,
  type PublishedCustomCard,
} from '../index';

const pro = (over: Partial<CustomCardInput> = {}): CustomCardInput => ({
  id: 'x_estagiario',
  name: 'Estagiário Curioso',
  kind: 'pro',
  rarity: 'comum',
  typeLine: 'Humano / Estagiário',
  attribute: 'LUZ',
  level: 3,
  atk: 1200,
  def: 1000,
  lore: 'Pergunta tudo no canal geral.',
  flavor: '"Isso é bug ou feature?"',
  ...over,
});

const record = (input: CustomCardInput, serial: number, over: Partial<PublishedCustomCard> = {}): PublishedCustomCard => ({
  input,
  serial,
  artVersion: 1,
  status: 'published',
  ...over,
});

/** Um deck inicial com uma carta a menos: somado ao card testado, fica válido. */
const filler = STARTER_DECKS[0].cards.slice(1);

afterEach(() => {
  installCustomCards([]);
});

describe('cards do painel no catálogo', () => {
  it('publicado entra na coleção depois dos cards em código, com código DVOH-X', () => {
    const r = installCustomCards([record(pro(), 1)]);
    expect(r).toEqual({ installed: ['x_estagiario'], rejected: [] });
    expect(cardList()).toHaveLength(BASE_CARD_LIST.length + 1);
    expect(cardList().at(-1)?.id).toBe('x_estagiario');
    expect(setCode('x_estagiario')).toBe('DVOH-X01');
    expect(card('x_estagiario')).toMatchObject({
      text: 'Pergunta tudo no canal geral.',
      art: '/api/cards/x_estagiario/art?v=1',
      atk: 1200,
    });
    expect(cardInfo('x_estagiario')).toMatchObject({ frame: 'normal', typeLine: 'Humano / Estagiário / Normal' });
    expect(maxCopies('x_estagiario')).toBe(3);
    expect(validateDeck([...filler, 'x_estagiario'])).toEqual([]);
  });

  it('os códigos dos cards em código não mudam', () => {
    installCustomCards([record(pro(), 1)]);
    expect(setCode(BASE_CARD_LIST[0].id)).toBe('DVOH-001');
    expect(setCode('moises_bombado')).toBe('DVOH-056');
  });

  it('aposentado continua desenhável, mas sai da coleção e dos decks', () => {
    installCustomCards([record(pro(), 1, { status: 'retired' })]);
    expect(cardExists('x_estagiario')).toBe(true);
    expect(cardList().some((c) => c.id === 'x_estagiario')).toBe(false);
    expect(validateDeck([...filler, 'x_estagiario'])).toContain('"Estagiário Curioso" foi aposentado e não pode mais entrar em decks.');
  });

  it('reinstalar troca o conjunto inteiro (idempotente)', () => {
    installCustomCards([record(pro(), 1)]);
    installCustomCards([record(pro({ id: 'x_outro', name: 'Outro' }), 2)]);
    expect(cardExists('x_estagiario')).toBe(false);
    expect(setCode('x_outro')).toBe('DVOH-X02');
    installCustomCards([]);
    expect(cardList()).toEqual(BASE_CARD_LIST);
    expect(validateDeck(['x_outro'])).toContain('Card desconhecido: x_outro');
  });

  it('a ordem da coleção segue o serial, não a ordem recebida', () => {
    installCustomCards([record(pro({ id: 'x_segundo', name: 'Segundo' }), 2), record(pro({ id: 'x_primeiro', name: 'Primeiro' }), 1)]);
    expect(
      cardList()
        .slice(-2)
        .map((c) => c.id),
    ).toEqual(['x_primeiro', 'x_segundo']);
  });

  it('registro inválido fica de fora sem lançar', () => {
    const r = installCustomCards([
      record(pro(), 1),
      record(pro({ id: 'qa', name: 'Clone do QA' }), 2),
      record(pro({ name: 'Repetido' }), 3),
      record(pro({ id: 'x_serial', name: 'Serial repetido' }), 1),
      record(pro({ id: 'x_sem_arte', name: 'Sem arte' }), 4, { artVersion: 0 }),
      record(pro({ id: 'x_forte', name: 'Forte', atk: 3333 }), 5),
      record(pro({ id: 'x_status', name: 'Status' }), 6, { status: 'draft' as never }),
      null as never,
    ]);
    expect(r.installed).toEqual(['x_estagiario']);
    expect(r.rejected.map((x) => x.id)).toEqual(['?', 'x_serial', 'qa', 'x_estagiario', 'x_sem_arte', 'x_forte', 'x_status']);
    expect(card('qa').name).not.toBe('Clone do QA');
  });

  it('avisa quem assina e muda a revisão', () => {
    const fn = vi.fn();
    const off = subscribeCatalog(fn);
    const before = catalogRevision();
    installCustomCards([record(pro(), 1)]);
    off();
    installCustomCards([]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(catalogRevision()).toBe(before + 2);
  });
});

describe('validateCustomInput', () => {
  it('aceita um Profissional, uma Task e um Bug bem formados', () => {
    expect(validateCustomInput(pro())).toEqual([]);
    expect(validateCustomInput({ id: 'x_cafe_duplo', name: 'Café Duplo', kind: 'task', rarity: 'rara', speed: 'equip' })).toEqual([]);
    expect(
      validateCustomInput({ id: 'x_flaky', name: 'Teste Flaky', kind: 'bug', rarity: 'comum', trigger: 'oppAttack', bugType: 'normal' }),
    ).toEqual([]);
  });

  it('aponta os problemas em pt-BR', () => {
    expect(validateCustomInput(pro({ id: 'estagiario' }))[0]).toMatch(/x_/);
    expect(validateCustomInput(pro({ level: 11 }))).toContain('O nível vai de 1 a 10.');
    expect(validateCustomInput(pro({ atk: 1234 }))).toContain('ATK e DEF vão de 0 a 3000, de 50 em 50.');
    expect(validateCustomInput(pro({ typeLine: 'Humano / Efeito' }))[0]).toMatch(/Normal, Efeito ou FLIP/);
    expect(validateCustomInput(pro({ attribute: undefined }))).toContain('Escolha o atributo do Profissional.');
    expect(validateCustomInput({ id: 'x_bug', name: 'Bug', kind: 'bug', rarity: 'comum' })).toContain('Escolha quando o Bug dispara.');
    expect(validateCustomInput({ id: 'x_task', name: 'Task', kind: 'task', rarity: 'comum', atk: 100 })).toContain(
      'Só Profissional tem nível, ATK, DEF e atributo.',
    );
    expect(
      validateCustomInput({ id: 'x_campo', name: 'Campo', kind: 'task', rarity: 'comum', speed: 'field', trigger: 'oppSummon' }),
    ).toContain('Esta Task não pode ter gatilho.');
    expect(validateCustomInput(null as never)).toEqual(['Card inválido.']);
  });
});
