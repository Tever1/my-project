import type { CSSProperties, ReactNode } from 'react';

export type WhoAmIIconName =
  | 'profile'
  | 'star'
  | 'pointer'
  | 'check'
  | 'cross'
  | 'celebrate'
  | 'trophy'
  | 'medal';

const SVGS: Record<WhoAmIIconName, ReactNode> = {
  profile: (
    <>
      <circle cx="12" cy="9.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c0-3.6 3.2-6.3 7-6.3s7 2.7 7 6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17.1 5c.5-1 1.9-1 2.4.1.4.8-.1 1.3-.6 1.7-.4.4-.6.7-.6 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="18.4" cy="9.3" r=".55" fill="currentColor" />
    </>
  ),
  star: (
    <path d="M12 2.5l2.6 5.9 6.4.6-4.9 4.3 1.5 6.2L12 16.4l-5.6 3.1 1.5-6.2-4.9-4.3 6.4-.6L12 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  pointer: (
    <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  check: (
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  cross: (
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  ),
  celebrate: (
    <>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v3M4.2 4.2l2.1 2.1M2 12h3M4.2 19.8l2.1-2.1M19.8 4.2l-2.1 2.1M22 12h-3M19.8 19.8l-2.1-2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  medal: (
    <>
      <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </>
  ),
};

const DEFAULT_CLASS = 'inline-block h-[1em] w-[1em] align-[-0.15em]';

export function WhoAmIIcon({
  name,
  className = DEFAULT_CLASS,
  style,
}: {
  name: WhoAmIIconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
      {SVGS[name]}
    </svg>
  );
}
