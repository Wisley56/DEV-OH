import { expect, test } from '@playwright/test';
import { failOnConsoleErrors, signUp, withProfile } from './helpers';

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

test('deck builder pede conta, salva na conta e importa os decks antigos do navegador', async ({ page }) => {
  await withProfile(page, 'Ana');
  await page.goto('/decks');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();

  // Deck antigo, de quando os decks ficavam só no navegador.
  await page.evaluate(() =>
    localStorage.setItem('devoh.customDecks', JSON.stringify([{ id: 'custom-old', name: 'Deck antigo', description: '', cards: [] }])),
  );
  const { username, password } = await signUp(page, 'Ana');
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Importar decks' })).toContainText('Deck antigo');
  await page.getByRole('button', { name: 'Descartar' }).click();
  expect(await page.evaluate(() => localStorage.getItem('devoh.customDecks'))).toBeNull();

  await page.goto('/decks');
  const mine = page.locator('select').first().locator('optgroup[label="Meus decks"] option');
  await expect(mine).toHaveCount(0);
  await page.locator('select').first().selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Salvar como meu deck' }).click();
  await expect(page.getByRole('button', { name: /Salvo e selecionado/ })).toBeVisible();
  await expect(mine).toHaveCount(1);

  // Salvo no servidor: sair e entrar de novo pela tela traz o deck de volta.
  await page.goto('/');
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByText('Jogando como visitante')).toBeVisible();
  await page.getByRole('button', { name: /Entrar \/ criar conta/ }).click();
  await page.getByLabel('Usuário').fill(username);
  await page.getByLabel('Senha').fill(password);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Elo 1000')).toBeVisible();
  // Nada de token no armazenamento do navegador: a sessão vive só no cookie HttpOnly.
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/token|session/i);
  expect(await page.evaluate(() => document.cookie)).not.toContain('devoh_session');

  await page.goto('/decks');
  await expect(mine).toHaveCount(1);
  await page
    .locator('select')
    .first()
    .selectOption((await mine.first().getAttribute('value'))!);
  await page.getByRole('button', { name: 'Excluir' }).click();
  await expect(mine).toHaveCount(0);
});

test('rota desconhecida mostra a página 404', async ({ page }) => {
  await page.goto('/nao-existe');
  await expect(page.getByText(/404|não encontrad/i).first()).toBeVisible();
});
