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
      <span className="missing-symbol" aria-hidden="true">
        ?
      </span>
      <span className="eyebrow">A ROAD LESS TRAVELED</span>
      <h1>Nobody lives here. Yet.</h1>
      <p>
        There’s no page at <strong className="mono">{address}</strong>.<br />
        Maybe it never existed. Maybe it’s waiting for someone.
      </p>
      <div>
        <button className="primary-button" disabled={!canBack} onClick={onBack}>
          <Icon name="back" size={18} />
          Go back
        </button>
        <button className="secondary-button" onClick={onHome}>
          Back to the neighborhood
        </button>
      </div>
      <small>This address is still part of your journey.</small>
    </section>
  );
}
