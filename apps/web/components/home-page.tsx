import type { Person, SiteSummary } from '../lib/types';
import { Icon } from './icon';

export function HomePage({
  directory,
  people,
  onNavigate,
  onPublish,
}: {
  directory: SiteSummary[];
  people: Person[];
  onNavigate: (address: string) => void;
  onPublish: () => void;
}) {
  return (
    <section className="home-page">
      <div className="directory-heading">
        <div>
          <h1>Site directory</h1>
          <p>Open a site below, or enter a .zz address above.</p>
        </div>
        <span className="directory-count">{directory.length} sites</span>
      </div>
      <div className="directory-columns" aria-hidden="true">
        <span>Site</span>
        <span>Author</span>
        <span />
      </div>
      <div className="directory-grid">
        {directory.map((site) => (
          <button
            key={site.address}
            className="directory-card"
            onClick={() => onNavigate(site.address)}
          >
            <span className="directory-site">
              <span className="site-initial" aria-hidden="true">
                {site.address[0].toUpperCase()}
              </span>
              <span className="directory-copy">
                <strong>{site.title}</strong>
                <span className="mono">{site.address}</span>
              </span>
            </span>
            <span className="directory-author">
              {people.find((person) => person.id === site.authorId)?.name ?? 'Unknown author'}
            </span>
            <Icon name="forward" size={16} />
          </button>
        ))}
      </div>
      <div className="home-bottom">
        <p>
          Have something to add?{' '}
          <button className="text-button" onClick={onPublish}>
            Publish a page
          </button>
        </p>
      </div>
    </section>
  );
}
