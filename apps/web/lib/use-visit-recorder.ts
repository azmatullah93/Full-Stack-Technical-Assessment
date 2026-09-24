'use client';

import { useSyncExternalStore } from 'react';
import { api } from './api';
import type { NewVisit } from './types';

interface PendingVisit {
  visit: NewVisit;
  failed: boolean;
}
interface Snapshot {
  pending: PendingVisit[];
  historyVersion: number;
}

const listeners = new Set<() => void>();
const pending = new Map<string, PendingVisit>();
const emptySnapshot: Snapshot = { pending: [], historyVersion: 0 };
let snapshot = emptySnapshot;

function notify(saved = false) {
  snapshot = {
    pending: [...pending.values()],
    historyVersion: snapshot.historyVersion + Number(saved),
  };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function save(visit: NewVisit) {
  pending.set(visit.id, { visit, failed: false });
  notify();
  try {
    await api.visit(visit);
    pending.delete(visit.id);
    notify(true);
  } catch {
    pending.set(visit.id, { visit, failed: true });
    notify();
  }
}

function recordVisit(visit: NewVisit) {
  if (!pending.has(visit.id)) void save(visit);
}

// Keep unsuccessful saves outside a person's mounted workspace. Switching names
// must not discard a failed visit, and retrying must reuse its original id.
export function useVisitRecorder(personId: string) {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => emptySnapshot,
  );
  const failed = state.pending.filter((item) => item.failed && item.visit.personId === personId);
  return {
    recordVisit,
    historyVersion: state.historyVersion,
    visitError: failed.length ? 'A visit could not be saved to history.' : '',
    retryVisits: () => Promise.all(failed.map((item) => save(item.visit))),
  };
}
