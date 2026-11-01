import { AdminHub } from '../modules/admin';
import { RequireAccount, RequireAdmin } from '../modules/auth';

export function AdminHubPage() {
  return (
    <RequireAccount reason="O painel admin é só para administradores.">
      <RequireAdmin what="O painel admin">
        <AdminHub />
      </RequireAdmin>
    </RequireAccount>
  );
}
