import { card, DECK_MAX, validateDeck } from '@devoh/engine';
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
        {editing.cards.length} / {DECK_MAX} cards
      </div>
      <ul className="deck-list">
        {sortedEntries(editing.cards).map(([id, n]) => (
          <li key={id} className={`kind-${card(id).kind}`} onMouseEnter={() => setPreview(id)}>
            <span className="dl-n">{n}×</span>
            <span className="dl-name">{card(id).name}</span>
            <Button size="sm" variant="ghost" onClick={() => removeCard(id)} aria-label="Remover">
              −
            </Button>
          </li>
        ))}
      </ul>
      {errors.map((e) => (
        <p key={e} className="warn">
          {e}
        </p>
      ))}
      <div className="db-actions">
        <Button variant="primary" disabled={errors.length > 0} onClick={save}>
          {saved ? '✔ Salvo e selecionado' : isStarter ? 'Salvar como meu deck' : 'Salvar'}
        </Button>
        {!isStarter && isCustom && (
          <Button variant="ghost" onClick={deleteDeck}>
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
