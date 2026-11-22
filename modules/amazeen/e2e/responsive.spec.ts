import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { onboard } from './helpers';

/**
 * Responsive guard: every main screen, at phone through desktop widths, must not scroll sideways,
 * must not let text spill out of its own box, must not set readable text below 11px, and must give controls at least a 24×24px target
 * (WCAG 2.2 AA 2.5.8). Decorative thumbnails (aria-hidden covers) and screen-reader-only text are
 * excluded. Runs once, in the desktop project, with explicit viewports.
 */
const WIDTHS = [320, 375, 768, 1024, 1440];

interface Findings {
  docOverflow: number;
  overflow: string[];
  spills: string[];
  smallText: string[];
  smallTargets: string[];
}

async function audit(page: Page): Promise<Findings> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
    };
    const skip = (el: Element) => el.closest('.visually-hidden, [aria-hidden="true"] article, article[aria-hidden="true"]');
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    const label = (el: Element) => `${el.tagName.toLowerCase()} "${((el as HTMLElement).innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;
    const f = { docOverflow: document.documentElement.scrollWidth - vw, overflow: [] as string[], spills: [] as string[], smallText: [] as string[], smallTargets: [] as string[] };
    for (const el of document.querySelectorAll('body *')) {
      if (!shown(el) || skip(el)) continue;
      const r = el.getBoundingClientRect();
      if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) f.overflow.push(label(el));
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (hasText && parseFloat(getComputedStyle(el).fontSize) < 11) {
        f.smallText.push(`${label(el)} ${getComputedStyle(el).fontSize}`);
      }
      // Text that spills out of its own box (e.g. a label wider than its grid column, running
      // into its neighbour), unless the box deliberately truncates with an ellipsis or scrolls.
      const cs = getComputedStyle(el);
      if (hasText && cs.display !== 'inline' && el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && !['auto', 'scroll'].includes(cs.overflowX) && !el.matches('input, textarea, select')) {
        f.spills.push(`${label(el)} ${el.scrollWidth}>${el.clientWidth}`);
      }
      const control = el.matches('a[href], button, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea, [role=switch]');
      const inlineLink = el.matches('a') && getComputedStyle(el).display === 'inline' && el.closest('p');
      if (control && !inlineLink && (r.width < 24 || r.height < 24)) f.smallTargets.push(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return f;
  });
}

test.describe('responsive & readable', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const width of WIDTHS) {
    test(`all main screens at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop-chrome', 'viewports are set explicitly; one project is enough');
      await page.setViewportSize({ width, height: width < 800 ? 780 : 900 });
      await onboard(page, { sample: true, title: 'The Sunday Correspondent' });
      await page.goto('/shelf');
      const issueHref = await page.locator('a[href^="/issue/"]').nth(1).getAttribute('href');
      const routes = ['/', '/write/story', '/write/list', '/shelf', '/shelf?q=bread', '/settings', '/privacy'];
      for (let p = 1; p <= 7; p++) routes.push(`${issueHref}?p=${p}`);
      for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(250);
        const f = await audit(page);
        expect.soft(f, `${route} at ${width}px`).toEqual({ docOverflow: 0, overflow: [], spills: [], smallText: [], smallTargets: [] });
      }
    });
  }
});

const CLEAN = { docOverflow: 0, overflow: [], smallText: [], smallTargets: [] };
const pick = (f: Awaited<ReturnType<typeof audit>>) => ({ docOverflow: f.docOverflow, overflow: f.overflow, smallText: f.smallText, smallTargets: f.smallTargets });

test.describe('sync dialogs stay readable at every width', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  for (const width of WIDTHS) {
    test(`join and key dialogs at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop-chrome', 'viewports are set explicitly; one project is enough');
      await page.setViewportSize({ width, height: width < 800 ? 780 : 900 });
      await onboard(page, { sample: true, title: 'The Sunday Correspondent' });
      await page.goto('/settings');

      await page.getByRole('button', { name: 'Connect to your journal' }).click();
      await page.getByRole('dialog').waitFor();
      await page.getByLabel('Sync key').fill('ABCD-EFGH-IJKL');
      await page.getByRole('button', { name: 'Connect', exact: true }).click();
      await page.getByRole('alert').waitFor();
      expect.soft(pick(await audit(page)), `join dialog at ${width}px`).toEqual(CLEAN);
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Turn on sync' }).click();
      await page.getByTestId('sync-key').waitFor();
      expect.soft(pick(await audit(page)), `key dialog at ${width}px`).toEqual(CLEAN);
    });
  }
});

test('the edition lamp: pulling the cord switches, a short tug does not', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chrome', 'pointer drag on the spine lamp');
  await page.setViewportSize({ width: 1280, height: 860 });
  await onboard(page);
  const lamp = page.getByRole('switch', { name: 'Night edition' }).first();
  const box = await lamp.boundingBox();
  if (!box) throw new Error('lamp not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height - 24;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 40, { steps: 6 });
  await page.mouse.up();
  await expect(lamp).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // A small, hesitant drag is neither a tap nor a pull.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 9, { steps: 3 });
  await page.mouse.up();
  await expect(lamp).toHaveAttribute('aria-checked', 'true');

  // Keyboard: ArrowDown pulls the cord too.
  await lamp.focus();
  await page.keyboard.press('ArrowDown');
  await expect(lamp).toHaveAttribute('aria-checked', 'false');
});
