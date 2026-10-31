import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../../shared/ui';
import { useAccount, useAuth } from '../store/authStore';
import { loginPath } from './RequireAccount';

/** Faixa da conta no topo do lobby: quem está logado, Elo, ranking e Sair (ou o botão de entrar). */
export function AccountBar() {
  const navigate = useNavigate();
  const here = useLocation();
  const { status, account } = useAccount();
  const logout = useAuth((s) => s.logout);

  return (
    <div className="account-bar">
      {account ? (
        <>
          <span className="account-name">
            👤 <b>{account.displayName}</b> <span className="account-elo">Elo {account.elo}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => navigate('/ranking')}>
            🏆 Ranking
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void logout()}>
            Sair
          </Button>
        </>
      ) : (
        <>
          <span className="account-name">{status === 'unknown' ? '…' : 'Jogando como visitante'}</span>
          <Button size="sm" variant="ghost" onClick={() => navigate('/ranking')}>
            🏆 Ranking
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={status === 'unknown'}
            onClick={() => navigate(loginPath(here.pathname + here.search))}
          >
            Entrar / criar conta
          </Button>
        </>
      )}
    </div>
  );
}
