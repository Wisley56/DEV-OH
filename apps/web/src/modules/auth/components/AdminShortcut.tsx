import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../../../shared/ui';
import { useAccount } from '../store/authStore';

/** Atalho do painel admin na barra superior: só aparece para conta logada com is_admin. */
export function AdminShortcut() {
  const navigate = useNavigate();
  const { account } = useAccount();
  if (!account?.isAdmin) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      className="admin-shortcut"
      aria-label="Painel admin"
      title="Painel admin"
      onClick={() => navigate('/admin')}
    >
      <Settings size={18} aria-hidden />
      <span className="admin-shortcut-label" aria-hidden>
        Admin
      </span>
    </Button>
  );
}
