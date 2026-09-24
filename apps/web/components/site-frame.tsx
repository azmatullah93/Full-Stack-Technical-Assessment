'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ReadingPosition } from '../lib/navigation';
import { documentHtml } from '../lib/frame-document';

export interface SiteFrameHandle {
  readPosition: () => ReadingPosition;
}

export const SiteFrame = forwardRef<
  SiteFrameHandle,
  {
    html: string;
    title: string;
    position: ReadingPosition;
    onNavigate: (address: string) => void;
    onDisplayed: () => void;
  }
>(function SiteFrame({ html, title, position, onNavigate, onDisplayed }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onNavigate, onDisplayed });
  callbacks.current = { onNavigate, onDisplayed };

  useEffect(() => () => cleanup.current?.(), []);

  useImperativeHandle(
    ref,
    () => ({
      readPosition() {
        const document = frame.current?.contentDocument;
        return {
          scrollTop: document?.scrollingElement?.scrollTop ?? 0,
          openDetails: Array.from(document?.querySelectorAll('details') ?? []).flatMap(
            (details, index) => (details.open ? [index] : []),
          ),
        };
      },
    }),
    [],
  );

  const loaded = () => {
    const document = frame.current?.contentDocument;
    if (!document) return;
    cleanup.current?.();
    document.querySelectorAll('details').forEach((details, index) => {
      details.open = position.openDetails.includes(index);
    });
    if (document.scrollingElement) document.scrollingElement.scrollTop = position.scrollTop;
    const followLink = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest?.('a');
      if (!link) return;
      event.preventDefault();
      const address = link.getAttribute('data-address');
      if (address) callbacks.current.onNavigate(address);
      else {
        const fragment = link.getAttribute('href');
        if (fragment?.startsWith('#')) document.getElementById(fragment.slice(1))?.scrollIntoView();
      }
    };
    document.addEventListener('click', followLink);
    document.addEventListener('auxclick', followLink);
    cleanup.current = () => {
      document.removeEventListener('click', followLink);
      document.removeEventListener('auxclick', followLink);
    };
    callbacks.current.onDisplayed();
  };

  // No allow-scripts: author markup cannot run, even if sanitization misses something.
  // Same-origin lets the parent capture links and restore reading position without a script bridge.
  return (
    <iframe
      ref={frame}
      title={title}
      className="site-frame"
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={documentHtml(html)}
      onLoad={loaded}
    />
  );
});
