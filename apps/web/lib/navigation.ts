import type { SearchResult, Site } from './types';

export interface ReadingPosition {
  scrollTop: number;
  openDetails: number[];
}
export type BrowserPage =
  | { kind: 'home' }
  | { kind: 'site'; site: Site }
  | { kind: 'missing'; address: string }
  | { kind: 'search'; query: string; results: SearchResult[] };
export interface Entry {
  id: string;
  page: BrowserPage;
  position: ReadingPosition;
}
export interface Navigation {
  entries: Entry[];
  index: number;
}

export function createEntry(page: BrowserPage, id = crypto.randomUUID()): Entry {
  return { id, page, position: { scrollTop: 0, openDetails: [] } };
}

export function initialNavigation(): Navigation {
  return { entries: [createEntry({ kind: 'home' })], index: 0 };
}

export function rememberPosition(state: Navigation, position: ReadingPosition): Navigation {
  return {
    ...state,
    entries: state.entries.map((entry, index) =>
      index === state.index ? { ...entry, position } : entry,
    ),
  };
}

export function pushPage(state: Navigation, entry: Entry): Navigation {
  const entries = [...state.entries.slice(0, state.index + 1), entry];
  return { entries, index: entries.length - 1 };
}

export function traverse(state: Navigation, direction: -1 | 1): Navigation {
  const index = state.index + direction;
  return index >= 0 && index < state.entries.length ? { ...state, index } : state;
}

export function pageAddress(page: BrowserPage): string {
  if (page.kind === 'site') return page.site.address;
  if (page.kind === 'missing') return page.address;
  return '';
}
