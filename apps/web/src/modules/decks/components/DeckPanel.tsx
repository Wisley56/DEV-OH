import { card, DECK_MAX, validateDeck } from '@devoh/engine';
import { Check, Minus } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { CardFull } from '../../cards';
import { isStarterDeck, sortedEntries } from '../services/deckEditing';
import { useDeckBuilder } from '../store/deckBuilderStore';
import { useDeckLibrary } from '../store/deckLibraryStore';

/** Deck em edição: nome, lista, validação, salvar/excluir e pré-visualização. */
export function DeckPanel() {
  const editing = useDeckBuilder((s) => s.editing);
  const saved = useDeckBuilder((s) => s.saved);
  const preview = useDeckBuilder((s) => s.preview);
  const busy = useDeckBuilder((s) => s.busy);
  const error = useDeckBuilder((s) => s.error);
  const rename = useDeckBuilder((s) => s.rename);
  const removeCard = useDeckBuilder((s) => s.removeCard);
  const setPreview = useDeckBuilder((s) => s.setPreview);
  const save = useDeckBuilder((s) => s.save);
  const deleteDeck = useDeckBuilder((s) => s.deleteDeck);
  const isCustom = useDeckLibrary((s) => s.custom.some((d) => d.id === editing.id));
  const errors = validateDeck(editing.cards);
  const isStarter = isStarterDeck(editing.id);

  return (
    <section className="db-deck panel">
      <input className="deck-name" value={editing.name} maxLength={30} onChange={(e) => rename(e.target.value)} />
      <div className={`deck-count ${errors.length ? 'bad' : 'good'}`}>
        <span className="mono">
          {editing.cards.length} / {DECK_MAX} cards
        </span>
        <div className="deck-meter" aria-hidden>
          <span style={{ width: `${Math.min(100, (editing.cards.length / DECK_MAX) * 100)}%` }} />
        </div>
      </div>
      <ul className="deck-list">
        {sortedEntries(editing.cards).map(([id, n]) => (
          <li key={id} className={`kind-${card(id).kind}`} onMouseEnter={() => setPreview(id)}>
            <span className="dl-n">{n}×</span>
            <span className="dl-name">{card(id).name}</span>
            <Button size="sm" variant="ghost" onClick={() => removeCard(id)} aria-label={`Remover ${card(id).name}`} title="Remover">
              <Minus size={16} aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
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
          <Button variant="ghost" disabled={busy} onClick={() => void deleteDeck()}>
            Excluir
          </Button>
        )}
      </div>
      {preview && (
        <div className="db-preview">
          <CardFull cardId={preview} />
        </div>
      )}
    </section>
  );
}
