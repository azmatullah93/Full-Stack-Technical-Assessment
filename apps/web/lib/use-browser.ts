'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, errorMessage } from './api';
import {
  createEntry,
  initialNavigation,
  pageAddress,
  pushPage,
  rememberPosition,
  traverse,
} from './navigation';
import type { BrowserPage, Navigation, ReadingPosition } from './navigation';
import type { NewVisit, VisitSource } from './types';
import { useVisitRecorder } from './use-visit-recorder';

const sessions = new Map<string, Navigation>();

export function useBrowser(personId: string, readPosition: () => ReadingPosition) {
  const [navigation, setNavigation] = useState<Navigation>(
    () => sessions.get(personId) ?? initialNavigation(),
  );
  const current = useRef(navigation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { recordVisit, visitError, historyVersion, retryVisits } = useVisitRecorder(personId);
  const operation = useRef<AbortController | null>(null);
  const arrival = useRef<{ entryId: string; visit: NewVisit } | null>(null);

  const update = useCallback(
    (next: Navigation) => {
      current.current = next;
      sessions.set(personId, next);
      setNavigation(next);
    },
    [personId],
  );

  useEffect(() => () => operation.current?.abort(), []);

  const savePosition = () => rememberPosition(current.current, readPosition());

  const prepareArrival = (next: Navigation, source: VisitSource) => {
    const entry = next.entries[next.index];
    const address = pageAddress(entry.page);
    arrival.current = address
      ? {
          entryId: entry.id,
          visit: {
            id: crypto.randomUUID(),
            personId,
            address,
            source,
            title: entry.page.kind === 'site' ? entry.page.site.title : 'Address not found',
            outcome: entry.page.kind === 'site' ? 'found' : 'missing',
          },
        }
      : null;
  };

  const displayed = useCallback(
    (entryId: string) => {
      if (arrival.current?.entryId !== entryId) return;
      const { visit } = arrival.current;
      arrival.current = null;
      recordVisit(visit);
    },
    [recordVisit],
  );

  const cancelRequest = () => {
    operation.current?.abort();
    operation.current = null;
    setLoading(false);
  };

  const commit = (page: BrowserPage, source: VisitSource) => {
    const next = pushPage(savePosition(), createEntry(page));
    prepareArrival(next, source);
    update(next);
  };

  const navigate = async (input: string, source: VisitSource = 'typed') => {
    cancelRequest();
    const address = input.trim().toLowerCase();
    if (!/^(?=.{4,67}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.zz$/.test(address)) {
      setError('Use a small-web address such as tidepool.zz.');
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setLoading(true);
    setError('');
    try {
      let page: BrowserPage;
      try {
        page = { kind: 'site', site: await api.site(address, controller.signal) };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) page = { kind: 'missing', address };
        else throw error;
      }
      if (!controller.signal.aborted) commit(page, source);
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error));
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setLoading(false);
      }
    }
  };

  const search = async (input: string) => {
    cancelRequest();
    const query = input.trim();
    if (!query || query.length > 200) {
      setError('Enter between 1 and 200 characters to search.');
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setLoading(true);
    setError('');
    try {
      const results = await api.search(query, controller.signal);
      if (!controller.signal.aborted) commit({ kind: 'search', query, results }, 'search');
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error));
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setLoading(false);
      }
    }
  };

  const go = (direction: -1 | 1) => {
    cancelRequest();
    setError('');
    const saved = savePosition();
    const next = traverse(saved, direction);
    if (next.index === saved.index) return;
    prepareArrival(next, direction === -1 ? 'back' : 'forward');
    update(next);
  };

  const home = () => {
    cancelRequest();
    setError('');
    commit({ kind: 'home' }, 'typed');
  };
  const remember = () => {
    cancelRequest();
    update(savePosition());
  };

  return {
    entry: navigation.entries[navigation.index],
    canBack: navigation.index > 0,
    canForward: navigation.index < navigation.entries.length - 1,
    loading,
    error,
    visitError,
    historyVersion,
    navigate,
    search,
    go,
    home,
    displayed,
    retryVisits,
    remember,
  };
}
