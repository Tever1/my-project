import type { CSSProperties, ReactNode } from 'react';

export type SpyIconName =
  | 'mask' | 'speech' | 'palette' | 'ballot' | 'check' | 'cross'
  | 'hide' | 'refresh' | 'shield' | 'trophy' | 'eye' | 'medal'
  | 'skip' | 'warning';

const SVGS: Record<Exclude<SpyIconName, 'mask'>, ReactNode> = {
  speech: (
    <>
      <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3c5 0 9 3.4 9 8 0 2.2-1.8 4-4 4h-2c-.9 0-1.6.7-1.6 1.6 0 .4.2.7.2 1.1 0 .9-.6 1.3-1.6 1.3A9 8 0 0 1 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8" cy="9.5" r="1" fill="currentColor" />
      <circle cx="11.5" cy="6.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="7.5" r="1" fill="currentColor" />
    </>
  ),
  ballot: (
    <>
      <path d="M4 8.5l8-4.5 8 4.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  check: (
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  cross: (
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  ),
  hide: (
    <>
      <path d="M3 12s3.6-6.5 9-6.5 9 6.5 9 6.5-3.6 6.5-9 6.5S3 12 3 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 6.5A8 8 0 1 0 21 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 3v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.6-3 8.2-7 9.4C8 19.2 5 15.6 5 11V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 11.8l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  medal: (
    <>
      <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </>
  ),
  skip: (
    <>
      <path d="M5 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4l9 16H3L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

const DEFAULT_CLASS = 'inline-block h-[1em] w-[1em] align-[-0.15em]';

export function SpyIcon({
  name,
  className = DEFAULT_CLASS,
  style,
}: {
  name: SpyIconName;
  className?: string;
  style?: CSSProperties;
}) {
  if (name === 'mask') {
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: 'inline-block',
          backgroundColor: 'currentColor',
          WebkitMaskImage: 'url(/icons/spy/mask-face.png)',
          maskImage: 'url(/icons/spy/mask-face.png)',
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

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
      {SVGS[name]}
    </svg>
  );
}
