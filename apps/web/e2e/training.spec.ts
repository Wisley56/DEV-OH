import { expect, test } from '@playwright/test';
import { failOnConsoleErrors, waitForBoard, withProfile } from './helpers';

test('primeiro treino abre o tour, que pode ser pulado e revisto', async ({ page }) => {
  await withProfile(page, 'Ana', { tutorialSeen: false });
  await page.goto('/treino');
  await waitForBoard(page);
  const tip = page.locator('.tour-tip');
  await expect(tip).toContainText('Sua mão');
  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(tip).toContainText('Seu campo');
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(tip).toHaveCount(0);

  // Não abre de novo sozinho, mas o "?" mostra outra vez.
  await page.reload();
  await waitForBoard(page);
  await expect(page.locator('.tour-tip')).toHaveCount(0);
  await page.getByRole('button', { name: 'Como jogar' }).click();
  await expect(page.locator('.tour-tip')).toContainText('Sua mão');
});

test('arrasta um card da mão para uma zona e joga contra o bot', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await withProfile(page, 'Ana');
  await page.goto('/treino');
  await waitForBoard(page);

  // Espera a minha vez (o bot pode começar).
  await expect(page.locator('.phase')).toContainText('Seu turno', { timeout: 30_000 });

  const zones = page.locator('.field.mine .zone-pro');
  const free = (await zones.evaluateAll((els) => els.map((e) => !e.querySelector('.card-mini')))).lastIndexOf(true);
  test.skip(free < 0, 'sem zona livre neste sorteio');

  // Primeiro Profissional da mão que não pede sacrifício (sem sacrifício abre o menu Ataque/Defesa).
  const playable = page.locator('.hand-card.playable');
  const count = await playable.count();
  let dropped = false;
  for (let i = 0; i < count && !dropped; i++) {
    const card = playable.nth(i);
    await card.dragTo(zones.nth(free), { steps: 12 });
    const menu = page.getByRole('menu', { name: 'Invocar em' });
    if (await menu.isVisible().catch(() => false)) {
      await menu.getByRole('button', { name: /Ataque/ }).click();
      dropped = true;
    } else await page.keyboard.press('Escape');
  }
  test.skip(!dropped, 'nenhum Profissional sem sacrifício na mão neste sorteio');
  await expect(zones.nth(free).locator('.card-mini')).toBeVisible();

  // Passa a vez: o bot joga e a vez volta.
  await page.getByRole('button', { name: /Encerrar turno/ }).click();
  await expect(page.locator('.phase')).toContainText('Turno de', { timeout: 10_000 });
  await expect(page.locator('.phase')).toContainText('Seu turno', { timeout: 60_000 });
  noErrors();
});
