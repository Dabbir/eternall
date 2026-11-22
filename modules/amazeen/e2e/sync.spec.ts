import { expect, test } from '@playwright/test';
import type { Browser, Page, Request } from '@playwright/test';
import { onboard, expectAccessible } from './helpers';

/**
 * Two separate browser contexts stand in for two devices (separate storage, nothing shared but the
 * server and the sync key). Runs against the real Worker (the same wrangler.jsonc as production) with a real D1 database.
 */
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== 'desktop-chrome' || browserName !== 'chromium', 'two-device flows run once, in desktop Chrome');
});

async function newDevice(browser: Browser): Promise<{ page: Page; requests: Request[] }> {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requests: Request[] = [];
  page.on('request', (r) => r.url().includes('/api/') && requests.push(r));
  return { page, requests };
}

/** Turn sync on from the Office and return the key the person is shown. */
async function turnOnSync(page: Page): Promise<string> {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Turn on sync' }).click();
  const box = page.getByTestId('sync-key');
  await expect(box).toBeVisible();
  const key = await box.evaluate((el) => [...el.children].map((c) => c.textContent).join('-'));
  expect(key).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{4}$/u);
  const done = page.getByRole('button', { name: 'I’ve saved it' });
  await expect(done).toBeDisabled(); // can't skip past the key without confirming it
  await page.getByLabel(/last four characters/u).fill('zzzz');
  await expect(done).toBeDisabled();
  await page.getByLabel(/last four characters/u).fill(key.slice(-4).toLowerCase());
  await done.click();
  await expect(page.getByText(/^Synced /u)).toBeVisible();
  return key;
}

async function restoreFromKey(page: Page, key: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Restore it with your sync key/u }).click();
  await page.getByLabel('Sync key').fill(key.toLowerCase().replace(/-/gu, ' '));
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.getByRole('heading', { name: /Issue No\./u })).toBeVisible({ timeout: 15_000 });
}

const syncNow = async (page: Page): Promise<void> => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText(/^Synced /u)).toBeVisible();
};

async function jot(page: Page, text: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel(/Jot a note/u).fill(text);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: new RegExp(`Delete “${text.slice(0, 20)}`, 'u') })).toBeVisible();
}

const hasEntry = (page: Page, text: string) => page.getByRole('button', { name: new RegExp(`Delete “${text.slice(0, 20)}`, 'u') });

test('a journal started on one device appears on a second, and changes flow both ways', async ({ browser }) => {
  const laptop = await newDevice(browser);
  const phone = await newDevice(browser);

  await onboard(laptop.page, { title: 'Our Journal' });
  await jot(laptop.page, 'Written on the laptop first');
  const key = await turnOnSync(laptop.page);

  // The phone has never seen this journal: it restores it from the key alone.
  await restoreFromKey(phone.page, key);
  await phone.page.goto('/settings');
  await expect(phone.page.locator('main').getByText('Our Journal').first()).toBeVisible(); // the masthead came along (Office staff box)
  await phone.page.goto('/');
  await expect(hasEntry(phone.page, 'Written on the laptop first')).toBeVisible();

  // A note written on the phone reaches the laptop…
  await jot(phone.page, 'Written on the phone second');
  await expect.poll(async () => (await syncNow(laptop.page), await laptop.page.goto('/'), await hasEntry(laptop.page, 'Written on the phone second').count()), { timeout: 20_000 }).toBe(1);

  // …and a deletion on the laptop removes it from the phone, for good.
  await laptop.page.getByRole('button', { name: /Delete “Written on the laptop first/u }).click();
  await expect(hasEntry(laptop.page, 'Written on the laptop first')).toHaveCount(0);
  await expect.poll(async () => (await syncNow(phone.page), await phone.page.goto('/'), await hasEntry(phone.page, 'Written on the laptop first').count()), { timeout: 20_000 }).toBe(0);
  await expect(hasEntry(phone.page, 'Written on the phone second')).toBeVisible();
  await syncNow(phone.page);
  await phone.page.goto('/');
  await expect(hasEntry(phone.page, 'Written on the laptop first')).toHaveCount(0); // does not come back
});

