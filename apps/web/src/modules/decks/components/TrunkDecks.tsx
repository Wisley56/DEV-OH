import { STARTER_DECKS, type DeckList } from '@devoh/engine';
import { useState } from 'react';
import { ConfirmDialog } from '../../../shared/ui';
import { useShowStarterDecks } from '../hooks/useShowStarterDecks';
import { useDeckBuilder } from '../store/deckBuilderStore';
import { useDeckLibrary } from '../store/deckLibraryStore';
import { DeckBox } from './DeckBox';

/**
 * Aba "Decks" do painel da direita: decks iniciais (opcionais) e, abaixo de um divisor, os decks salvos.
 * Clicar abre o deck no painel central; com alterações não salvas, pede confirmação antes.
 */
export function TrunkDecks() {
  const custom = useDeckLibrary((s) => s.custom);
  const editingId = useDeckBuilder((s) => s.editing.id);
  const editingName = useDeckBuilder((s) => s.editing.name);
  const dirty = useDeckBuilder((s) => s.dirty);
  const open = useDeckBuilder((s) => s.open);
  const [showStarters, setShowStarters] = useShowStarterDecks();
  const [pending, setPending] = useState<DeckList | null>(null);

  const choose = (deck: DeckList) => {
    if (deck.id === editingId) return;
    if (dirty) setPending(deck);
    else open(deck);
  };

  const grid = (decks: readonly DeckList[]) => (
    <div className="db-decks-grid">
      {decks.map((d) => (
        <DeckBox key={d.id} deck={d} current={d.id === editingId} onOpen={() => choose(d)} />
      ))}
    </div>
  );

  return (
    <>
      <label className="db-switch">
        <input type="checkbox" role="switch" checked={showStarters} onChange={(e) => setShowStarters(e.target.checked)} />
        <span className="db-switch-track" aria-hidden />
        Mostrar decks iniciais
      </label>

      <div className="db-decks">
        {showStarters && (
          <>
            <section aria-label="Decks iniciais">
              <h3 className="db-decks-title">
                Decks iniciais <span className="muted">· viram cópia ao salvar</span>
              </h3>
              {grid(STARTER_DECKS)}
            </section>
            <hr className="db-decks-divider" />
          </>
        )}
        <section aria-label="Meus decks">
          <h3 className="db-decks-title">Meus decks</h3>
          {custom.length ? grid(custom) : <p className="muted db-decks-empty">Você ainda não salvou nenhum deck.</p>}
        </section>
      </div>

      {pending && (
        <ConfirmDialog
          title="Trocar de deck?"
          confirmLabel="Trocar"
          danger
          onCancel={() => setPending(null)}
          onConfirm={() => {
            open(pending);
            setPending(null);
          }}
        >
          As alterações em “{editingName}” que não foram salvas serão perdidas.
        </ConfirmDialog>
      )}
    </>
  );
}
