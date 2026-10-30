import { useEffect, useRef } from 'react';

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<TurnstileApi> | null = null;

/** Baixa o script do Turnstile uma vez só (a CSP libera challenges.cloudflare.com). */
function loadTurnstile(): Promise<TurnstileApi> {
  loader ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    s.onerror = () => {
      loader = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/**
 * Verificação anti-robô do cadastro (Cloudflare Turnstile). Quase sempre passa sozinha;
 * `onToken` recebe a resposta (ou '' quando vence e precisa de outra); `onError` avisa que o
 * widget não carregou (rede bloqueando a Cloudflare, por exemplo).
 * `resetKey` muda para pedir um token novo (cada um vale uma vez).
 */
export function Turnstile({
  siteKey,
  onToken,
  onError,
  resetKey,
}: {
  siteKey: string;
  onToken(token: string): void;
  onError(): void;
  resetKey: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  const fail = useRef(onError);
  fail.current = onError;

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !box.current) return;
        widget.current = ts.render(box.current, {
          sitekey: siteKey,
          theme: 'dark',
          language: 'pt-br',
          callback: (t: string) => cb.current(t),
          'expired-callback': () => cb.current(''),
          'error-callback': () => {
            cb.current('');
            fail.current();
          },
        });
      })
      .catch(() => fail.current());
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  return <div ref={box} className="turnstile" />;
}
