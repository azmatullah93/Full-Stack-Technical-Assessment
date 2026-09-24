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

test('seeded visits replay as valid links and back/forward movements for every person', async () => {
  const sites = new Map(
    (await db.collection('sites').find().toArray()).map((site) => [site.address, site]),
  );
  for (const person of await db.collection('people').find().toArray()) {
    const visits = await db
      .collection('visits')
      .find({ personId: person._id })
      .sort({ visitedAt: 1 })
      .toArray();
    let trail = [];
    let cursor = -1;
    for (const visit of visits) {
      if (visit.source === 'back' || visit.source === 'forward') {
        cursor += visit.source === 'back' ? -1 : 1;
        assert.ok(cursor >= 0 && cursor < trail.length, 'Traversal stays within the trail');
        assert.equal(visit.address, trail[cursor]);
      } else {
        if (visit.source === 'link') {
          const previous = sites.get(trail[cursor]);
          assert.ok(previous, 'A link must originate on an existing page');
          assert.ok(
            previous.html.includes(`data-address="${visit.address}"`),
            `${trail[cursor]} must link to ${visit.address}`,
          );
        } else {
          assert.equal(visit.source, 'typed');
        }
        trail = [...trail.slice(0, cursor + 1), visit.address];
        cursor = trail.length - 1;
      }
      assert.equal(visit.outcome, sites.has(visit.address) ? 'found' : 'missing');
    }
    assert.equal(
      new Set(visits.filter((visit) => visit.outcome === 'found').map((visit) => visit.address))
        .size,
      10,
    );
    assert.ok(visits.some((visit) => visit.outcome === 'missing'));
    assert.ok(visits.some((visit) => visit.source === 'back'));
    assert.ok(visits.some((visit) => visit.source === 'forward'));
    assert.equal(Date.parse(visits.at(-1).visitedAt) - Date.parse(visits[0].visitedAt), 3_600_000);
  }
});

test('reseeding repairs old fixture visits while preserving user-created data', async () => {
  const visit = {
    _id: randomUUID(),
    personId: 'mira',
    address: 'personal.zz',
    source: 'typed',
    outcome: 'found',
    title: 'Personal',
    visitedAt: '2026-09-21T10:00:00.000Z',
  };
  const site = {
    address: 'personal.zz',
    title: 'Personal',
    authorId: 'mira',
    html: '<p>Personal notes</p>',
    text: 'Personal notes',
    publishedAt: visit.visitedAt,
  };
  const original = await db.collection('visits').findOne({ _id: 'seed-mira-007' });
  await db
    .collection('visits')
    .updateOne({ _id: original._id }, { $set: { address: 'repair-cafe.zz', source: 'back' } });
  await db.collection('visits').insertOne(visit);
  await db.collection('sites').insertOne(site);
  await seed();
  assert.deepEqual(await db.collection('visits').findOne({ _id: original._id }), original);
  assert.deepEqual(await db.collection('visits').findOne({ _id: visit._id }), visit);
  assert.deepEqual(await db.collection('sites').findOne({ address: site.address }), site);
  await db.collection('visits').deleteOne({ _id: visit._id });
  await db.collection('sites').deleteOne({ address: site.address });
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
