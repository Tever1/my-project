import type { CSSProperties, ReactNode } from 'react';

export type AliasIconName =
  | 'speech' | 'book' | 'letters' | 'shuffle' | 'mic' | 'talk'
  | 'hourglass' | 'check' | 'cross' | 'skip' | 'trophy' | 'medal';

const SVGS: Record<AliasIconName, ReactNode> = {
  speech: (
    <>
      <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M12 6C9.8 4.6 6.5 4.4 4 5v13c2.5-.6 5.8-.4 8 1 2.2-1.4 5.5-1.6 8-1V5c-2.5-.6-5.8-.4-8 1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 6v13" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  letters: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 15.5l3.5-8 3.5 8M9.7 12.8h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  shuffle: (
    <>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 2l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  talk: (
    <>
      <path d="M3 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-4 3V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M18 8.5c1.5.7 1.5 3.3 0 4M20.5 6.5c2.6 1.4 2.6 5.6 0 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6 3h12M6 21h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),
  check: (
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  cross: (
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  ),
  skip: (
    <>
      <path d="M5 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
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

export function AliasIcon({
  name,
  className = DEFAULT_CLASS,
  style,
}: {
  name: AliasIconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
      {SVGS[name]}
    </svg>
  );
}
