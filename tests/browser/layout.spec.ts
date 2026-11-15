import { expect, test, type Page } from '@playwright/test';

test.use({ hasTouch: true });

async function expectFixedPage(page: Page) {
  expect(await page.evaluate(() => {
    const root = document.documentElement;
    return [root.scrollWidth - root.clientWidth, root.scrollHeight - root.clientHeight, scrollX, scrollY];
  })).toEqual([0, 0, 0, 0]);
}

test('keeps depot controls accessible after opening a site in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/post/');
  await page.getByRole('button', { name: 'Neue Partie' }).click();
  await page.getByRole('button', { name: 'Starten' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Depots' }).click();
  await page.getByRole('button', { name: 'Standort', exact: true }).click();
  await page.getByLabel('Depotstandort').selectOption('depot-1');
  await page.getByRole('button', { name: /^Depot eröffnen/ }).click();
  await page.getByRole('button', { name: 'Wartezeit', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Maximale Bündelwartezeit (Sekunden)' }).fill('2');
  await page.getByRole('button', { name: 'Wartezeit übernehmen' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Wartezeit übernommen.' })).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Standort', exact: true }).click();
  await page.getByRole('button', { name: 'Depot räumen' }).click();
  await expectFixedPage(page);
});

for (const [width, height] of [[1920, 1080], [1280, 720], [390, 844], [320, 568], [667, 375]]) {
  test(`keeps all operations on a fixed page at ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/post/');
    await expectFixedPage(page);
    await page.getByRole('button', { name: 'Neue Partie' }).click();
    await page.getByLabel('Karten-Seed').fill('Nordring'.repeat(8));
    await expectFixedPage(page);
    await page.getByRole('button', { name: 'Starten' }).click();
    await expectFixedPage(page);
    await expect(page).toHaveTitle('Ab die Post');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const tick = await page.getByTestId('clock').getAttribute('data-tick');
    const nav = page.getByRole('navigation', { name: 'Betriebsbereiche' });

    for (const [name, content] of [
      ['Gebiete', page.getByRole('button', { name: 'Vorrang übernehmen' })],
      ['Depots', page.getByLabel('Depotstandort', { exact: true })],
      ['Flotte', page.getByLabel('Fahrzeug auswählen', { exact: true })],
      ['Touren', page.getByRole('button', { name: 'Tourvorlage speichern' })],
      ['Probleme', page.getByRole('heading', { name: 'Probleme', exact: true })],
      ['Betrieb', page.getByRole('button', { name: 'Vergrößern' })],
    ] as const) {
      const button = nav.getByRole('button', { name, exact: true });
      await expect(button).toBeInViewport({ ratio: 1 });
      await button.focus();
      await button.press('Enter');
      if (width <= 820 && name === 'Gebiete') {
        await page.getByRole('button', { name: 'Einstellungen' }).click();
        if (height <= 520) {
          await page.getByRole('button', { name: 'Zuständigkeit übernehmen' }).click();
          await content.click();
        }
      }
      await expect(content).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: 'Fortsetzen' })).toBeInViewport({ ratio: 1 });
      await expect(page).toHaveURL(/\/post\/$/);
      await expectFixedPage(page);
    }
    await page.getByRole('button', { name: 'Vergrößern' }).click();
    await expect(page.getByRole('button', { name: 'Verkleinern' })).toBeEnabled();
    await expect(page.getByTestId('clock')).toHaveAttribute('data-tick', tick!);
    await expectFixedPage(page);
    if (width <= 820) {
      await page.getByRole('button', { name: 'Betriebsübersicht', exact: true }).click();
    }
    const help = page.getByRole('button', { name: 'Einstiegshilfe' });
    await help.click();
    await expect(page.getByRole('dialog', { name: 'Einstiegshilfe' })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Escape');
    await expect(help).toBeFocused();
    await expectFixedPage(page);
  });
}
