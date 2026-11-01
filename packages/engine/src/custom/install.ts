import { installCatalog } from '../core/catalog';
import type { CardDef } from '../core/types';
import { DEVOH_CATALOG } from '../content';
import { compileEffects } from '../dsl/compile';
import type { CardEffects } from '../effects/types';
import { toCardDef } from './toCardDef';
import { customCode, type CustomCardInput, type PublishedCustomCard } from './types';
import { validateCustomInput } from './validate';

/** Os dados de cada card do painel instalado (os bots leem os blocos para decidir as jogadas). */
let inputs = new Map<string, CustomCardInput>();

export const customCardInput = (id: string): CustomCardInput | undefined => inputs.get(id);

export interface InstallResult {
  installed: string[];
  rejected: { id: string; reason: string }[];
}

/**
 * Monta o catálogo: os cards em código mais os do painel. Idempotente (cada chamada parte da
 * base) e nunca lança: um registro inválido fica de fora e volta em `rejected` com o motivo.
 * Publicados entram na coleção; aposentados só continuam desenháveis (decks e duelos antigos).
 */
export function installCustomCards(records: readonly PublishedCustomCard[]): InstallResult {
  const list: CardDef[] = [...DEVOH_CATALOG.list];
  const defs: Record<string, CardDef> = { ...DEVOH_CATALOG.defs };
  const effects: Record<string, CardEffects> = { ...DEVOH_CATALOG.effects };
  const codes: Record<string, string> = {};
  const serials = new Set<number>();
  const installedInputs = new Map<string, CustomCardInput>();
  const result: InstallResult = { installed: [], rejected: [] };

  const sorted = [...records].sort((a, b) => (a?.serial ?? 0) - (b?.serial ?? 0));
  for (const record of sorted) {
    const id = String(record?.input?.id ?? '?');
    const reason = rejection(record, defs, serials);
    if (reason) {
      result.rejected.push({ id, reason });
      continue;
    }
    const def = toCardDef(record.input, record.artVersion);
    defs[id] = def;
    const fx = compileEffects({ ...record.input, name: def.name });
    if (fx) effects[id] = fx;
    codes[id] = customCode(record.serial);
    serials.add(record.serial);
    installedInputs.set(id, record.input);
    if (record.status === 'published') list.push(def);
    result.installed.push(id);
  }

  inputs = installedInputs;
  installCatalog({ list, defs, effects, codes });
  return result;
}

function rejection(record: PublishedCustomCard, defs: Record<string, CardDef>, serials: Set<number>): string | null {
  if (!record || typeof record !== 'object' || !record.input) return 'registro vazio';
  if (record.status !== 'published' && record.status !== 'retired') return 'status inválido';
  if (!Number.isInteger(record.serial) || record.serial < 1) return 'serial inválido';
  if (serials.has(record.serial)) return `serial ${record.serial} repetido`;
  if (!Number.isInteger(record.artVersion) || record.artVersion < 1) return 'sem arte';
  const errors = validateCustomInput(record.input);
  if (errors.length) return errors.join(' ');
  if (Object.hasOwn(defs, record.input.id)) return 'id já existe no catálogo';
  return null;
}
