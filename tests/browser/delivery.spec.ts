import { expect, test } from '@playwright/test';

for (const seed of ['Nordring', 'Westpost']) {
  test(`delivers letters on the static map for ${seed}`, async ({ page, baseURL }) => {
    const urls: string[] = [];
    const errors: string[] = [];
    page.on('request', request => urls.push(request.url()));
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/post/');
    await page.getByRole('button', { name: 'Neue Partie' }).click();
    await page.getByLabel('Karten-Seed').fill(seed);
    await page.getByRole('button', { name: 'Starten' }).click();
    await expect(page.getByRole('heading', { name: 'Zustellkarte' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Zustellgebiete' }).getByRole('button')).toHaveCount(4);
    await expect(page.getByTestId('seed')).toHaveText(seed);
    await expect(page.getByTestId('event')).toContainText(/Brief/i, { timeout: 10000 });
    const vehicle = page.getByTestId('vehicle');
    await expect(vehicle).toHaveAttribute('data-phase', 'outbound', { timeout: 10000 });
    const initial = await vehicle.getAttribute('transform');
    await expect.poll(() => vehicle.getAttribute('transform')).not.toBe(initial);
    await expect(page.getByTestId('letters-delivered')).not.toHaveText('0', { timeout: 15000 });
    await expect(page.getByTestId('revenue')).not.toContainText('0,00');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const tick = await page.getByTestId('clock').getAttribute('data-tick');
    await page.clock.install();
    await page.clock.runFor(1000);
    await expect(page.getByTestId('clock')).toHaveAttribute('data-tick', tick!);
    await expect(vehicle).toBeVisible();
    expect(urls.every(url => url.startsWith(baseURL + '/post/'))).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('visibility changes preserve the manual pause and never catch up', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    // Drive the browser API boundary deterministically, including in headless Chromium.
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  await page.goto('/post/');
  await page.getByRole('button', { name: 'Neue Partie' }).click();
  await page.getByRole('button', { name: 'Starten' }).click();
  const clock = page.getByTestId('clock');
  const readTick = async () => Number(await clock.getAttribute('data-tick'));
  const setHidden = (value: boolean) => page.evaluate(hidden => {
    Object.defineProperty(document, 'hidden', { value: hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }, value);

  await setHidden(true);
  const hiddenTick = await readTick();
  await page.clock.fastForward(60_000);
  expect(await readTick()).toBe(hiddenTick);
  await setHidden(false);
  await page.clock.runFor(400);
  const resumedTick = await readTick();
  expect(resumedTick - hiddenTick).toBeGreaterThan(0);
  expect(resumedTick - hiddenTick).toBeLessThan(8);

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const pausedTick = await readTick();
  await setHidden(true);
  await page.clock.fastForward(60_000);
  await setHidden(false);
  await page.clock.runFor(400);
  expect(await readTick()).toBe(pausedTick);
  await expect(page.getByRole('button', { name: 'Fortsetzen' })).toBeVisible();
});
