'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

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
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return;

    let size = max;
    el.style.fontSize = `${size}px`;
    const fits = () =>
      el.scrollWidth <= container.clientWidth &&
      el.scrollHeight <= container.clientHeight;

    while (size > min && !fits()) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }

    const frame = requestAnimationFrame(() => setFontSize(size));
    return () => cancelAnimationFrame(frame);
  }, [text, max, min]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <p
        ref={textRef}
        className={className}
        style={{ fontSize, overflowWrap: 'normal', wordBreak: 'normal', whiteSpace: 'pre-line', ...style }}
      >
        {text}
      </p>
    </div>
  );
}
