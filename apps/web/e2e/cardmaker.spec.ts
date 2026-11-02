import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors, signUp, withProfile } from './helpers';

const ART = new URL('./fixtures/arte.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Abre o criador numa carta nova (conta admin_… pelo DEV_ADMIN_USERNAMES do servidor de teste). */
async function openMaker(page: Page) {
  await withProfile(page, 'Admin');
  await page.goto('/');
  await signUp(page, 'Admin');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: 'Painel admin' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('button', { name: 'Abrir o criador' }).click();
  await expect(page.getByRole('heading', { name: 'Criador de cartas' })).toBeVisible();
}

const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();
const publishButton = (page: Page) => page.getByRole('button', { name: 'Publicar para todos' });

async function confirmPublish(page: Page) {
  await publishButton(page).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Publicar para todos' }).click();
  await expect(page.getByRole('status')).toContainText('Publicada!');
}

test('criador: conta comum vê "Acesso restrito" e o servidor barra', async ({ page }) => {
  await withProfile(page, 'Comum');
  await page.goto('/');
  await signUp(page, 'Comum');
  await page.goto('/admin/cartas');
  await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  expect((await page.request.get('/api/admin/cards')).status()).toBe(403);
});

test('criador: Profissional Normal com arte, travado pela tabela, publicado e aposentado', async ({ page, browser }) => {
  // Com capturas de tela (SHOTS_DIR), o teste demora mais.
  if (process.env.SHOTS_DIR) test.slow();
  const noErrors = failOnConsoleErrors(page);
  await openMaker(page);
  const name = `Estagiária ${Date.now().toString(36).slice(-4)}`;

  await page.getByLabel('Nome da carta').fill(name);
  await tab(page, 'Tipo e atributos');
  await page.getByLabel('ATK', { exact: true }).fill('2500');
  await page.getByLabel('ATK', { exact: true }).blur();
  await tab(page, 'Texto e história');
  await page.getByLabel(/História/).fill('Pergunta tudo, anota tudo, esquece tudo.');

  await tab(page, 'Arte');
  await page.getByLabel('Arquivo da arte').setInputFiles(ART);
  await expect(page.getByRole('slider', { name: /Área do recorte/ })).toBeVisible();
  await page.getByRole('button', { name: 'Mover para a direita' }).click();

  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('status')).toContainText('Salvo.');
  await expect(page).toHaveURL(/\/admin\/cartas\/x_estagiaria_/);
  await expect(page.locator('.cmk-face img.art-img')).toHaveAttribute('src', /\/api\/admin\/cards\/x_estagiaria_.*\/art\?v=1/);

  // ATK acima do teto: publicar fica travado até aplicar uma sugestão da tabela.
  const meter = page.getByRole('region', { name: 'Balanceamento' });
  await expect(meter).toContainText('passa do teto');
  await expect(publishButton(page)).toBeDisabled();
  if (process.env.SHOTS_DIR) {
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({ path: `${process.env.SHOTS_DIR}/cardmaker-${width}.png`, fullPage: width < 1100 });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await tab(page, 'Arte');
    await page.getByLabel('Arquivo da arte').setInputFiles(ART);
    await page.screenshot({ path: `${process.env.SHOTS_DIR}/cardmaker-arte.png` });
    await page.getByRole('button', { name: 'Descartar esta imagem' }).click();
  }
  await meter
    .getByRole('button', { name: /^Aplicar/ })
    .first()
    .click();
  await expect(meter).toContainText('Dentro do orçamento');
  await confirmPublish(page);

  // Aparece na coleção de quem publicou e de outra conta, e no deck builder.
  await page.goto('/colecao');
  await expect(page.locator('.card-full', { hasText: name })).toBeVisible();
  const other = await browser.newPage();
  await withProfile(other, 'Outra');
  await other.goto('/');
  await signUp(other, 'Outra');
  await other.goto('/colecao');
  await expect(other.locator('.card-full', { hasText: name })).toBeVisible();
  await other.goto('/decks');
  await expect(other.getByRole('region', { name: 'Cards disponíveis' }).getByLabel(name)).toBeVisible();
  await other.close();

  // Aposentar tira da coleção.
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Criador de cartas' })).toBeVisible();
  await page.getByRole('button', { name: 'Aposentar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Aposentar' }).click();
  await expect(page.getByRole('status')).toContainText('Aposentada');
  await page.goto('/colecao');
  await expect(page.getByRole('heading', { name: 'Coleção' })).toBeVisible();
  await expect(page.locator('.card-full', { hasText: name })).toHaveCount(0);
  noErrors();
});

test('criador: efeito em bloco, Task de Equipamento e simulador', async ({ page }) => {
  const noErrors = failOnConsoleErrors(page);
  await openMaker(page);

  // Profissional de Efeito pela receita: o texto sai dos blocos.
  await page.getByLabel('Nome da carta').fill('Curandeira do Deploy');
  await tab(page, 'Efeitos');
  await page.getByRole('button', { name: '+ Ao ser invocado: recupere 800 LP' }).click();
  await expect(page.locator('.cmk-face .cf-effect')).toHaveText('Ao ser invocado: você recupera 800 LP.');
  await expect(page.locator('.cmk-face .cf-type')).toContainText('Efeito');
  await tab(page, 'Arte');
  await page.getByLabel('Arquivo da arte').setInputFiles(ART);
  await page.getByLabel(/Imagem inteira/).check();
  await page.getByRole('button', { name: 'Testar no simulador' }).click();
  const sim = page.getByRole('dialog', { name: 'Testar no simulador' });
  await expect(sim.getByText('Vitórias de quem usa a carta')).toBeVisible({ timeout: 45_000 });
  await sim.getByRole('button', { name: 'Fechar' }).click();
  await confirmPublish(page);
  await page.goto('/colecao');
  await expect(page.locator('.card-full', { hasText: 'Curandeira do Deploy' })).toContainText('você recupera 800 LP');

  // Task de Equipamento pela receita: vira Equipamento com alvo "seu Profissional".
  await page.goBack();
  await page.getByRole('button', { name: 'Nova carta' }).click();
  await page.getByLabel('Nome da carta').fill('Teclado Mecânico');
  await tab(page, 'Tipo e atributos');
  await page.getByRole('radio', { name: 'Task' }).click();
  await tab(page, 'Efeitos');
  await page.getByRole('button', { name: '+ Equipamento: +500 ATK' }).click();
  await expect(page.locator('.cmk-face .cf-spelltype')).toContainText('EQUIPAMENTO');
  await expect(page.locator('.cmk-face .cf-effect')).toContainText('+500 ATK');
  await tab(page, 'Arte');
  await page.getByLabel('Arquivo da arte').setInputFiles(ART);
  await confirmPublish(page);
  await expect(page.getByRole('tab', { name: /Publicadas/ })).toContainText('2');
  noErrors();
});
