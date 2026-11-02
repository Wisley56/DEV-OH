import type { CustomCardInput } from '@devoh/engine';
import type { CustomCardRecord } from '@devoh/protocol';
import { api, apiUpload } from '../../../shared/lib/api';
import { cropQuery, type Box } from './cropMath';

/** Rotas do criador de cartas (/api/admin/cards). O servidor confere o admin em todas. */

const base = '/admin/cards';
const at = (id: string, rest = '') => `${base}/${encodeURIComponent(id)}${rest}`;

export const listCards = () => api<CustomCardRecord[]>(base);

export const createCard = (input: CustomCardInput) => api<CustomCardRecord>(base, { method: 'POST', body: { input } });

export const saveCard = (input: CustomCardInput, version: number) =>
  api<CustomCardRecord>(at(input.id), { method: 'PUT', body: { input, version } });

export const deleteCard = (id: string) => api(at(id), { method: 'DELETE' });

export const publishCard = (id: string) => api<CustomCardRecord>(at(id, '/publish'), { method: 'POST' });

export const retireCard = (id: string) => api<CustomCardRecord>(at(id, '/retire'), { method: 'POST' });

export const restoreCard = (id: string) => api<CustomCardRecord>(at(id, '/restore'), { method: 'POST' });

/** Sem `box`, o servidor usa a imagem inteira sobre o fundo desfocado. */
export const uploadArt = (id: string, file: Blob, box?: Box) =>
  apiUpload<CustomCardRecord>(at(id, `/art${box ? `?${cropQuery(box)}` : ''}`), file);

export const deleteArt = (id: string) => api<CustomCardRecord>(at(id, '/art'), { method: 'DELETE' });

/** Arte atual (inclusive de rascunho), para o preview. O `v` só evita reaproveitar a imagem velha. */
export const adminArtUrl = (id: string, version: number) => `/api${at(id, `/art?v=${version}`)}`;
