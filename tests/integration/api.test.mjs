import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { after, before, test } from 'node:test';
import { MongoClient } from 'mongodb';

const run = promisify(execFile);
const databaseName = `small_web_test_${randomUUID().replaceAll('-', '')}`;
const env = { ...process.env, MONGODB_DATABASE: databaseName, PORT: '3101' };
const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017');
const db = client.db(databaseName);
const base = 'http://127.0.0.1:3101/api';
let server;
let serverOutput = '';

async function seed() {
  await run(process.execPath, ['apps/api/dist/seed.js'], { env });
}

async function request(path, body) {
  return fetch(
    `${base}${path}`,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : undefined,
  );
}

before(async () => {
  await client.connect();
  await seed();
  server = spawn(process.execPath, ['apps/api/dist/main.js'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => {
    serverOutput += chunk;
  });
  server.stderr.on('data', (chunk) => {
    serverOutput += chunk;
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      if ((await request('/health')).ok) return;
    } catch {
      /* The server is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`API did not start. ${serverOutput}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, 'exit');
  }
  // This name is generated above; never reset the developer's small_web database.
  if (databaseName.startsWith('small_web_test_')) await db.dropDatabase();
  await client.close();
});

test('seeding twice preserves all sites, people, and the hour of visits', async () => {
  const snapshot = async () =>
    Promise.all(
      ['sites', 'people', 'visits'].map((name) =>
        db.collection(name).find().sort({ _id: 1 }).toArray(),
      ),
    );
  const before = await snapshot();
  assert.deepEqual(
    before.map((items) => items.length),
    [10, 5, 101],
  );
  await seed();
  assert.deepEqual(await snapshot(), before);
  const times = before[2].map((visit) => Date.parse(visit.visitedAt));
  assert.equal(Math.max(...times) - Math.min(...times), 3_600_000);
});

test('resolves canonical addresses and searches text that is absent from the title', async () => {
  const resolved = await request('/sites/TIDEPOOL.ZZ');
  assert.equal(resolved.status, 200);
  assert.equal((await resolved.json()).address, 'tidepool.zz');
  assert.equal((await request('/sites/never-existed.zz')).status, 404);
  assert.equal((await request('/sites/example.com')).status, 400);
  const results = await (await request('/search?q=poikilohydry')).json();
  assert.equal(results.length, 1);
  assert.equal(results[0].address, 'moss.zz');
  assert.match(results[0].excerpt, /poikilohydry/i);
  assert.equal(results[0].html, undefined);
});

test('publishes sanitized content, indexes its prose, and rejects duplicate addresses', async () => {
  const body = {
    address: ' New-Garden.ZZ ',
    title: 'A new garden',
    authorId: 'eli',
    html: '<h1>Garden</h1><p>Chrysanthemum cultivation.</p><script>window.secret="unsearchablepayload"</script><iframe src="https://evil.test"></iframe><a href="moss.zz" target="_top">Moss</a>',
  };
  const response = await request('/sites', body);
  assert.equal(response.status, 201);
  const site = await response.json();
  assert.equal(site.address, 'new-garden.zz');
  assert.equal(site.authorId, 'eli');
  assert.doesNotMatch(site.html, /script|iframe|_top|unsearchablepayload/);
  assert.match(site.html, /data-address="moss.zz"/);
  assert.equal((await request('/sites', body)).status, 409);
  const results = await (await request('/search?q=chrysanthemum')).json();
  assert.equal(results[0].address, 'new-garden.zz');
  assert.deepEqual(await (await request('/search?q=unsearchablepayload')).json(), []);
});

test('validates publication and query input at the API boundary', async () => {
  const valid = { address: 'valid.zz', title: 'Valid', authorId: 'mira', html: '<p>Hello</p>' };
  for (const body of [
    { ...valid, address: 'https://evil.test' },
    { ...valid, title: '  ' },
    { ...valid, html: '<script>alert(1)</script>' },
    { ...valid, unexpected: true },
  ]) {
    assert.equal((await request('/sites', body)).status, 400);
  }
  assert.equal((await request('/sites', { ...valid, authorId: 'unknown' })).status, 404);
  assert.equal((await request('/search?q=')).status, 400);
  assert.equal((await request('/search?q=one&q=two')).status, 400);
  assert.equal((await request('/people/mira/history?cursor=invalid')).status, 400);
  assert.equal((await request('/people/mira/history?cursor=one&cursor=two')).status, 400);
});

test('history is per person, cursor-paginated, and visit retries are idempotent', async () => {
  const first = await (await request('/people/mira/history')).json();
  assert.equal(first.items.length, 30);
  assert.ok(first.nextCursor);
  const second = await (await request(`/people/mira/history?cursor=${first.nextCursor}`)).json();
  assert.equal(second.items.length, 11);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.items, ...second.items].map((visit) => visit.id)).size, 41);
  assert.ok([...first.items, ...second.items].every((visit) => visit.personId === 'mira'));
  const visit = {
    id: randomUUID(),
    personId: 'eli',
    address: 'never-existed.zz',
    title: 'Address not found',
    source: 'typed',
    outcome: 'missing',
  };
  assert.equal((await request('/visits', visit)).status, 201);
  assert.equal((await request('/visits', visit)).status, 201);
  assert.equal(await db.collection('visits').countDocuments({ _id: visit.id }), 1);
  const history = await (await request('/people/eli/history')).json();
  assert.equal(history.items[0].id, visit.id);
  assert.equal(history.items[0].outcome, 'missing');
  assert.ok(history.items.every((item) => item.personId === 'eli'));
});
