'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { pageAddress } from '../lib/navigation';
import { useBrowser } from '../lib/use-browser';
import type { Person, Site, SiteSummary } from '../lib/types';
import { HistoryPanel } from './history-panel';
import { Icon } from './icon';
import { MissingPage } from './missing-page';
import { SearchPage } from './search-page';
import { HomePage } from './home-page';
import { PublishDialog } from './publish-dialog';
import { SiteFrame, type SiteFrameHandle } from './site-frame';

export function Browser() {
  const [people, setPeople] = useState<Person[]>([]);
  const [directory, setDirectory] = useState<SiteSummary[]>([]);
  const [personId, setPersonId] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setError('');
    Promise.all([api.people(), api.directory()])
      .then(([people, sites]) => {
        if (!alive) return;
        if (!people.length) {
          setError('The small web needs its first people. Run the seed command, then try again.');
          return;
        }
        setPeople(people);
        setDirectory(sites);
        setPersonId(people.find((person) => person.id === 'mira')?.id ?? people[0].id);
      })
      .catch((error) => {
        if (alive) setError(errorMessage(error));
      });
    return () => {
      alive = false;
    };
  }, [retry]);

  if (!personId)
    return (
      <main className="connection-screen">
        <span className="brand-mark">
          <Icon name="globe" size={28} />
        </span>
        <h1>Small Web</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="primary-button" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </button>
          </>
        ) : (
          <p role="status">Opening a little room to wander…</p>
        )}
      </main>
    );

  return (
    <BrowserWorkspace
      key={personId}
      people={people}
      person={people.find((person) => person.id === personId)!}
      directory={directory}
      onPersonChange={setPersonId}
      onPublished={(site) =>
        setDirectory((sites) => [
          site,
          ...sites.filter((existing) => existing.address !== site.address),
        ])
      }
    />
  );
}

