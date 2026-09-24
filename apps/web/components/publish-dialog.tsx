'use client';

import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { Person, Site } from '../lib/types';
import { Icon } from './icon';

const starterHtml =
  '<h1>My page</h1>\n<p>Write your page here.</p>\n<p>Visit <a href="tidepool.zz">the tidepool</a>.</p>';

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
        <span className="eyebrow">NEW SITE</span>
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
          <h2 id="publish-heading">Page published</h2>
          <p>
            Your page is live at <strong className="mono">{published.address}</strong>.
          </p>
          <button className="primary-button" onClick={() => onPublished(published)}>
            Visit your page <Icon name="forward" size={18} />
          </button>
        </div>
      ) : (
        <>
          <h2 id="publish-heading">Publish a page</h2>
          <p className="dialog-intro">Choose an address and author, then add your HTML.</p>
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
                  placeholder="my-page.zz"
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
                placeholder="Page title"
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
              <button
                className="secondary-button"
                type="button"
                disabled={saving}
                onClick={onClose}
              >
                Cancel
              </button>
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
