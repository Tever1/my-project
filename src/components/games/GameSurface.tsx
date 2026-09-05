'use client';

import { ReactNode, useCallback, useState } from 'react';
import lqipMap from '../../../public/backgrounds/lqip.json';

interface GameSurfaceProps {
  /** Optional background image URL, rendered behind content with correct stacking. */
  backgroundUrl?: string;
  /** Extra classes for the root element (layout, sizing, bg-gradient-main, etc.). */
  className?: string;
  children: ReactNode;
}

function getBackgroundKey(backgroundUrl: string): string {
  const pathWithoutQuery = backgroundUrl.split('?')[0] ?? backgroundUrl;
  const fileName = pathWithoutQuery.split('/').pop() ?? '';
  return fileName.replace(/\.[^.]+$/, '');
}

/**
 * Root surface for game screens. Bundles the background <img> together with
 * `isolate` so the negative-z-index image always paints ABOVE the opaque
 * `bg-gradient-main` parent background. Using `isolate` and the <img> separately
 * caused the special-quiz background to render behind the gradient (TASK-190).
 * Always use this wrapper for any game screen that may show a background.
 */
export function GameSurface({ backgroundUrl, className = '', children }: GameSurfaceProps) {
  const [loadedBackgroundUrl, setLoadedBackgroundUrl] = useState<string | null>(null);
  const backgroundLoaded = Boolean(backgroundUrl && loadedBackgroundUrl === backgroundUrl);
  const placeholder = backgroundUrl
    ? (lqipMap as Record<string, string>)[getBackgroundKey(backgroundUrl)]
    : undefined;
  const handleBackgroundImageRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete && node.naturalWidth > 0 && backgroundUrl) {
        setLoadedBackgroundUrl(backgroundUrl);
      }
    },
    [backgroundUrl],
  );

  return (
    <div
      className={`relative isolate ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''} ${className}`}
    >
      {backgroundUrl && (
        <div
          className="absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          {placeholder && (
            <div
              className="absolute -inset-4 bg-cover bg-center blur-xl scale-105"
              style={{ backgroundImage: `url(${placeholder})` }}
            />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={handleBackgroundImageRef}
            src={backgroundUrl}
            alt=""
            fetchPriority="high"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out ${
              backgroundLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoadedBackgroundUrl(backgroundUrl)}
          />
        </div>
      )}
      {children}
    </div>
  );
}
