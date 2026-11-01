import { RequireAccount, RequireAdmin } from '../modules/auth';
import { CardMaker } from '../modules/cardmaker';

export function AdminCardMakerPage() {
  return (
    <RequireAccount reason="O criador de cartas é só para administradores.">
      <RequireAdmin what="O criador de cartas">
        <CardMaker />
      </RequireAdmin>
    </RequireAccount>
  );
}
