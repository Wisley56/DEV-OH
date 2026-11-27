import { expect, test } from '@playwright/test';
import { failOnConsoleErrors, waitForBoard, withProfile } from './helpers';

const PIECES = ['Thy Mocorongo', 'Wisley Mocorongo', 'Douglas Mocorongo', 'Danilo Mocorongo', 'Vitor Mocorongo EAD'];

test('a coleção mostra as 5 peças e a fusão Devs Mocorongos (fora do deck)', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await withProfile(page, 'Ana');
  await page.goto('/colecao');
  for (const name of PIECES) await expect(page.locator('.cf-name-text', { hasText: new RegExp(`^${name}$`) })).toHaveCount(1);
  const fusion = page.locator('.card-full', { has: page.locator('.cf-name-text', { hasText: /^Devs Mocorongos$/ }) });
  await expect(fusion).toHaveCount(1);
  await expect(fusion).toHaveClass(/frame-fusion/);
  await expect(fusion.locator('.cf-code')).toHaveText('DVOH-F01');
  noErrors();
});

test('treino com o deck Devs Mocorongos: invoca uma peça e ela chama outra do deck', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await withProfile(page, 'Ana');
  await page.addInitScript(() => localStorage.setItem('devoh.deck', JSON.stringify('mocorongos')));
  await page.goto('/treino');
  await waitForBoard(page);
  await expect(page.locator('.phase')).toContainText('Seu turno', { timeout: 30_000 });

  // Peça na mão (pode não vir no sorteio da mão inicial).
  const card = page.locator('.hand-card.playable', { has: page.locator('.cm-name', { hasText: 'Mocorongo' }) }).first();
  test.skip((await card.count()) === 0, 'nenhuma peça na mão inicial');

  await card.click();
  await page.getByRole('button', { name: 'Invocar em Defesa' }).click();
  await expect(page.locator('.field.mine .zone-pro .cm-name', { hasText: 'Mocorongo' })).toHaveCount(1);
  await expect(page.locator('.log-body')).toContainText('do deck à mão', { timeout: 10_000 });
  noErrors();
});
