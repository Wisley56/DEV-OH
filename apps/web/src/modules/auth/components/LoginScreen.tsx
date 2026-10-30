import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { PageHead } from '../../../shared/ui';
import { useAccount } from '../store/authStore';
import { AuthForm } from './AuthForm';

/** Só volta para caminhos internos (nada de `?next=https://outro-site`). */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

/** Tela /entrar: login ou cadastro e, depois, volta para onde a pessoa estava (`?next=`). */
export function LoginScreen() {
  const navigate = useNavigate();
  const next = safeNext(useSearchParams()[0].get('next'));
  const { status } = useAccount();
  if (status === 'user') return <Navigate to={next} replace />;
  return (
    <>
      <PageHead title="Sua conta" />
      <AuthForm onDone={() => navigate(next, { replace: true })} />
      <p className="muted auth-note">
        A conta guarda seus decks e o seu lugar no ranking. O treino contra o bot continua livre, sem conta.
      </p>
    </>
  );
}
