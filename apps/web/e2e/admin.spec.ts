import { expect, test } from '@playwright/test';
import { failOnConsoleErrors, signUp, withProfile } from './helpers';

test('painel de balanceamento: conta comum vê "Acesso restrito" e não tem o botão do painel', async ({ page }) => {
  await withProfile(page, 'Comum');
  await signUp(page, 'Comum');
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Ranking/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Painel admin/ })).toHaveCount(0);
  await page.goto('/admin/balanceamento');
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  // O servidor também barra: não é só a interface.
  expect((await page.request.get('/api/admin/me')).status()).toBe(403);
});

test('painel de balanceamento: admin roda a simulação no worker e vê o relatório', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await withProfile(page, 'Admin');
  // O servidor de teste trata os usuários admin_… como admin (DEV_ADMIN_USERNAMES).
  await signUp(page, 'Admin');
  expect((await page.request.get('/api/admin/me')).status()).toBe(200);

  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: 'Painel admin' }).click();
  await expect(page).toHaveURL(/\/admin\/balanceamento$/);

  await page.getByLabel('Decks').selectOption('starters');
  await page.getByLabel('Partidas por confronto').fill('1');
  await page.getByRole('button', { name: /Rodar simulação/ }).click();

  await expect(page.getByRole('heading', { name: 'Confrontos entre decks iniciais' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.balance-tile').first()).toContainText('12');
  await expect(
    page
      .getByRole('list', { name: /Win rate/ })
      .getByRole('listitem')
      .first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /JSON/ })).toBeVisible();
  noErrors();
});
