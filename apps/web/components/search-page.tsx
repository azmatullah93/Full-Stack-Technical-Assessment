import type { BrowserPage } from '../lib/navigation';
import type { Person } from '../lib/types';
import { Icon } from './icon';

export function SearchPage({
  page,
  people,
  onNavigate,
  onHome,
}: {
  page: Extract<BrowserPage, { kind: 'search' }>;
  people: Person[];
  onNavigate: (address: string) => void;
  onHome: () => void;
}) {
  return (
    <section className="results-page">
      <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
      <h1>Looking for “{page.query}”</h1>
      <p className="results-count">
        {page.results.length} {page.results.length === 1 ? 'page' : 'pages'} found across titles and
        page text.
      </p>
      {page.results.length ? (
        <div className="results-list">
          {page.results.map((result) => (
            <button
              key={result.address}
              className="search-result"
              onClick={() => onNavigate(result.address)}
            >
              <span className="result-address mono">
                <Icon name="globe" size={14} />
                {result.address}
              </span>
              <h2>
                {result.title}
                <Icon name="arrow" size={20} />
              </h2>
              <p>{result.excerpt}</p>
              <span className="result-author">
                By {people.find((person) => person.id === result.authorId)?.name ?? 'a neighbor'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-results">
          <Icon name="search" size={30} />
          <h2>No paths crossed this time.</h2>
          <p>Try a different word, like “water”, “garden”, or “radio”.</p>
          <button className="secondary-button" onClick={onHome}>
            Explore the neighborhood
          </button>
        </div>
      )}
    </section>
  );
}
