import { RequireAccount } from '../modules/auth';
import { BalanceDashboard } from '../modules/balance';

export function AdminBalancePage() {
  return (
    <RequireAccount reason="O painel de balanceamento é só para administradores.">
      <BalanceDashboard />
    </RequireAccount>
  );
}