test('nothing readable ever leaves the device: no text, no key, only an opaque token', async ({ browser }) => {
  const laptop = await newDevice(browser);
  await onboard(laptop.page, { title: 'Very Private Masthead' });
  await jot(laptop.page, 'my deepest secret about tuesday');
  const key = await turnOnSync(laptop.page);
  await syncNow(laptop.page);

  const posts = laptop.requests.filter((r) => r.method() === 'POST' && r.url().endsWith('/api/sync'));
  expect(posts.length).toBeGreaterThan(0);
  const secretKey = key.replace(/-/gu, '');
  for (const request of laptop.requests) {
    const wire = `${request.url()} ${request.postData() ?? ''}`.toLowerCase();
    for (const forbidden of ['deepest secret', 'tuesday', 'private masthead', key.toLowerCase(), secretKey.toLowerCase()]) expect(wire).not.toContain(forbidden);
    expect(request.headers()['authorization']).toMatch(/^Bearer [A-Za-z0-9_-]{43}$/u);
  }
  const body = JSON.parse(posts[0]?.postData() ?? '{}') as { records: { rid: string; blob: string | null }[] };
  expect(body.records.some((r) => r.rid === 'meta')).toBe(true);
  expect(body.records.every((r) => r.blob === null || /^[A-Za-z0-9_-]+$/u.test(r.blob))).toBe(true);
});

test('a key with no journal is refused, and a typo is explained', async ({ browser }) => {
  const stranger = await newDevice(browser);
  await stranger.page.goto('/');
  await stranger.page.getByRole('button', { name: /Restore it with your sync key/u }).click();
  await stranger.page.getByLabel('Sync key').fill('ABCD-EFGH');
  await stranger.page.getByRole('button', { name: 'Connect' }).click();
  await expect(stranger.page.getByRole('alert')).toContainText('28 characters');

  await stranger.page.getByLabel('Sync key').fill('0000-0000-0000-0000-0000-0000-0000');
  await stranger.page.getByRole('button', { name: 'Connect' }).click();
  await expect(stranger.page.getByRole('alert')).toContainText(/typo|doesn’t look right|mistyped/u);
});

test('disconnecting keeps local entries; deleting the cloud copy stops other devices cleanly', async ({ browser }) => {
  const laptop = await newDevice(browser);
  const phone = await newDevice(browser);
  await onboard(laptop.page);
  await jot(laptop.page, 'stays on every device');
  const key = await turnOnSync(laptop.page);
  await restoreFromKey(phone.page, key);

  // Laptop deletes the cloud copy.
  await laptop.page.goto('/settings');
  await laptop.page.getByRole('button', { name: 'Delete cloud copy' }).click();
  const confirm = laptop.page.getByRole('button', { name: 'Delete cloud copy' }).last();
  await expect(confirm).toBeDisabled();
  await laptop.page.getByLabel('Type DELETE to confirm').fill('delete');
  await confirm.click();
  await expect(laptop.page.getByText(/Off\. This journal lives only on this device/u)).toBeVisible();
  await laptop.page.goto('/');
  await expect(hasEntry(laptop.page, 'stays on every device')).toBeVisible(); // still theirs

  // The phone is told what happened, and keeps its entries.
  // It notices on its own (no manual sync): the connection is marked as needing attention and stops.
  await phone.page.goto('/settings');
  await expect(phone.page.getByText(/no longer matches a journal/u)).toBeVisible({ timeout: 15_000 });
  await expect(phone.page.getByRole('button', { name: 'Sync now' })).toHaveCount(0);
  await phone.page.getByRole('button', { name: 'Disconnect this device' }).click();
  await phone.page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(phone.page.getByText(/^Off\./u)).toBeVisible();
  await phone.page.goto('/');
  await expect(hasEntry(phone.page, 'stays on every device')).toBeVisible();
});

test('the connection survives a reload, and erase disconnects instead of pulling data back', async ({ browser }) => {
  const laptop = await newDevice(browser);
  await onboard(laptop.page);
  await jot(laptop.page, 'survives the reload');
  await turnOnSync(laptop.page);

  await laptop.page.reload();
  await expect(laptop.page.getByText(/^Synced |^Connected\./u)).toBeVisible();

  await laptop.page.getByRole('button', { name: 'Erase everything' }).click();
  await laptop.page.getByLabel(/Type ERASE to confirm/u).fill('ERASE');
  await laptop.page.getByRole('button', { name: 'Erase permanently' }).click();
  await expect(laptop.page.getByLabel('Name your magazine')).toBeVisible();
  await laptop.page.waitForTimeout(2500); // long enough for a sync round to have wrongly restored it
  await expect(laptop.page.getByLabel('Name your magazine')).toBeVisible();
});

test.describe('accessibility of the sync screens', () => {
  test('the Office with sync off, the join dialog, and the key dialog', async ({ browser }) => {
    const { page } = await newDevice(browser);
    await onboard(page);
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Turn on sync' })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Connect to your journal' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Turn on sync' }).click();
    await expect(page.getByTestId('sync-key')).toBeVisible();
    await expectAccessible(page);
  });

  test('the Office with sync on', async ({ browser }) => {
    const { page } = await newDevice(browser);
    await onboard(page);
    await turnOnSync(page);
    await expect(page.getByRole('button', { name: 'Show my key' })).toBeVisible();
    await expectAccessible(page);
  });
});
