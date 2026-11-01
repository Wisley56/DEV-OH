import { LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../../shared/ui';
import { useAccount, useAuth } from '../store/authStore';
import { loginPath } from './RequireAccount';

/** Conta na barra superior: quem está logado, Elo e Sair (ou o botão de entrar). */
export function AccountBar() {
  const navigate = useNavigate();
  const here = useLocation();
  const { status, account } = useAccount();
  const logout = useAuth((s) => s.logout);

  if (account)
    return (
      <div className="account-bar">
        <span className="account-chip">
          <span className="account-avatar" aria-hidden>
            {account.displayName.charAt(0).toUpperCase()}
          </span>
          <b className="account-name">{account.displayName}</b>
          <span className="account-elo">Elo {account.elo}</span>
        </span>
        <Button size="sm" variant="ghost" title="Sair da conta" onClick={() => void logout()}>
          <LogOut size={16} aria-hidden />
          <span className="btn-text">Sair</span>
        </Button>
      </div>
    );
  return (
    <div className="account-bar">
      <span className="account-guest">{status === 'unknown' ? '…' : 'Jogando como visitante'}</span>
      <Button size="sm" variant="primary" disabled={status === 'unknown'} onClick={() => navigate(loginPath(here.pathname + here.search))}>
        Entrar / criar conta
      </Button>
    </div>
  );
}
