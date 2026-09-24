'use client';

import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { Person, Site } from '../lib/types';
import { Icon } from './icon';

const starterHtml =
  '<h1>A small thing worth sharing.</h1>\n<p>This is my corner of the small web.</p>\n<p>Take a walk to <a href="tidepool.zz">the tidepool</a>.</p>';

export function PublishDialog({
  people,
  personId,
  onClose,
  onPublished,
}: {
  people: Person[];
  personId: string;
  onClose: () => void;
  onPublished: (site: Site) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState('');
  const [authorId, setAuthorId] = useState(personId);
  const [html, setHtml] = useState(starterHtml);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState<Site | null>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      setPublished(
        await api.publish({ address: address.trim().toLowerCase(), title, html, authorId }),
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="publish-dialog"
      aria-labelledby="publish-heading"
      onCancel={(event) => {
        if (saving) event.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-top">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <button
          className="icon-button"
          disabled={saving}
          onClick={onClose}
          aria-label="Close publish dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {published ? (
        <div className="publish-success">
          <span className="success-icon">
            <Icon name="check" size={30} />
          </span>
          <h2 id="publish-heading">A new corner of the web.</h2>
          <p>
            Your page is live at <strong className="mono">{published.address}</strong>. Anyone can
            wander in.
          </p>
          <button className="primary-button" onClick={() => onPublished(published)}>
            Visit your page <Icon name="forward" size={18} />
          </button>
        </div>
      ) : (
        <>
          <h2 id="publish-heading">Leave a page of your own.</h2>
          <p className="dialog-intro">
            A thought, a field note, a little obsession. Every site starts with a person.
          </p>
          <form onSubmit={publish}>
            <div className="form-row">
              <label>
                Site address
                <input
                  autoFocus
                  required
                  maxLength={67}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="your-corner.zz"
                  spellCheck={false}
                  autoCapitalize="none"
                  pattern="[a-zA-Z0-9][a-zA-Z0-9\-]*\.zz"
                />
                <small>A unique address ending in .zz</small>
              </label>
              <label>
                Published by
                <select value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Page title
              <input
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give your page a name"
              />
            </label>
            <label>
              Your HTML
              <textarea
                required
                maxLength={100000}
                value={html}
                onChange={(event) => setHtml(event.target.value)}
                spellCheck={false}
                rows={8}
              />
            </label>
            <p className="publish-note">
              Headings, paragraphs, lists, tables, and inline text styles are welcome. Link to other
              .zz addresses with <code>&lt;a href="moss.zz"&gt;</code>. Scripts, forms, embeds, and
              external assets are removed.
            </p>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <span className="muted">One address. One little world.</span>
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? 'Publishing…' : 'Publish page'}
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </form>
        </>
      )}
    </dialog>
  );
}
