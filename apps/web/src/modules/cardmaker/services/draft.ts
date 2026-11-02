import {
  BASE_CARD_LIST,
  cardFrame,
  compileEffects,
  customCode,
  fullTypeLine,
  isFlip,
  subtypeLabel,
  toCardDef,
  type CardDef,
  type CardKind,
  type CustomCardInput,
  type TaskSpeed,
} from '@devoh/engine';

/** Rascunho do criador: o que vai para o servidor, mais o que só a tela usa. */

/** Arte ainda não enviada: o preview mostra um aviso no lugar. */
export const NO_ART = 'icon:🖼️|#1a2350|#3a4a8a';

const BASE_IDS = new Set(BASE_CARD_LIST.map((c) => c.id));

/** Card novo de cada tipo, com valores que já cabem na tabela. */
export function newInput(kind: CardKind = 'pro'): CustomCardInput {
  const common = { id: '', name: '', rarity: 'comum' as const, flavor: '' };
  if (kind === 'pro') return { ...common, kind, typeLine: 'Humano / Dev', attribute: 'TECH', level: 4, atk: 1500, def: 1200, lore: '' };
  if (kind === 'task') return { ...common, kind, speed: 'normal', effects: [{ when: 'activate', do: [{ do: 'draw', amount: 1 }] }] };
  return {
    ...common,
    kind,
    bugType: 'normal',
    trigger: 'oppAttack',
    effects: [{ when: 'bug', do: [{ do: 'negateEvent' }] }],
  };
}

/** Troca o tipo do card mantendo nome, raridade e história. */
export function withKind(input: CustomCardInput, kind: CardKind): CustomCardInput {
  if (kind === input.kind) return input;
  return { ...newInput(kind), id: input.id, name: input.name, rarity: input.rarity, flavor: input.flavor, unique: input.unique };
}

/** Velocidade nova da Task: Equipamento precisa do alvo "seu Profissional" e do passivo de bônus. */
export function withSpeed(input: CustomCardInput, speed: TaskSpeed): CustomCardInput {
  if (speed === 'equip') return { ...input, speed, target: 'ownPro', effects: [{ passive: 'equip', atk: 500, def: 0 }] };
  const effects = (input.effects ?? []).filter((p) => !('passive' in p && p.passive === 'equip'));
  const keep = speed === 'continuous' || speed === 'field' ? effects : effects.filter((p) => !('passive' in p) && p.when === 'activate');
  return {
    ...input,
    speed,
    target: input.speed === 'equip' ? undefined : input.target,
    effects: keep.length ? keep : newInput('task').effects,
  };
}

/** Id "x_nome_da_carta" a partir do nome, único entre os cards existentes. */
export function slugId(name: string, taken: Iterable<string>): string {
  const base =
    'x_' +
    (name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'carta');
  const used = new Set([...taken, ...BASE_IDS]);
  const padded = base.length < 4 ? `${base}_carta` : base;
  if (!used.has(padded)) return padded;
  for (let n = 2; ; n++) if (!used.has(`${padded}_${n}`)) return `${padded}_${n}`;
}

/** Cópia para criar uma carta nova a partir desta (regras de uma publicada só mudam assim). */
export function duplicateInput(input: CustomCardInput, taken: Iterable<string>): CustomCardInput {
  const name = `${input.name} (cópia)`.slice(0, 40);
  return { ...structuredClone(input), name, id: slugId(name, taken) };
}

export interface DraftFace {
  def: CardDef;
  info: { frame: ReturnType<typeof cardFrame>; flip: boolean; subtype: string; typeLine: string; code: string };
}

/**
 * CardDef e moldura do rascunho para o preview, mesmo incompleto ou inválido: o que não
 * dá para montar fica com um valor neutro em vez de quebrar a tela.
 */
export function draftFace(input: CustomCardInput, art: string | null, serial: number | null): DraftFace {
  let def: CardDef;
  try {
    def = toCardDef({ ...input, name: input.name || 'Nome da carta' }, 1);
  } catch {
    def = {
      id: input.id || 'x_rascunho',
      name: input.name || 'Nome da carta',
      kind: input.kind,
      rarity: input.rarity,
      text: '',
      art: NO_ART,
    };
  }
  def.art = art ?? NO_ART;
  let fx: ReturnType<typeof compileEffects>;
  try {
    fx = compileEffects({ ...input, name: def.name });
  } catch {
    fx = undefined;
  }
  return {
    def,
    info: {
      frame: cardFrame(def, fx),
      flip: isFlip(def, fx),
      subtype: subtypeLabel(def),
      typeLine: fullTypeLine(def, fx),
      code: serial ? customCode(serial) : 'DVOH-X??',
    },
  };
}
