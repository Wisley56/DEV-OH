import { expect, test } from '@playwright/test';
import { failOnConsoleErrors, withProfile } from './helpers';

test('home abre sem erros e mostra o lobby com as salas abertas', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await withProfile(page, 'Ana');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /DEV-OH/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Treinar contra o Bot/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Salas abertas' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Salas abertas' })).not.toContainText('Procurando');
  noErrors();
});

test('coleção mostra o catálogo', async ({ page }) => {
  await withProfile(page, 'Ana');
  await page.goto('/colecao');
  await expect(page.locator('.collection-grid .card-full, .collection-grid .card-mini, .collection-grid > *').first()).toBeVisible();
  expect(await page.locator('.collection-grid > *').count()).toBeGreaterThan(40);
});

test('deck builder: salva uma cópia e exclui', async ({ page }) => {
  await withProfile(page, 'Ana');
  await page.goto('/decks');
  const mine = page.locator('select').first().locator('optgroup[label="Meus decks"] option');
  await expect(mine).toHaveCount(0);
  await page.locator('select').first().selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Salvar como meu deck' }).click();
  await expect(page.getByRole('button', { name: /Salvo e selecionado/ })).toBeVisible();
  await expect(mine).toHaveCount(1);
  await page.getByRole('button', { name: 'Excluir' }).click();
  await expect(mine).toHaveCount(0);
});

test('rota desconhecida mostra a página 404', async ({ page }) => {
  await page.goto('/nao-existe');
  await expect(page.getByText(/404|não encontrad/i).first()).toBeVisible();
});
