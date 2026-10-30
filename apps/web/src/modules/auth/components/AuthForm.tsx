import { PASSWORD_MIN, type AuthConfig } from '@devoh/protocol';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui';
import { api } from '../../../shared/lib/api';
import { useAuth } from '../store/authStore';
import { Turnstile } from './Turnstile';

type Mode = 'login' | 'register';

/** Entrar ou criar conta (usuário e senha; o cadastro passa pela verificação anti-robô). */
export function AuthForm({ onDone }: { onDone(): void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [human, setHuman] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'register' || siteKey) return;
    api<AuthConfig>('/auth/config')
      .then((c) => setSiteKey(c.turnstileSiteKey))
      .catch((e: Error) => setError(e.message));
  }, [mode, siteKey]);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'register') {
      if (password !== confirm) return setError('As senhas não batem.');
      if (!human) return setError('Espere a verificação anti-robô terminar.');
    }
    setBusy(true);
    try {
      if (mode === 'login') await login({ username, password });
      else await register({ username, displayName: displayName || username, password, turnstileToken: human });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      // Cada resposta do Turnstile vale uma vez: depois de um erro, pede outra.
      if (mode === 'register') {
        setHuman('');
        setResetKey((k) => k + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form panel" onSubmit={submit}>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => switchTo('login')}>
          Entrar
        </button>
        <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchTo('register')}>
          Criar conta
        </button>
      </div>

      <label className="field-label">
        Usuário
        <input
          value={username}
          autoComplete="username"
          autoCapitalize="none"
          maxLength={20}
          placeholder="ex.: wisley"
          required
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
        />
      </label>
      {mode === 'register' && (
        <>
          <p className="auth-hint">3 a 20 letras minúsculas, números ou _ (é com ele que você entra).</p>
          <label className="field-label">
            Nome no jogo
            <input
              value={displayName}
              maxLength={20}
              placeholder="Como os outros vão te ver"
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
        </>
      )}
      <label className="field-label">
        Senha
        <input
          type="password"
          value={password}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'register' ? PASSWORD_MIN : undefined}
          maxLength={128}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {mode === 'register' && (
        <>
          <label className="field-label">
            Repita a senha
            <input
              type="password"
              value={confirm}
              autoComplete="new-password"
              maxLength={128}
              required
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <p className="auth-hint">Mínimo de {PASSWORD_MIN} caracteres.</p>
          {siteKey && (
            <Turnstile
              siteKey={siteKey}
              onToken={setHuman}
              onError={() =>
                setError('A verificação anti-robô não carregou. Confira a internet (ou o bloqueador de anúncios) e recarregue a página.')
              }
              resetKey={resetKey}
            />
          )}
        </>
      )}

      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      <Button variant="primary" size="lg" type="submit" disabled={busy}>
        {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </Button>
    </form>
  );
}
