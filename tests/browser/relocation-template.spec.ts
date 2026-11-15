import { expect, test } from '@playwright/test';

test('plans the next tour from the new depot before a vehicle arrives', async ({ page }) => {
  await page.goto('/post/');
  await page.getByRole('button', { name: 'Neue Partie' }).click();
  await page.getByLabel('Karten-Seed').fill('Nordring');
  await page.getByRole('button', { name: 'Starten' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Betriebsbereiche' });
  const open = (name: string) => nav.getByRole('button', { name, exact: true }).click();

  await open('Depots');
  await page.getByLabel('Depotstandort', { exact: true }).selectOption('depot-1');
  await page.getByRole('button', { name: /^Depot eröffnen/ }).click();

  await open('Gebiete');
  await page.getByRole('button', { name: /Lindenau/ }).click();
  await page.getByRole('combobox', { name: 'Zuständiges Depot', exact: true }).selectOption('depot-1');
  await page.getByRole('button', { name: 'Zuständigkeit übernehmen' }).click();

  await open('Flotte');
  await page.getByRole('button', { name: 'Verlegen', exact: true }).click();
  await page.getByRole('combobox', { name: 'Neues Heimatdepot', exact: true }).selectOption('depot-1');
  await page.getByRole('button', { name: 'Fahrzeug verlegen' }).click();

  await open('Touren');
  const district = page.getByRole('combobox', { name: 'Gebiet für Tourvorlage', exact: true });
  await expect(district.getByRole('option')).toHaveText(['Lindenau']);
  await page.getByRole('button', { name: 'Gebiet hinzufügen' }).click();
  await expect(page.getByText(/^Netzfahrzeit:/)).toBeVisible();
  await page.getByRole('button', { name: 'Tourvorlage speichern' }).click();
  await expect(page.getByTestId('template-mode')).toContainText('Verbindliche Vorlage');
});
