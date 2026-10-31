import { RequireAccount } from '../modules/auth';
import { DeckBuilder } from '../modules/decks';

export function DeckBuilderPage() {
  return (
    <RequireAccount reason="Os decks ficam salvos na sua conta: entre para montar, editar e usar em qualquer aparelho.">
      <div className="page deckbuilder">
        <DeckBuilder />
      </div>
    </RequireAccount>
  );
}
