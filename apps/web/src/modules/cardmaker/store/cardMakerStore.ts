import type { CardKind, CustomCardInput } from '@devoh/engine';
import type { CustomCardRecord } from '@devoh/protocol';
import { create } from 'zustand';
import { ApiFailure } from '../../../shared/lib/api';
import { loadCustomCards } from '../../catalog';
import * as cards from '../services/cardmakerApi';
import { boxOf, type CropView } from '../services/cropMath';
import { duplicateInput, newInput, slugId } from '../services/draft';

/** Imagem escolhida e ainda não enviada (vai junto no próximo "Salvar"). */
export interface PendingArt {
  file: File;
  /** blob: da imagem original, para o cropper. */
  url: string;
  width: number;
  height: number;
  view: CropView;
  /** Imagem inteira sobre o fundo desfocado, sem recorte. */
  whole: boolean;
}

export interface Notice {
  kind: 'ok' | 'error';
  text: string;
  problems?: string[];
}

type Busy = 'save' | 'publish' | 'retire' | 'restore' | 'delete' | 'art' | null;

interface CardMakerState {
  records: CustomCardRecord[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadError: string | null;
  /** O que está no formulário; `record` null = carta nova, ainda não salva. */
  input: CustomCardInput;
  record: CustomCardRecord | null;
  dirty: boolean;
  pendingArt: PendingArt | null;
  /** blob: da arte recortada que o preview mostra (desenhada no navegador). */
  previewArt: string | null;
  busy: Busy;
  notice: Notice | null;
  load(): Promise<void>;
  /** Abre a carta `id` (ou uma nova, com null). */
  open(id: string | null): void;
  startNew(kind?: CardKind): void;
  duplicate(id: string): void;
  edit(update: (input: CustomCardInput) => CustomCardInput): void;
  setPendingArt(art: PendingArt | null): void;
  updatePendingArt(patch: Partial<Pick<PendingArt, 'view' | 'whole'>>): void;
  setPreviewArt(url: string | null): void;
  dismissNotice(): void;
  /** Salva o formulário e envia a arte pendente; devolve o registro salvo, ou null se falhou. */
  save(): Promise<CustomCardRecord | null>;
  publish(): Promise<void>;
  retire(): Promise<void>;
  restore(): Promise<void>;
  remove(): Promise<boolean>;
  removeArt(): Promise<void>;
}

const revoke = (url: string | null | undefined) => url && URL.revokeObjectURL(url);

const failure = (err: unknown): Notice =>
  err instanceof ApiFailure
    ? { kind: 'error', text: err.message, problems: err.problems.length > 1 ? err.problems : undefined }
    : { kind: 'error', text: 'Algo deu errado. Tenta de novo.' };

const blank = () => ({ input: newInput('pro'), record: null, dirty: false, pendingArt: null, notice: null });

/** Estado do criador de cartas (uma carta aberta por vez). */
export const useCardMaker = create<CardMakerState>((set, get) => {
  /** Troca o registro na lista (ou acrescenta) e no formulário. */
  const settle = (rec: CustomCardRecord, notice: Notice | null = null) =>
    set((s) => ({
      records: s.records.some((r) => r.id === rec.id) ? s.records.map((r) => (r.id === rec.id ? rec : r)) : [...s.records, rec],
      record: rec,
      input: structuredClone(rec.input),
      dirty: false,
      notice,
    }));

  const clearArt = () => {
    revoke(get().pendingArt?.url);
    revoke(get().previewArt);
    set({ pendingArt: null, previewArt: null });
  };

  /** Ação no servidor com o botão ocupado e o erro no aviso. */
  async function run<T>(busy: Busy, fn: () => Promise<T>): Promise<T | null> {
    if (get().busy) return null;
    set({ busy, notice: null });
    try {
      return await fn();
    } catch (err) {
      set({ notice: failure(err) });
      return null;
    } finally {
      set({ busy: null });
    }
  }

  return {
    records: [],
    status: 'idle',
    loadError: null,
    ...blank(),
    previewArt: null,
    busy: null,

    async load() {
      if (get().status === 'loading') return;
      set({ status: 'loading', loadError: null });
      try {
        set({ records: await cards.listCards(), status: 'ready' });
      } catch (err) {
        set({ status: 'error', loadError: failure(err).text });
      }
    },

    open(id) {
      const { record, records } = get();
      // Mesma carta (ou a nova em andamento): mantém o que está no formulário.
      if (id === (record?.id ?? null)) return;
      clearArt();
      const rec = id ? records.find((r) => r.id === id) : undefined;
      if (rec) set({ input: structuredClone(rec.input), record: rec, dirty: false, notice: null });
      else set(blank());
    },

    startNew(kind = 'pro') {
      clearArt();
      set({ ...blank(), input: newInput(kind) });
    },

    duplicate(id) {
      const rec = get().records.find((r) => r.id === id);
      if (!rec) return;
      clearArt();
      set({
        ...blank(),
        input: duplicateInput(
          rec.input,
          get().records.map((r) => r.id),
        ),
        dirty: true,
        notice: { kind: 'ok', text: 'Cópia pronta: ajuste e salve. A arte precisa ser enviada de novo.' },
      });
    },

    edit(update) {
      set((s) => ({ input: update(s.input), dirty: true }));
    },

    setPendingArt(art) {
      revoke(get().pendingArt?.url);
      set({ pendingArt: art });
    },

    updatePendingArt(patch) {
      const art = get().pendingArt;
      if (art) set({ pendingArt: { ...art, ...patch } });
    },

    setPreviewArt(url) {
      revoke(get().previewArt);
      set({ previewArt: url });
    },

    dismissNotice: () => set({ notice: null }),

    save: () =>
      run('save', async () => {
        const { input, record, dirty, pendingArt, records } = get();
        if (input.name.trim().length < 2) throw new ApiFailure('Dê um nome à carta (2 a 40 caracteres).', 400);
        let rec = record;
        if (!rec) {
          const id = slugId(
            input.name,
            records.map((r) => r.id),
          );
          rec = await cards.createCard({ ...input, id });
        } else if (dirty) rec = await cards.saveCard(input, rec.version);
        settle(rec);
        if (pendingArt) {
          set({ busy: 'art' });
          rec = await cards.uploadArt(
            rec.id,
            pendingArt.file,
            pendingArt.whole ? undefined : boxOf(pendingArt.view, pendingArt.width, pendingArt.height),
          );
          // Daqui em diante o preview mostra a arte que o servidor gerou.
          revoke(pendingArt.url);
          revoke(get().previewArt);
          set({ pendingArt: null, previewArt: null });
          settle(rec);
        }
        if (rec.status !== 'draft') void loadCustomCards();
        set({ notice: { kind: 'ok', text: 'Salvo.' } });
        return rec;
      }),

    async publish() {
      const saved = await get().save();
      if (!saved) return;
      const rec = await run('publish', () => cards.publishCard(saved.id));
      if (!rec) return;
      settle(rec, { kind: 'ok', text: 'Publicada! Já aparece na coleção e no deck builder de todo mundo.' });
      await loadCustomCards();
    },

    async retire() {
      const id = get().record?.id;
      if (!id) return;
      const rec = await run('retire', () => cards.retireCard(id));
      if (!rec) return;
      settle(rec, { kind: 'ok', text: 'Aposentada: saiu da coleção e não entra em decks novos.' });
      await loadCustomCards();
    },

    async restore() {
      const id = get().record?.id;
      if (!id) return;
      const rec = await run('restore', () => cards.restoreCard(id));
      if (!rec) return;
      settle(rec, { kind: 'ok', text: 'De volta à coleção.' });
      await loadCustomCards();
    },

    async remove() {
      const id = get().record?.id;
      if (!id) {
        get().startNew();
        return true;
      }
      const ok = await run('delete', () => cards.deleteCard(id).then(() => true));
      if (!ok) return false;
      clearArt();
      set((s) => ({ ...blank(), records: s.records.filter((r) => r.id !== id), notice: { kind: 'ok', text: 'Rascunho apagado.' } }));
      return true;
    },

    async removeArt() {
      // Imagem ainda não enviada: só descarta (a arte salva no servidor continua).
      if (get().pendingArt) return clearArt();
      clearArt();
      const id = get().record?.id;
      if (!id || !get().record?.artVersion) return;
      const rec = await run('art', () => cards.deleteArt(id));
      if (rec) settle(rec);
    },
  };
});
