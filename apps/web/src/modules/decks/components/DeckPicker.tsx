import { STARTER_DECKS } from '@devoh/engine';
import { useDeckBuilder } from '../store/deckBuilderStore';
import { useDeckLibrary } from '../store/deckLibraryStore';

/** Abre um deck inicial (vira cópia ao salvar) ou um dos seus para editar. */
export function DeckPicker() {
  const custom = useDeckLibrary((s) => s.custom);
  const open = useDeckBuilder((s) => s.open);
  return (
    <select
      value=""
      onChange={(e) => {
        const d = [...STARTER_DECKS, ...custom].find((x) => x.id === e.target.value);
        if (d) open(d);
      }}
    >
      <option value="">Abrir deck…</option>
      <optgroup label="Decks iniciais (vira cópia ao salvar)">
        {STARTER_DECKS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </optgroup>
      {custom.length > 0 && (
        <optgroup label="Meus decks">
          {custom.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
