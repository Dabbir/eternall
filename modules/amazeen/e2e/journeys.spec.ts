import { expect, test } from '@playwright/test';
import { expectAccessible, onboard } from './helpers';

test('write a note, see it on the desk, read it in the issue', async ({ page }) => {
  await onboard(page);
  await page.goto('/write/note');
  await page.getByLabel('Note', { exact: true }).fill('Saw a heron on the canal this morning.');
  await page.getByRole('button', { name: /File to No\. 1/ }).click();

  await expect(page.getByText('Filed to No. 1.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Delete “Saw a heron/ })).toBeVisible();

  await page.getByRole('link', { name: /See the proof|Preview the proof/ }).first().click();
  await expect(page).toHaveURL(/\/issue\/\d{4}-W\d{2}/);
  await expect(page.getByRole('region', { name: 'Page 1: Cover' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Contents' })).toBeVisible();
});

test('the archive survives a reload', async ({ page }) => {
  await onboard(page, { sample: true, title: 'Small Hours' });
  const pieces = await page.getByText(/\d+ pieces? · \d+ words/).first().textContent();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Issue No\./ })).toBeVisible();
  await expect(page.getByText(pieces ?? '')).toBeVisible();
  await expect(page).toHaveTitle(/Desk/);
});

test('export, erase and import restores everything', async ({ page }) => {
  await onboard(page, { sample: true });
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export/ }).first().click();
  const file = await (await download).path();

  await page.getByRole('button', { name: /Erase everything/ }).click();
  await page.getByLabel(/Type ERASE to confirm/).fill('ERASE');
  await page.getByRole('button', { name: 'Erase permanently' }).click();
  await expect(page.getByLabel('Name your magazine')).toBeVisible();
  await page.reload();
  await onboard(page, { title: 'Restored' }); // still empty after a reload: the erase really persisted

  await page.goto('/settings');
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('heading', { name: 'Import this archive?' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.goto('/shelf');
  await expect(page.getByRole('link', { name: /^No\. \d+/ }).first()).toBeVisible();
});

test('deep links open directly (SPA fallback)', async ({ page }) => {
  await onboard(page, { sample: true });
  await page.goto('/shelf?q=bread');
  await expect(page.getByRole('searchbox')).toHaveValue('bread');
  await expect(page.locator('mark').first()).toBeVisible();
});

test('works offline once installed by the service worker', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not support service-worker offline emulation reliably');
  await onboard(page, { sample: true });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // let the SW take control
  await context.setOffline(true);
  await page.goto('/shelf');
  await expect(page.getByRole('heading', { name: 'The Shelf' })).toBeVisible();
  await context.setOffline(false);
});

test.describe('accessibility', () => {
  // Audit settled pages: no entrance animations mid-fade.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('onboarding', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Name your magazine')).toBeVisible();
    await expectAccessible(page);
  });

  for (const path of ['/', '/shelf', '/settings', '/write/story', '/privacy']) {
    test(`screen ${path}`, async ({ page }) => {
      await onboard(page, { sample: true });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectAccessible(page);
    });
  }

  test('reader pages', async ({ page }) => {
    await onboard(page, { sample: true });
    await page.goto('/shelf');
    await page.getByRole('link', { name: /^No\. \d+/ }).last().click();
    await expect(page.getByRole('region', { name: 'Page 1: Cover' })).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await expectAccessible(page);
      await page.keyboard.press('ArrowRight');
    }
  });
});

test.describe('accessibility · night edition', () => {
  test.use({ colorScheme: 'dark', contextOptions: { reducedMotion: 'reduce' } });

  for (const path of ['/', '/shelf', '/settings', '/write/story']) {
    test(`screen ${path}`, async ({ page }) => {
      await onboard(page, { sample: true });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expectAccessible(page);
    });
  }

  test('an explicit Day choice overrides a dark system and survives reload', async ({ page }) => {
    await onboard(page);
    await page.getByRole('switch', { name: 'Night edition' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectAccessible(page);
  });
});
