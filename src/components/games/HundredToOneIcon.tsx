import type { CSSProperties, ReactNode } from 'react';

export type HundredToOneIconName =
  | 'bell'
  | 'board'
  | 'check'
  | 'cross'
  | 'mic'
  | 'phone'
  | 'question'
  | 'shuffle'
  | 'timer'
  | 'trophy'
  | 'users';

const SVGS: Record<HundredToOneIconName, ReactNode> = {
  bell: (
    <>
      <path d="M5.5 14.2a6.5 6.5 0 0113 0" />
      <path d="M4 14.2h16v2.4a1.6 1.6 0 01-1.6 1.6H5.6A1.6 1.6 0 014 16.6z" />
      <path d="M12 5.2V3.4" />
      <path d="M6.9 6.6L5.7 5.2" />
      <path d="M17.1 6.6l1.2-1.4" />
    </>
  ),
  board: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5L19.5 6.5" />,
  cross: <path d="M7 7l10 10M17 7L7 17" />,
  mic: (
    <>
      <rect x="9.2" y="3" width="5.6" height="10.4" rx="2.8" />
      <path d="M6.5 11.8a5.5 5.5 0 0011 0" />
      <path d="M12 17.3v3.2" />
      <path d="M9.5 20.5h5" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
      <path d="M10.5 18.6h3" />
    </>
  ),
  question: (
    <>
      <path d="M4.5 16.2V6.9c0-1.3 1-2.4 2.3-2.4h10.4c1.3 0 2.3 1.1 2.3 2.4v6.5c0 1.3-1 2.3-2.3 2.3H9.6L6 18.9v-2.7z" />
      <path d="M10.5 8.3c.2-1 1-1.6 2-1.5 1 .1 1.7.9 1.6 1.9-.1 1.2-1.7 1.3-1.8 2.5" />
      <path d="M12.3 13.5v.01" />
    </>
  ),
  shuffle: (
    <>
      <path d="M4 8h13l-3-3" />
      <path d="M20 16H7l3 3" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.6V13l2.4 1.9" />
      <path d="M9.5 3.5h5" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v4.4a4.5 4.5 0 01-9 0z" />
      <path d="M7.5 5.4H4.8a2.9 2.9 0 002.9 3.3" />
      <path d="M16.5 5.4h2.7a2.9 2.9 0 01-2.9 3.3" />
      <path d="M12 12.9v3" />
      <path d="M8.7 20.5h6.6" />
      <path d="M12 15.9c-1.7 0-2.5 1.5-2.7 4.6h5.4c-.2-3.1-1-4.6-2.7-4.6z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.8-3.1 3-4.9 5.5-4.9s4.7 1.8 5.5 4.9" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M16 14.9c2.4-.4 4.4 1.1 5 4.6" />
    </>
  ),
};

const DEFAULT_CLASS = 'inline-block h-[1em] w-[1em] align-[-0.15em]';

export function HundredToOneIcon({
  name,
  className = DEFAULT_CLASS,
  style,
  strokeWidth = 1.8,
}: {
  name: HundredToOneIconName;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={style}
    >
      {SVGS[name]}
    </svg>
  );
}
