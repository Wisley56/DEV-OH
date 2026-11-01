import { DECK_MAX, validateDeck } from '@devoh/engine';
import { Check, Layers, Trash2, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, ConfirmDialog } from '../../../shared/ui';
import { isStarterDeck, sortedEntries } from '../services/deckEditing';
import { useDeckBuilder } from '../store/deckBuilderStore';
import { useDeckLibrary } from '../store/deckLibraryStore';
import { CardTile } from './CardTile';

/** Painel central: o deck em edição em grade, com Auto, Desfazer, Limpar e Salvar. */
export function DeckGrid() {
  const editing = useDeckBuilder((s) => s.editing);
  const saved = useDeckBuilder((s) => s.saved);
  const busy = useDeckBuilder((s) => s.busy);
  const error = useDeckBuilder((s) => s.error);
  const canUndo = useDeckBuilder((s) => s.history.length > 0);
  const { rename, autoFill, undo, clear, save, deleteDeck } = useDeckBuilder((s) => s);
  // Nome como está salvo na conta (o do campo pode ter sido editado e não salvo).
  const savedName = useDeckLibrary((s) => s.custom.find((d) => d.id === editing.id)?.name);
  const isCustom = savedName !== undefined;
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const errors = validateDeck(editing.cards);
  const isStarter = isStarterDeck(editing.id);
  const slots = useMemo(
    () => sortedEntries(editing.cards).flatMap(([id, n]) => Array.from({ length: n }, (_, i) => ({ id, key: `${id}-${i}` }))),
    [editing.cards],
  );

  return (
    <section className="db-deck panel" aria-label="Deck">
      <header className="db-deck-head">
        <Layers size={22} aria-hidden className="db-deck-icon" />
        <label className="deck-name-field">
          <input
            className="deck-name"
            aria-label="Nome do deck"
            value={editing.name}
            maxLength={30}
            onChange={(e) => rename(e.target.value)}
          />
        </label>
        <div className="db-deck-tools">
          <Button size="sm" onClick={autoFill} title="Montar um deck aleatório">
            Auto
          </Button>
          <Button size="sm" onClick={undo} disabled={!canUndo} aria-label="Desfazer" title="Desfazer a última alteração">
            <Undo2 size={16} aria-hidden />
          </Button>
          <Button
            size="sm"
            onClick={() => setConfirmClear(true)}
            disabled={!editing.cards.length}
            aria-label="Limpar deck"
            title="Tirar todos os cards do deck"
          >
            <Trash2 size={16} aria-hidden />
          </Button>
        </div>
      </header>

      <div className={`deck-count ${errors.length ? 'bad' : 'good'}`}>
        <span>
          Deck principal{' '}
          <span className="mono">
            {editing.cards.length} / {DECK_MAX}
          </span>
        </span>
        <div className="deck-meter" aria-hidden>
          <span style={{ width: `${Math.min(100, (editing.cards.length / DECK_MAX) * 100)}%` }} />
        </div>
      </div>

      <div className="db-deck-grid" aria-label="Cards no deck">
        {slots.map((s) => (
          <CardTile key={s.key} cardId={s.id} rightClick="remove" />
        ))}
        {!slots.length && (
          <p className="muted db-deck-empty">Deck vazio: clique com o botão direito nos cards à direita para adicionar, ou use Auto.</p>
        )}
      </div>

      <footer className="db-deck-foot">
        {errors.map((e) => (
          <p key={e} className="warn">
            {e}
          </p>
        ))}
        {error && (
          <p className="warn" role="alert">
            {error}
          </p>
        )}
        <div className="db-actions">
          <Button variant="primary" disabled={errors.length > 0 || busy} onClick={() => void save()}>
            {saved && !busy && <Check size={16} aria-hidden />}
            {busy ? 'Salvando…' : saved ? 'Salvo e selecionado' : isStarter ? 'Salvar como meu deck' : 'Salvar'}
          </Button>
          {!isStarter && isCustom && (
            <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Excluir
            </Button>
          )}
        </div>
      </footer>

      {confirmClear && (
        <ConfirmDialog
          title="Limpar deck?"
          confirmLabel="Limpar"
          danger
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clear();
            setConfirmClear(false);
          }}
        >
          Remover todos os cards do deck? Você pode desfazer depois.
        </ConfirmDialog>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir deck?"
          confirmLabel="Excluir"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            void deleteDeck();
          }}
        >
          O deck “{savedName}” será apagado da sua conta. Essa ação não pode ser desfeita.
        </ConfirmDialog>
      )}
    </section>
  );
}
