import { Icon } from './icon';

export function MissingPage({
  address,
  canBack,
  onBack,
  onHome,
}: {
  address: string;
  canBack: boolean;
  onBack: () => void;
  onHome: () => void;
}) {
  return (
    <section className="missing-page">
      <span className="eyebrow">404</span>
      <h1>Address not found</h1>
      <p>
        There’s no page at <strong className="mono">{address}</strong>.<br />
        Check the address or choose a site from the directory.
      </p>
      <div>
        <button className="primary-button" disabled={!canBack} onClick={onBack}>
          <Icon name="back" size={18} />
          Go back
        </button>
        <button className="secondary-button" onClick={onHome}>
          Browse sites
        </button>
      </div>
    </section>
  );
}