function BrowserWorkspace({
  people,
  person,
  directory,
  onPersonChange,
  onPublished,
}: {
  people: Person[];
  person: Person;
  directory: SiteSummary[];
  onPersonChange: (id: string) => void;
  onPublished: (site: Site) => void;
}) {
  const frame = useRef<SiteFrameHandle>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const readPosition = useCallback(
    () =>
      frame.current?.readPosition() ?? {
        scrollTop: viewport.current?.scrollTop ?? 0,
        openDetails: [],
      },
    [],
  );
  const browser = useBrowser(person.id, readPosition);
  const { entry } = browser;
  const page = entry.page;
  const author =
    page.kind === 'site' ? people.find((person) => person.id === page.site.authorId) : null;

  useLayoutEffect(() => {
    setAddress(pageAddress(entry.page));
    setQuery(entry.page.kind === 'search' ? entry.page.query : '');
    if (viewport.current) viewport.current.scrollTop = entry.position.scrollTop;
  }, [entry]);

  useEffect(() => {
    if (entry.page.kind === 'missing') browser.displayed(entry.id);
  }, [entry, browser.displayed]);

  const visit = (address: string, source: 'typed' | 'link' | 'history' | 'search' = 'typed') => {
    void browser.navigate(address, source);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={browser.home} aria-label="Small Web home">
          <span className="brand-mark">
            <Icon name="globe" size={24} />
          </span>
          <span>
            small<span className="brand-serif">web</span>
            <span className="brand-period">.</span>
          </span>
        </button>
        <span className="header-caption">A LITTLE ROOM TO WANDER</span>
        <div className="header-actions">
          <label className="person-picker">
            <span className="avatar" style={{ background: person.color }}>
              {person.name
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </span>
            <span>
              <small>Browsing as</small>
              <select
                aria-label="Browsing as"
                value={person.id}
                onChange={(event) => {
                  browser.remember();
                  onPersonChange(event.target.value);
                }}
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <span className="header-divider" />
          <button className="primary-button" onClick={() => setPublishOpen(true)}>
            <Icon name="plus" size={17} />
            Publish a page
          </button>
        </div>
      </header>

      <section className="browser-window" aria-label="Small web browser">
        <div className="browser-toolbar">
          <nav className="navigation-buttons" aria-label="Page navigation">
            <button
              className="icon-button"
              aria-label="Back"
              title="Back"
              disabled={!browser.canBack}
              onClick={() => browser.go(-1)}
            >
              <Icon name="back" />
            </button>
            <button
              className="icon-button"
              aria-label="Forward"
              title="Forward"
              disabled={!browser.canForward}
              onClick={() => browser.go(1)}
            >
              <Icon name="forward" />
            </button>
            <button
              className="icon-button home-button"
              aria-label="Home"
              title="Home"
              onClick={browser.home}
            >
              <Icon name="home" size={18} />
            </button>
          </nav>
          <form
            className="address-form"
            onSubmit={(event) => {
              event.preventDefault();
              visit(address);
            }}
          >
            <Icon name="globe" size={16} />
            <input
              aria-label="Site address"
              placeholder="Enter a .zz address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              maxLength={200}
            />
            <button type="submit" aria-label="Go to address" title="Go to address">
              <Icon name="forward" size={18} />
            </button>
          </form>
          <button
            className={`history-toggle ${historyOpen ? 'selected' : ''}`}
            aria-label="History"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <Icon name="history" size={18} />
            <span>History</span>
          </button>
        </div>
        <div className="search-toolbar">
          <span className="web-label">
            <span className="status-dot" /> THE SMALL WEB
          </span>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void browser.search(query);
            }}
          >
            <Icon name="search" size={16} />
            <input
              aria-label="Search the small web"
              placeholder="Find something in the small web…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={200}
              required
            />
            <button type="submit">
              Search <span aria-hidden="true">↵</span>
            </button>
          </form>
        </div>
        {browser.loading && (
          <div className="loading-line" role="status">
            <span className="sr-only">Loading destination…</span>
          </div>
        )}
        {browser.error && (
          <div className="browser-error" role="alert">
            {browser.error}
          </div>
        )}
        {browser.visitError && (
          <div className="browser-error" role="alert">
            {browser.visitError}{' '}
            <button className="text-button" onClick={() => void browser.retryVisits()}>
              Retry saving
            </button>
          </div>
        )}
        <div className={`browser-body ${historyOpen ? 'with-history' : ''}`}>
          {historyOpen && (
            <HistoryPanel
              personId={person.id}
              name={person.name}
              version={browser.historyVersion}
              onNavigate={(address) => visit(address, 'history')}
              onClose={() => setHistoryOpen(false)}
            />
          )}
          <div className="page-area">
            {page.kind === 'site' && (
              <div className="page-byline">
                <span>
                  <span className="tiny-dot" /> {page.site.address}
                </span>
                <span>A page by {author?.name ?? 'a neighbor'}</span>
              </div>
            )}
            <div
              className={`page-viewport ${page.kind === 'site' ? 'has-frame' : ''}`}
              ref={viewport}
            >
              {page.kind === 'site' && (
                <SiteFrame
                  key={entry.id}
                  ref={frame}
                  html={page.site.html}
                  title={page.site.title}
                  position={entry.position}
                  onNavigate={(address) => visit(address, 'link')}
                  onDisplayed={() => browser.displayed(entry.id)}
                />
              )}
              {page.kind === 'home' && (
                <HomePage
                  directory={directory}
                  onNavigate={visit}
                  onPublish={() => setPublishOpen(true)}
                />
              )}
              {page.kind === 'search' && (
                <SearchPage
                  page={page}
                  people={people}
                  onNavigate={(address) => visit(address, 'search')}
                  onHome={browser.home}
                />
              )}
              {page.kind === 'missing' && (
                <MissingPage
                  address={page.address}
                  canBack={browser.canBack}
                  onBack={() => browser.go(-1)}
                  onHome={browser.home}
                />
              )}
            </div>
          </div>
        </div>
        <footer className="browser-footer">
          <span>
            <span className={`status-dot ${page.kind === 'missing' ? 'missing' : ''}`} />
            {browser.loading
              ? 'Finding your next stop…'
              : page.kind === 'site'
                ? 'You’re here. Stay a while.'
                : page.kind === 'missing'
                  ? 'Address not found'
                  : page.kind === 'search'
                    ? 'A few threads to follow.'
                    : 'A small web, with room for you.'}
          </span>
          <span className="mono">
            {page.kind === 'site' || page.kind === 'missing'
              ? pageAddress(page)
              : 'Made of people, not algorithms'}
          </span>
        </footer>
      </section>
      <footer className="app-footer">
        <span>A slower kind of internet.</span>
        <span>Read something. Follow a link. Make a little space.</span>
      </footer>
      {publishOpen && (
        <PublishDialog
          people={people}
          personId={person.id}
          onClose={() => setPublishOpen(false)}
          onPublished={(site) => {
            onPublished(site);
            setPublishOpen(false);
            visit(site.address);
          }}
        />
      )}
    </main>
  );
}
