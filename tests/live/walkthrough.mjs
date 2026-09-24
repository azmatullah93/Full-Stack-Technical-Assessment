import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017');
const db = client.db(process.env.MONGODB_DATABASE ?? 'small_web');
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const baseUrl = process.env.WEB_URL ?? 'http://localhost:3000';
const address = `smoke-${randomUUID().slice(0, 8)}.zz`;
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await client.connect();
  await mkdir('test-results', { recursive: true });
  await page.goto(baseUrl);
  await expect(page.getByRole('heading', { name: 'Site directory' })).toBeVisible({
    timeout: 20_000,
  });
  await expect.poll(() => page.locator('.directory-card').count()).toBeGreaterThanOrEqual(10);
  await page.screenshot({ path: 'test-results/live-desktop.png', fullPage: true });

  await page.locator('.directory-card').filter({ hasText: 'tidepool.zz' }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('The ocean, at ankle height.');
  await page.screenshot({ path: 'test-results/live-reading.png', fullPage: true });
  for (const link of [
    'A slower kind of garden',
    'From the very small to the very distant',
    'Listen to the sky',
  ]) {
    await page.frameLocator('iframe').getByRole('link', { name: link }).click();
  }
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(
    'There is somebody out there.',
  );
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(
    'A clear sky is an invitation.',
  );
  await page.getByRole('button', { name: 'Forward', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(
    'There is somebody out there.',
  );

  await page.getByRole('textbox', { name: 'Search the small web' }).fill('poikilohydry');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(
    'Pay attention to the overlooked.',
  );
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Results for “poikilohydry”' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Site address', exact: true }).fill('lost-lighthouse.zz');
  await page.getByRole('button', { name: 'Go to address', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Address not found' })).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('.history-item').first()).toContainText('lost-lighthouse.zz');
  await page.getByRole('button', { name: 'Earlier visits' }).click();
  await expect.poll(() => page.locator('.history-item').count()).toBeGreaterThan(30);
  await page.getByRole('button', { name: 'Close history' }).click();

  await page.getByRole('button', { name: 'Publish a page', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Site address').fill(address);
  await dialog.getByLabel('Page title').fill('A test garden');
  await dialog.getByLabel('Published by').selectOption('eli');
  await dialog
    .getByLabel('Your HTML')
    .fill(
      '<h1>A test garden</h1><p>Chrysanthemum notes.</p><script>parent.document.body.innerHTML="escaped"</script><p><a href="moss.zz">Visit moss</a></p>',
    );
  await dialog.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Page published' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Visit your page' }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('A test garden');
  await expect(page.getByText('A page by Eli Brooks')).toBeVisible();
  await expect.poll(() => db.collection('visits').countDocuments({ address })).toBe(1);
  await page.frameLocator('iframe').getByRole('link', { name: 'Visit moss' }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(
    'Pay attention to the overlooked.',
  );

  await db.collection('sites').deleteOne({ address });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  await expect(page.getByRole('heading', { name: 'Site directory' })).toBeVisible();
  await page.screenshot({ path: 'test-results/live-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    'Live walkthrough passed: linked trail, back/forward, search and return, missing address, history pagination, publishing, HTML containment, and mobile layout.',
  );
} catch (error) {
  console.error(
    await page
      .locator('body')
      .innerText()
      .catch(() => 'Page unavailable'),
  );
  throw error;
} finally {
  // Only remove the unique page created by this run. Browsing visits remain as normal history.
  await db.collection('sites').deleteOne({ address });
  await db.collection('visits').deleteMany({ address });
  await client.close();
  await browser.close();
}
