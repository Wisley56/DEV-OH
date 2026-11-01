import { expect, test } from '@playwright/test';
import { failOnConsoleErrors, signUp, withProfile } from './helpers';

test('deck builder: monta com Auto, ajusta com botão direito, desfaz e salva', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await withProfile(page, 'Deckeira');
  await page.goto('/');
  await signUp(page, 'Deckeira');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/decks');

  const deck = page.getByRole('region', { name: 'Deck' });
  const trunk = page.getByRole('region', { name: 'Cards disponíveis' });
  const tiles = deck.locator('.db-deck-grid .db-tile');

  await deck.getByRole('button', { name: 'Auto', exact: true }).click();
  await expect(tiles).toHaveCount(30);

  // Botão direito num card do deck devolve ao catálogo; desfazer traz de volta.
  await tiles.first().click({ button: 'right' });
  await expect(tiles).toHaveCount(29);
  await deck.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(tiles).toHaveCount(30);

  // Clique esquerdo no catálogo mostra o card nos detalhes.
  const first = trunk.locator('.db-tile').first();
  const name = (await first.getAttribute('aria-label'))!;
  await first.click();
  await expect(page.getByRole('complementary', { name: 'Detalhes do card' })).toContainText(name);

  if (process.env.SHOTS_DIR) {
    for (const width of [1440, 1100, 800]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `${process.env.SHOTS_DIR}/deckbuilder-${width}.png`, fullPage: width === 800 });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await deck.getByRole('button', { name: 'Limpar deck', exact: true }).click();
    await page.screenshot({ path: `${process.env.SHOTS_DIR}/deckbuilder-confirm.png` });
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }

  await deck.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(deck.getByRole('button', { name: 'Salvo e selecionado', exact: true })).toBeVisible();

  // O deck salvo aparece em "Meus decks" depois de recarregar.
  await page.reload();
  await page.getByRole('tab', { name: 'Decks' }).click();
  await expect(page.getByRole('region', { name: 'Meus decks' }).getByRole('button', { name: /^Abrir / })).toHaveCount(1);
  noErrors();
});
