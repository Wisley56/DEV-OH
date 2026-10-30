import { expect, type Page } from '@playwright/test';

/** Perfil salvo antes de abrir a página (apelido, tour já visto, som desligado). */
export async function withProfile(page: Page, name: string, opts: { tutorialSeen?: boolean } = {}) {
  await page.addInitScript(
    ([n, seen]) => {
      if (sessionStorage.getItem('e2e-init')) return;
      sessionStorage.setItem('e2e-init', '1');
      localStorage.setItem('devoh.name', JSON.stringify(n));
      localStorage.setItem('devoh.sound', 'false');
      if (seen) localStorage.setItem('devoh.tutorialSeen', 'true');
      else localStorage.removeItem('devoh.tutorialSeen');
    },
    [name, opts.tutorialSeen ?? true] as const,
  );
}

/** Falha o teste se a página registrar erro no console (inclusive violação de CSP). */
export function failOnConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return () => expect(errors, errors.join('\n')).toEqual([]);
}

/** Espera o tabuleiro e devolve se é o meu turno. */
export async function waitForBoard(page: Page) {
  await expect(page.locator('.duel')).toBeVisible();
  await expect(page.locator('.phase')).toContainText('T');
}

let accounts = 0;

/**
 * Cria uma conta nova (nome único por execução) direto pela API, no contexto da página:
 * o cookie de sessão HttpOnly fica no navegador, como depois do cadastro pela tela.
 * O formulário com o Turnstile fica de fora para o teste não depender da Cloudflare.
 */
export async function signUp(page: Page, displayName: string) {
  const username = `${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}${accounts++}`.slice(0, 20);
  const res = await page.request.post('/api/auth/register', {
    data: { username, displayName, password: 'senha-forte-1', turnstileToken: 'e2e' },
  });
  expect(res.status(), await res.text()).toBe(201);
  return { username, password: 'senha-forte-1' };
}
