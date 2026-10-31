import { expect, test, type Browser, type Page } from '@playwright/test';
import { failOnConsoleErrors, signUp, withProfile } from './helpers';

async function player(browser: Browser, name: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await withProfile(page, name);
  await signUp(page, name);
  // Sair no meio do duelo pede confirmação: aceita sempre.
  page.on('dialog', (d) => d.accept());
  return page;
}

/**
 * Joga o torneio até o pódio: em cada rodada, alguém com duelo aberto desiste, e quem vê o
 * resultado volta ao painel.
 */
async function playUntilPodium(pages: Page[]) {
  for (let i = 0; i < 40; i++) {
    if (await pages[0].locator('.tour-podium').isVisible()) return;
    for (const p of pages) {
      const back = p.getByRole('button', { name: 'Voltar ao torneio' });
      if (await back.isVisible()) await back.click();
    }
    for (const p of pages) {
      const inDuel = (await p.locator('.duel').isVisible()) && !(await p.locator('.victory-box').isVisible());
      if (!inDuel) continue;
      await p.getByRole('button', { name: /Sair/ }).click();
      break;
    }
    await pages[0].waitForTimeout(400);
  }
}

test('torneio com 3 contas: inscrição pela lista, fase de pontos, final e pódio', async ({ browser }) => {
  const ana = await player(browser, 'Ana');
  const bia = await player(browser, 'Bia');
  const caio = await player(browser, 'Caio');
  const noErrors = failOnConsoleErrors(ana);

  await ana.goto('/');
  await ana.getByRole('radio', { name: /Torneio/ }).click();
  await ana.getByRole('button', { name: /Criar torneio online/ }).click();
  await expect(ana).toHaveURL(/\/sala\/T[A-Z0-9]{5}$/);
  const code = ana.url().split('/').pop()!;
  await expect(ana.getByRole('button', { name: /Iniciar torneio/ })).toBeDisabled();

  // Bia entra pela lista do lobby; Caio pelo código.
  await bia.goto('/');
  const row = bia.getByRole('region', { name: 'Salas abertas' }).locator('li', { hasText: code });
  await expect(row).toContainText('Torneio');
  await expect(row).toContainText('1/10');
  await row.getByRole('button', { name: 'Entrar' }).click();
  await caio.goto('/');
  await caio.getByPlaceholder('CÓDIGO').fill(code);
  await caio.locator('.join').getByRole('button', { name: 'Entrar' }).click();

  await expect(ana.locator('.tour-entrants li')).toHaveCount(3);
  await expect(caio.getByText('Aguardando o anfitrião iniciar')).toBeVisible();
  await ana.getByRole('button', { name: /Iniciar torneio/ }).click();

  // F5 no meio do torneio volta para o mesmo lugar.
  await expect(bia.locator('.tour-board, .duel').first()).toBeVisible();
  await bia.reload();
  await expect(bia.locator('.tour-board, .duel').first()).toBeVisible();

  await playUntilPodium([ana, bia, caio]);
  for (const p of [ana, bia, caio]) {
    // Quem jogou a final ainda vê o resultado dela.
    const back = p.getByRole('button', { name: 'Voltar ao torneio' });
    if (await back.isVisible()) await back.click();
    await expect(p.locator('.tour-podium li')).toHaveCount(3);
    await expect(p.locator('.tour-table tbody tr')).toHaveCount(3);
  }
  await expect(ana.locator('.tour-phase')).toHaveText('Torneio encerrado');
  noErrors();
});
