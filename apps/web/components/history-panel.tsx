'use client';

import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { HistoryPage } from '../lib/types';
import { Icon } from './icon';

export function HistoryPanel({
  personId,
  name,
  version,
  onNavigate,
  onClose,
}: {
  personId: string;
  name: string;
  version: number;
  onNavigate: (address: string) => void;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<HistoryPage>({ items: [], nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setLoading(true);
    setError('');
    api
      .history(personId, undefined, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setHistory(page);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => request.current?.abort();
  }, [personId, version, retry]);

  const more = async () => {
    if (!history.nextCursor || loading) return;
    setLoading(true);
    setError('');
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    try {
      const next = await api.history(personId, history.nextCursor, controller.signal);
      if (controller.signal.aborted) return;
      setHistory((previous) => ({
        items: [
          ...previous.items,
          ...next.items.filter(
            (item) => !previous.items.some((existing) => existing.id === item.id),
          ),
        ],
        nextCursor: next.nextCursor,
      }));
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <aside className="history-panel" aria-label="Browsing history">
      <div className="history-heading">
        <div>
          <span className="eyebrow">BROWSING</span>
          <h2>History</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close history">
          <Icon name="close" size={18} />
        </button>
      </div>
      <p className="history-person">Places visited by {name.split(' ')[0]}.</p>
      <div className="history-list">
        {!loading && !error && !history.items.length && <p className="muted">No visits yet.</p>}
        {history.items.map((visit, index) => {
          const date = new Date(visit.visitedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const previousDate = index
            ? new Date(history.items[index - 1].visitedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : null;
          return (
            <div key={visit.id}>
              {date !== previousDate && <h3 className="history-date">{date}</h3>}
              <button className="history-item" onClick={() => onNavigate(visit.address)}>
                <span className={`visit-dot ${visit.outcome === 'missing' ? 'missing' : ''}`} />
                <span className="history-item-copy">
                  <strong>{visit.title}</strong>
                  <span className="mono">{visit.address}</span>
                  <small>
                    {new Date(visit.visitedAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {visit.source}
                    {visit.outcome === 'missing' ? ' · not found' : ''}
                  </small>
                </span>
              </button>
            </div>
          );
        })}
        {error && (
          <div className="inline-error" role="alert">
            {error}
            <button className="text-button" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </button>
          </div>
        )}
        {loading && (
          <p className="muted" role="status">
            Loading visits…
          </p>
        )}
        {history.nextCursor && (
          <button className="secondary-button load-more" disabled={loading} onClick={more}>
            Earlier visits <Icon name="history" size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
