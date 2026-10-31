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
 * Joga o torneio até os três verem o pódio: quem tem duelo aberto desiste, e quem está num duelo
 * que já acabou volta ao painel. O fim do duelo vem do `data-over` do tabuleiro, e não do
 * resultado na tela: o resultado só aparece depois das animações do último lance, e decidir pela
 * tela no meio desse intervalo era o que travava o teste no CI.
 */
async function playUntilPodium(pages: Page[]) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const podiums = await Promise.all(pages.map((p) => p.locator('.tour-podium').isVisible()));
    if (podiums.every(Boolean)) return;
    for (const p of pages) {
      // Duelo encerrado: espera o resultado aparecer e volta ao painel (ou ao próximo duelo).
      const over = await p
        .locator('.duel[data-over="true"]')
        .elementHandle({ timeout: 100 })
        .catch(() => null);
      if (!over) continue;
      await p.getByRole('button', { name: 'Voltar ao torneio' }).click();
      await over.waitForElementState('hidden');
    }
    for (const p of pages) {
      const duel = await p
        .locator('.duel[data-over="false"]')
        .elementHandle({ timeout: 100 })
        .catch(() => null);
      if (!duel) continue;
      // Desiste e espera esse tabuleiro sair (o torneio pode abrir o próximo duelo logo em seguida).
      // Se o duelo acabar sozinho nesse meio-tempo (W.O. do outro lado), o resultado cobre o botão:
      // a próxima volta pega o duelo como encerrado.
      const left = await p
        .getByRole('button', { name: /Sair/ })
        .click({ timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (left) await duel.waitForElementState('hidden');
      break;
    }
    await pages[0].waitForTimeout(250);
  }
  throw new Error('O torneio não chegou ao pódio em 2 minutos.');
}

test('torneio com 3 contas: inscrição pela lista, fase de pontos, final e pódio', async ({ browser }) => {
  // Quatro duelos com três navegadores: no CI isso passa fácil de um minuto.
  test.setTimeout(180_000);
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
  const row = bia.getByRole('region', { name: 'Salas abertas' }).locator('tr', { hasText: code });
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
    await expect(p.locator('.tour-podium li')).toHaveCount(3);
    await expect(p.locator('.tour-table tbody tr')).toHaveCount(3);
  }
  await expect(ana.locator('.tour-phase')).toHaveText('Torneio encerrado');
  noErrors();
});
