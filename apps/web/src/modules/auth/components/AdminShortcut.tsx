import { useNavigate } from 'react-router';
import { Button } from '../../../shared/ui';
import { useAccount } from '../store/authStore';

/** Botão do painel admin no canto superior direito: só aparece para conta logada com is_admin. */
export function AdminShortcut() {
  const navigate = useNavigate();
  const { account } = useAccount();
  if (!account?.isAdmin) return null;
  return (
    <nav className="admin-shortcut" aria-label="Administração">
      <Button size="sm" aria-label="Painel admin" title="Painel admin" onClick={() => navigate('/admin/balanceamento')}>
        <span aria-hidden>⚙</span>
        <span className="admin-shortcut-label" aria-hidden>
          Painel admin
        </span>
      </Button>
    </nav>
  );
}
