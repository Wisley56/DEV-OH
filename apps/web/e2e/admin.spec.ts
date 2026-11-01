import { expect, test } from '@playwright/test';
import { failOnConsoleErrors, signUp, withProfile } from './helpers';

test('painel de balanceamento: conta comum vê "Acesso restrito" e não tem o link', async ({ page }) => {
  await withProfile(page, 'Comum');
  await signUp(page, 'Comum');
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Ranking/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Balanceamento/ })).toHaveCount(0);
  await page.goto('/admin/balanceamento');
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
});

test('painel de balanceamento: admin roda a simulação no worker e vê o relatório', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await withProfile(page, 'Admin');
  await signUp(page, 'Admin');
  // O is_admin é dado direto no banco; aqui o /auth/me é interceptado para marcar a conta como admin.
  await page.route('**/api/auth/me', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: { ...(await res.json()), isAdmin: true } });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Balanceamento/ }).click();
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
