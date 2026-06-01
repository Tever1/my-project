'use client';

import { ReactNode } from 'react';

interface GameSurfaceProps {
  /** Optional background image URL, rendered behind content with correct stacking. */
  backgroundUrl?: string;
  /** Extra classes for the root element (layout, sizing, bg-gradient-main, etc.). */
  className?: string;
  children: ReactNode;
}

/**
 * Root surface for game screens. Bundles the background <img> together with
 * `isolate` so the negative-z-index image always paints ABOVE the opaque
 * `bg-gradient-main` parent background. Using `isolate` and the <img> separately
 * caused the special-quiz background to render behind the gradient (TASK-190).
 * Always use this wrapper for any game screen that may show a background.
 */
export function GameSurface({ backgroundUrl, className = '', children }: GameSurfaceProps) {
  return (
    <div
      className={`relative isolate ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''} ${className}`}
    >
      {backgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundUrl}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover -z-10"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
