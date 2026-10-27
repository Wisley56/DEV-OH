import { CARD_LIST, card, DECK_MAX, MAX_COPIES, STARTER_DECKS, validateDeck, type DeckList } from '@devoh/game';
import { useMemo, useState } from 'react';
import { CardFull, CardMini } from '../components/Card';
import { getCustomDecks, saveCustomDecks, setDeckId } from '../storage';

const ORDER = { pro: 0, task: 1, bug: 2 } as const;

export function DeckBuilder({ onBack }: { onBack: () => void }) {
  const [custom, setCustom] = useState<DeckList[]>(getCustomDecks());
  const [editing, setEditing] = useState<DeckList>(() => newDeckFrom(STARTER_DECKS[0], custom.length));
  const [preview, setPreview] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of editing.cards) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [editing.cards]);
  const errors = validateDeck(editing.cards);
  const isStarter = STARTER_DECKS.some((d) => d.id === editing.id);

  const add = (id: string) => {
    const max = card(id).unique ? 1 : MAX_COPIES;
    if ((counts.get(id) ?? 0) >= max || editing.cards.length >= DECK_MAX) return;
    setEditing({ ...editing, cards: [...editing.cards, id] });
    setSaved(false);
  };
  const remove = (id: string) => {
    const i = editing.cards.lastIndexOf(id);
    if (i < 0) return;
    setEditing({ ...editing, cards: editing.cards.filter((_, j) => j !== i) });
    setSaved(false);
  };
  const save = () => {
    const deck = isStarter ? newDeckFrom(editing, custom.length) : editing;
    const next = [...custom.filter((d) => d.id !== deck.id), deck];
    setCustom(next);
    saveCustomDecks(next);
    setDeckId(deck.id);
    setEditing(deck);
    setSaved(true);
  };
  const del = () => {
    const next = custom.filter((d) => d.id !== editing.id);
    setCustom(next);
    saveCustomDecks(next);
    setEditing(newDeckFrom(STARTER_DECKS[0], next.length));
  };

  const sortedDeck = [...counts.entries()].sort(
    ([a], [b]) => ORDER[card(a).kind] - ORDER[card(b).kind] || (card(b).level ?? 0) - (card(a).level ?? 0),
  );

  return (
    <div className="page deckbuilder">
      <div className="page-head">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Voltar
        </button>
        <h1>Montar deck</h1>
        <select
          value=""
          onChange={(e) => {
            const d = [...STARTER_DECKS, ...custom].find((x) => x.id === e.target.value);
            if (d) {
              setEditing(structuredClone(d));
              setSaved(false);
            }
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
      </div>

      <div className="db-layout">
        <section className="db-pool">
          <p className="muted">Clique para adicionar · pessoas da squad: 1 cópia · demais: até {MAX_COPIES}</p>
          <div className="pool-grid">
            {CARD_LIST.map((c) => {
              const n = counts.get(c.id) ?? 0;
              const max = c.unique ? 1 : MAX_COPIES;
              return (
                <button
                  key={c.id}
                  className={`pool-card ${n >= max ? 'maxed' : ''}`}
                  onClick={() => add(c.id)}
                  onMouseEnter={() => setPreview(c.id)}
                  onFocus={() => setPreview(c.id)}
                >
                  <CardMini cardId={c.id} badge={n ? <span className="badge count">{n}</span> : undefined} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="db-deck panel">
          <input
            className="deck-name"
            value={editing.name}
            maxLength={30}
            onChange={(e) => {
              setEditing({ ...editing, name: e.target.value });
              setSaved(false);
            }}
          />
          <div className={`deck-count ${errors.length ? 'bad' : 'good'}`}>
            {editing.cards.length} / {DECK_MAX} cards
          </div>
          <ul className="deck-list">
            {sortedDeck.map(([id, n]) => (
              <li key={id} className={`kind-${card(id).kind}`} onMouseEnter={() => setPreview(id)}>
                <span className="dl-n">{n}×</span>
                <span className="dl-name">{card(id).name}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => remove(id)} aria-label="Remover">
                  −
                </button>
              </li>
            ))}
          </ul>
          {errors.map((e) => (
            <p key={e} className="warn">
              {e}
            </p>
          ))}
          <div className="db-actions">
            <button className="btn btn-primary" disabled={errors.length > 0} onClick={save}>
              {saved ? '✔ Salvo e selecionado' : isStarter ? 'Salvar como meu deck' : 'Salvar'}
            </button>
            {!isStarter && custom.some((d) => d.id === editing.id) && (
              <button className="btn btn-ghost" onClick={del}>
                Excluir
              </button>
            )}
          </div>
          {preview && (
            <div className="db-preview">
              <CardFull cardId={preview} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function newDeckFrom(base: DeckList, n: number): DeckList {
  return {
    id: `custom-${Date.now().toString(36)}`,
    name: `Meu deck ${n + 1}`,
    description: `Deck personalizado (base: ${base.name}).`,
    cards: [...base.cards],
  };
}
