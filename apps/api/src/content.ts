import sanitizeHtml from 'sanitize-html';
import { Parser } from 'htmlparser2';

export const ADDRESS_PATTERN = /^(?=.{4,67}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.zz$/;

export function normalizeAddress(value: string): string | null {
  const address = value.trim().toLowerCase();
  return ADDRESS_PATTERN.test(address) ? address : null;
}

// Authors get document markup and inline typography, never executable content.
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'article',
      'section',
      'header',
      'footer',
      'main',
      'nav',
      'aside',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'div',
      'span',
      'a',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'small',
      'mark',
      'sub',
      'sup',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'dl',
      'dt',
      'dd',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'caption',
      'details',
      'summary',
    ],
    allowedAttributes: {
      '*': ['style', 'id'],
      a: ['data-address', 'href'],
      ol: ['start'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedStyles: {
      '*': {
        color: [/^(#[\da-f]{3,8}|[a-z]+)$/i],
        'background-color': [/^(#[\da-f]{3,8}|[a-z]+)$/i],
        'text-align': [/^(left|right|center|justify)$/],
        'font-style': [/^(normal|italic)$/],
        'font-weight': [/^(normal|bold|[1-9]00)$/],
        'font-size': [/^(\d{1,2}(\.\d+)?)(px|em|rem)$/],
        'font-family': [/^[a-z ,'-]+$/i],
      },
    },
    transformTags: {
      a: (_tag, attributes) => {
        const address = normalizeAddress(attributes.href ?? '');
        const fragment = /^#[a-z][\w-]*$/i.test(attributes.href ?? '') ? attributes.href : null;
        return {
          tagName: 'a',
          attribs: {
            ...(address
              ? { href: '#', 'data-address': address }
              : fragment
                ? { href: fragment }
                : {}),
            ...(attributes.style ? { style: attributes.style } : {}),
          },
        };
      },
    },
    disallowedTagsMode: 'discard',
  });
}

const blockTags = new Set([
  'article',
  'section',
  'header',
  'footer',
  'main',
  'nav',
  'aside',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'div',
  'blockquote',
  'pre',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'caption',
  'details',
  'summary',
]);

export function visibleText(sanitizedHtml: string): string {
  const parts: string[] = [];
  const separateBlock = (tag: string) => {
    if (blockTags.has(tag)) parts.push(' ');
  };
  const parser = new Parser(
    {
      onopentag: separateBlock,
      onclosetag: separateBlock,
      ontext: (text) => {
        parts.push(text);
      },
    },
    { decodeEntities: true },
  );
  parser.end(sanitizedHtml);
  return parts.join('').replace(/\s+/g, ' ').trim();
}
