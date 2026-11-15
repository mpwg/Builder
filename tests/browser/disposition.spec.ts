import { expect, test } from '@playwright/test';

test('opens a depot, serves all shipment kinds and returns a manual tour to automatic dispatch', async ({ page }) => {
  await page.clock.install();
  await page.goto('/post/');
  await page.getByRole('button', { name: 'Neue Partie' }).click();
  await page.getByLabel('Karten-Seed').fill('Nordring');
  await page.getByRole('button', { name: 'Starten' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();

  await page.getByRole('combobox', { name: 'Depotstandort', exact: true }).selectOption('depot-1');
  await page.getByRole('button', { name: /^Depot eröffnen/ }).click();
  await expect(page.getByTestId('depot-status')).toContainText('Geöffnet');
  const bundle = page.getByRole('spinbutton', { name: 'Maximale Bündelwartezeit (Sekunden)' });
  await bundle.fill('1.5');
  await page.getByRole('button', { name: 'Wartezeit übernehmen' }).click();
  await page.getByRole('combobox', { name: 'Depotstandort', exact: true }).selectOption('center');
  await page.getByRole('combobox', { name: 'Depotstandort', exact: true }).selectOption('depot-1');
  await expect(bundle).toHaveValue('1.5');

  const areas = page.getByRole('list', { name: 'Zustellgebiete' });
  for (const area of ['Lindenau', 'Am Mühlbach']) {
    await areas.getByRole('button', { name: new RegExp(area) }).click();
    await page.getByRole('combobox', { name: 'Zuständiges Depot', exact: true }).selectOption('depot-1');
    await page.getByRole('button', { name: 'Zuständigkeit übernehmen' }).click();
  }
  await page.getByRole('combobox', { name: 'Gebietsvorrang', exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Vorrang übernehmen' }).click();
  await expect(page.getByRole('combobox', { name: 'Gebietsvorrang', exact: true })).toHaveValue('2');

  await page.getByRole('combobox', { name: 'Fahrzeugtyp kaufen', exact: true }).selectOption('van');
  await page.getByRole('button', { name: /^Fahrzeug kaufen/ }).click();
  const fleet = page.getByRole('combobox', { name: 'Fahrzeug auswählen', exact: true });
  const newVan = await fleet.inputValue();
  await expect(fleet.locator('option:checked')).toContainText('Lieferwagen');
  await page.getByRole('combobox', { name: 'Neues Heimatdepot', exact: true }).selectOption('depot-1');
  await page.getByRole('button', { name: 'Fahrzeug verlegen' }).click();

  await page.getByRole('button', { name: '4×' }).click();
  await page.getByRole('button', { name: 'Fortsetzen', exact: true }).click();
  await page.clock.runFor(3500);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await fleet.selectOption(newVan);
  await expect(page.getByTestId('vehicle-status')).toContainText('Depotstandort Nord');

  for (const id of ['district-1', 'district-2']) {
    await page.getByRole('combobox', { name: 'Gebiet für Tourvorlage', exact: true }).selectOption(id);
    await page.getByRole('button', { name: 'Gebiet hinzufügen' }).click();
  }
  const up = page.getByRole('button', { name: 'Am Mühlbach nach oben' });
  await up.focus();
  await up.press('Enter');
  const ordered = page.getByRole('list', { name: 'Reihenfolge der Tourhalte' });
  await expect(ordered.getByRole('listitem').first()).toContainText('Am Mühlbach');
  await expect(up).toBeFocused();
  await page.getByRole('button', { name: 'Tourvorlage speichern' }).click();
  await expect(page.getByTestId('template-mode')).toContainText('Verbindliche Vorlage');

  // Observe the real stock panel and the assigned vehicle as the simulation runs.
  await page.getByTestId('depot-status').evaluate(element => {
    new MutationObserver(() => {
      if (Number(element.getAttribute('data-used')) > 0) element.setAttribute('data-observed-stock', 'true');
    }).observe(element, { attributes: true, attributeFilter: ['data-used'] });
  });
  await page.getByRole('button', { name: 'Fortsetzen', exact: true }).click();
  const van = page.locator(`[data-vehicle-id="${newVan}"]`);
  for (let segment = 0; segment < 60 && await van.getAttribute('data-phase') !== 'outbound'; segment++) {
    await page.clock.runFor(200);
  }
  await expect(van).toHaveAttribute('data-phase', 'outbound');
  await page.getByRole('button', { name: 'Automatik übernehmen lassen' }).click();
  await expect(page.getByTestId('template-mode')).toContainText('Automatik');

  for (let segment = 0; segment < 60; segment++) {
    await page.clock.runFor(1000);
    const totals = await page.locator('[data-delivered-kind]').evaluateAll(
      nodes => nodes.every(node => Number(node.getAttribute('data-count')) > 0),
    );
    if (totals) break;
  }
  await expect(page.getByTestId('depot-status')).toHaveAttribute('data-observed-stock', 'true');
  for (const kind of ['ad', 'letter', 'registered', 'parcel', 'freight']) {
    await expect(page.locator(`[data-delivered-kind="${kind}"]`)).not.toHaveAttribute('data-count', '0');
  }

  await page.getByRole('button', { name: 'Depot räumen', exact: true }).click();
  await expect(page.getByTestId('depot-status')).toContainText(/Räumung|Geschlossen/);
  await page.clock.runFor(18000);
  await expect(page.getByTestId('depot-status')).toContainText('Geschlossen');
  await expect(page.getByRole('combobox', { name: 'Zuständiges Depot', exact: true })).toHaveValue('center');
});
