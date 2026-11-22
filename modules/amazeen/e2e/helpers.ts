import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function onboard(page: Page, { sample = false, title = 'Field Notes' } = {}): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Name your magazine').fill(title);
  await page.getByRole('button', { name: sample ? 'Explore a sample archive' : 'Start with blank pages' }).click();
  await expect(page.getByRole('heading', { name: /Issue No\./ })).toBeVisible();
}

/** Fail on serious or critical accessibility violations (WCAG 2.1 AA). */
export async function expectAccessible(page: Page): Promise<void> {
  // Check the settled page, not a frame mid-fade (entrance animations briefly lower opacity).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(50);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    serious.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`),
  ).toEqual([]);
}
