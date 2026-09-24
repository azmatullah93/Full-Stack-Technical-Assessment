import type { SiteSummary } from '../lib/types';
import { Icon } from './icon';

export function HomePage({
  directory,
  onNavigate,
  onPublish,
}: {
  directory: SiteSummary[];
  onNavigate: (address: string) => void;
  onPublish: () => void;
}) {
  return (
    <div className="home-page">
      <div className="home-intro">
        <div>
          <span className="eyebrow">
            <span className="tiny-dot" /> INDEPENDENT PAGES. INTERESTING PEOPLE.
          </span>
          <h1>
            A little room
            <br />
            to <em>wander.</em>
          </h1>
          <p>
            No feeds. No rush. Just a collection of small places,
            <br className="desktop-break" /> and the people who made them.
          </p>
          <button className="text-link" onClick={() => onNavigate('tidepool.zz')}>
            Start at the tidepool <Icon name="forward" size={19} />
          </button>
        </div>
        <div className="wander-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="art-center">
            <Icon name="leaf" size={38} />
          </div>
          <span className="orbit-point point-one" />
          <span className="orbit-point point-two" />
          <span className="orbit-point point-three" />
          <span className="art-caption">GET A LITTLE LOST</span>
        </div>
      </div>
      <div className="directory-heading">
        <div>
          <span className="eyebrow">THE NEIGHBORHOOD</span>
          <h2>Every address is a doorway.</h2>
        </div>
        <span className="directory-count mono">{directory.length} places to begin</span>
      </div>
      <div className="directory-grid">
        {directory.map((site, index) => (
          <button
            key={site.address}
            className="directory-card"
            onClick={() => onNavigate(site.address)}
          >
            <span className="site-number mono">{String(index + 1).padStart(2, '0')}</span>
            <span className="directory-copy">
              <strong>{site.title}</strong>
              <span className="mono">{site.address}</span>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      </div>
      <div className="home-bottom">
        <Icon name="leaf" size={17} />
        <p>
          The web can be a garden.{' '}
          <button className="text-button" onClick={onPublish}>
            Plant something of your own.
          </button>
        </p>
      </div>
    </div>
  );
}
