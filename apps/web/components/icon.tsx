import type { CSSProperties } from 'react';

const paths = {
  back: <path d="m14 5-7 7 7 7M7 12h14" />,
  forward: <path d="m10 5 7 7-7 7M3 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3Z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M5 19 19 5M5 5h14v14" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  leaf: (
    <>
      <path d="M20 4C7 2 2 8 5 15s15 7 15-11Z" />
      <path d="M4 21 16 9" />
    </>
  ),
} as const;

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
