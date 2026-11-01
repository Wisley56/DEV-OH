import { catalogRevision, subscribeCatalog } from '@devoh/engine';
import { useSyncExternalStore } from 'react';

/** Muda quando o catálogo de cards é trocado (cards novos do painel): use como dependência de memos. */
export const useCatalogRevision = () => useSyncExternalStore(subscribeCatalog, catalogRevision);
