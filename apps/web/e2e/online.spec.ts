import { expect, test, type Browser, type Page } from '@playwright/test';
import { waitForBoard, withProfile } from './helpers';

/** Uma pessoa = um contexto do navegador (storage separado). */
async function player(browser: Browser, name: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await withProfile(page, name);
  return page;
}

async function createRoom(page: Page, opts: { private?: boolean } = {}) {
  await page.goto('/');
  if (opts.private) await page.getByLabel(/Sala privada/).check();
  await page.getByRole('button', { name: /Criar sala online/ }).click();
  await expect(page).toHaveURL(/\/sala\/[A-Z0-9]{5}$/);
  return page.url().split('/').pop()!;
}

test('sala pública: aparece na lista, entra, joga, reconecta e desistência explica o fim', async ({ browser }) => {
  const ana = await player(browser, 'Ana');
  const bia = await player(browser, 'Bia');
  const code = await createRoom(ana);

  await bia.goto('/');
  const row = bia.getByRole('region', { name: 'Salas abertas' }).locator('li', { hasText: code });
  await expect(row).toContainText('Ana');
  await row.getByRole('button', { name: 'Entrar' }).click();

  await waitForBoard(ana);
  await waitForBoard(bia);
  await expect(bia.locator('.turn-timer')).toBeVisible();

  // F5 volta para o mesmo duelo.
  await bia.reload();
  await waitForBoard(bia);

  // Ana desiste: a Bia vê por que venceu.
  ana.on('dialog', (d) => d.accept());
  await ana.getByRole('button', { name: /Sair/ }).click();
  const box = bia.locator('.victory-box');
  await expect(box).toContainText('SPRINT ENTREGUE!');
  await expect(box).toContainText('Ana desistiu do duelo.');
});

test('sala privada fica fora da lista; quem cai perde por W.O.', async ({ browser }) => {
  const ana = await player(browser, 'Ana');
  const bia = await player(browser, 'Bia');
  const code = await createRoom(ana, { private: true });

  await bia.goto('/');
  await expect(bia.getByRole('region', { name: 'Salas abertas' })).not.toContainText(code);

  // Entra pelo convite.
  await bia.goto(`/sala/${code}`);
  await bia.getByRole('button', { name: 'Entrar' }).first().click();
  await waitForBoard(bia);
  await waitForBoard(ana);

  // Ana fecha a página: a Bia vê a contagem e vence por W.O. (prazo curto no teste).
  await ana.context().close();
  await expect(bia.locator('.net-banner')).toContainText('W.O.');
  await expect(bia.locator('.victory-box')).toContainText('abandonou a sala', { timeout: 15_000 });
});
