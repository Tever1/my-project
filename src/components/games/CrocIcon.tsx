import type { CSSProperties, ReactNode } from 'react';

export type CrocIconName =
  | 'croc'
  | 'mic'
  | 'talk'
  | 'trophy'
  | 'crown'
  | 'check'
  | 'medal';

const RENDERERS: Record<Exclude<CrocIconName, 'croc'>, { viewBox: string; content: ReactNode }> = {
  mic: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 9a6 6 0 0012 0M10 15v3M7 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  trophy: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <path d="M5 3h10v4a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 4H3v2a2 2 0 002 2M15 4h2v2a2 2 0 01-2 2M10 12v3M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  crown: {
    viewBox: '0 0 20 20',
    content: (
      <path d="M3 7l3 3 4-6 4 6 3-3-1.5 9h-11L3 7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    ),
  },
  talk: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <path d="M3 5h10v7H7l-4 3V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M15 8c1.5.5 2 2 0 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  check: {
    viewBox: '0 0 20 20',
    content: (
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  medal: {
    viewBox: '0 0 20 20',
    content: (
      <>
        <path d="M7 2l2 5M13 2l-2 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="13" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 10.4l.9 1.9 2 .2-1.5 1.4.5 2-1.9-1.1-1.9 1.1.5-2L7.1 12.5l2-.2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      </>
    ),
  },
};

export function CrocIcon({
  name,
  className = '',
  style,
}: {
  name: CrocIconName;
  className?: string;
  style?: CSSProperties;
}) {
  if (name === 'croc') {
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: 'inline-block',
          backgroundColor: 'currentColor',
          color: '#f5efe6',
          WebkitMaskImage: 'url(/icons/crocodile/croc-face.png)',
          maskImage: 'url(/icons/crocodile/croc-face.png)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          ...style,
        }}
      />
    );
  }

  const { viewBox, content } = RENDERERS[name];
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      aria-hidden
      className={className}
      style={{ color: '#f5efe6', ...style }}
    >
      {content}
    </svg>
  );
}
