import { describe, expect, it } from 'vitest';
import { createEntry, initialNavigation, pushPage, rememberPosition, traverse } from './navigation';
import type { Site } from './types';

const site = (address: string): Site => ({
  address,
  title: address,
  html: '<p>Original page</p>',
  authorId: 'mira',
  publishedAt: '2026-09-01',
});
const entry = (address: string) => createEntry({ kind: 'site', site: site(address) });

describe('browser navigation', () => {
  it('retraces a four-page trail without creating extra entries', () => {
    const addresses = ['a.zz', 'b.zz', 'c.zz', 'd.zz'];
    let state = addresses.reduce(
      (state, address) => pushPage(state, entry(address)),
      initialNavigation(),
    );
    const entries = state.entries;
    for (let index = 3; index >= 0; index--) {
      state = traverse(state, -1);
      expect(state.index).toBe(index);
    }
    expect(traverse(state, -1)).toBe(state);
    for (let index = 1; index <= 4; index++) {
      state = traverse(state, 1);
      expect(state.index).toBe(index);
    }
    expect(traverse(state, 1)).toBe(state);
    expect(state.entries).toBe(entries);
  });
  it('drops only the forward branch after a new arrival', () => {
    let state = ['a.zz', 'b.zz', 'c.zz'].reduce(
      (state, address) => pushPage(state, entry(address)),
      initialNavigation(),
    );
    state = traverse(traverse(state, -1), -1);
    state = pushPage(state, entry('d.zz'));
    expect(
      state.entries.map((e) => (e.page.kind === 'site' ? e.page.site.address : 'home')),
    ).toEqual(['home', 'a.zz', 'd.zz']);
    expect(traverse(state, 1)).toBe(state);
  });
  it('restores the exact page snapshot, scroll offset, and expanded details', () => {
    let state = pushPage(initialNavigation(), entry('a.zz'));
    state = rememberPosition(state, { scrollTop: 438, openDetails: [0, 2] });
    const saved = state.entries[1];
    state = traverse(pushPage(state, entry('b.zz')), -1);
    expect(state.entries[state.index]).toBe(saved);
    expect(saved.position).toEqual({ scrollTop: 438, openDetails: [0, 2] });
    expect(saved.page.kind === 'site' && saved.page.site.html).toBe('<p>Original page</p>');
  });
  it('keeps repeated addresses as distinct entries with independent positions', () => {
    let state = pushPage(initialNavigation(), entry('a.zz'));
    state = rememberPosition(state, { scrollTop: 240, openDetails: [] });
    state = pushPage(state, entry('a.zz'));
    expect(state.entries[1].id).not.toBe(state.entries[2].id);
    expect(state.entries[2].position.scrollTop).toBe(0);
    expect(state.entries[1].position.scrollTop).toBe(240);
  });
  it('treats search results and missing addresses as normal restorable entries', () => {
    let state = pushPage(
      initialNavigation(),
      createEntry({
        kind: 'search',
        query: 'ocean',
        results: [{ ...site('a.zz'), excerpt: 'ocean prose' }],
      }),
    );
    state = rememberPosition(state, { scrollTop: 90, openDetails: [] });
    state = pushPage(state, createEntry({ kind: 'missing', address: 'never.zz' }));
    state = traverse(state, -1);
    expect(state.entries[state.index].page).toMatchObject({
      kind: 'search',
      query: 'ocean',
      results: [{ excerpt: 'ocean prose' }],
    });
    expect(state.entries[state.index].position.scrollTop).toBe(90);
  });
});
