'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';

export function FitText({
  text,
  max,
  min = 18,
  className = '',
  style,
}: {
  text: string;
  max: number;
  min?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return;

    let disposed = false;
    let animationFrame = 0;
    const fit = () => {
      if (disposed) return;
      // WebKit can briefly report a nearly collapsed percentage-height box
      // while the next card is promoted. Never persist a font size measured
      // against that transitional geometry.
      if (container.clientWidth < 64 || container.clientHeight < 32) return;
      // Measure untransformed layout dimensions, including during a card swipe.
      let size = max;
      el.style.fontSize = `${size}px`;
      // Safari rounds client and scroll dimensions differently at fractional widths.
      const fits = () => el.scrollWidth <= container.clientWidth + 1 &&
        el.scrollHeight <= container.clientHeight + 1;
      while (size > min && !fits()) {
        el.style.fontSize = `${--size}px`;
      }
      el.dataset.fitFontSize = String(size);
    };
    const scheduleFit = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(fit);
    };
    fit();
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(container);
    document.fonts.ready.then(scheduleFit);
    document.fonts.addEventListener('loadingdone', scheduleFit);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', scheduleFit);
    };
  }, [text, max, min]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex min-h-0 min-w-0 items-center justify-center overflow-hidden"
      style={{ WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}
    >
      <div
        ref={textRef}
        className={`flex w-full min-w-0 flex-wrap items-center justify-center gap-x-[0.2em] gap-y-[0.12em] ${className}`}
        style={{ ...style, fontSize: max, overflowWrap: 'normal', wordBreak: 'normal', hyphens: 'none' }}
      >
        {text.trim().split(/\s+/).map((word, index) => (
          <span key={`${index}-${word}`} className="shrink-0 whitespace-nowrap">{word}</span>
        ))}
      </div>
    </div>
  );
}
