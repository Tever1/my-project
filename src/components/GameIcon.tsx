"use client";

/**
 * <GameIcon> — game icon with automatic placeholder fallback.
 *
 * Tries to load /icons/games/{gameId}.png. If the file is missing, renders
 * an inline SVG placeholder with the per-game accent color and a Russian
 * initial.
 *
 * SWAPPING TO REAL ICONS:
 *   Just drop the generated PNG at public/icons/games/{gameId}.png.
 *   No code changes needed — the component picks it up automatically.
 *
 * Path mapping:
 *   quiz             → public/icons/games/quiz.png
 *   mafia            → public/icons/games/mafia.png
 *   crocodile        → public/icons/games/crocodile.png
 *   spy              → public/icons/games/spy.png
 *   alias            → public/icons/games/alias.png
 *   who-am-i         → public/icons/games/who-am-i.png
 *   hundred-to-one   → public/icons/games/hundred-to-one.png
 *
 * Recommended source size: 1024×1024 PNG, transparent background, single
 * subject filling 75–85% of the canvas (so it looks good at any display size).
 */

import { useEffect, useRef, useState } from "react";
import { gameColors, type GameId } from "@/lib/design/tokens";

const initials: Record<GameId, string> = {
  quiz: "Кв",
  mafia: "М",
  crocodile: "Кр",
  spy: "Шп",
  alias: "А",
  "who-am-i": "Я?",
  "hundred-to-one": "100",
};

export interface GameIconProps {
  gameId: GameId;
  /** Pixel size — applies to both width and height (icon is square). */
  size?: number;
  /** Override default lookup path. Useful for testing alternate icons. */
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function GameIcon({
  gameId,
  size = 96,
  src,
  alt,
  className,
  style,
}: GameIconProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const path = src ?? `/icons/games/${gameId}.png`;

  // Если картинка в browser cache - onLoad не сработает (срабатывает
  // синхронно до навешивания listener'а). Проверяем complete вручную.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && !errored) {
      queueMicrotask(() => setLoaded(true));
    }
  }, [errored]);

  // Always render placeholder underneath — visible until real image loads.
  // If the image fails (404), placeholder stays. No "broken image" artifact.
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
        ...style,
      }}
    >
      {/* Placeholder — always rendered, hidden once real image loads */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: loaded && !errored ? 0 : 1,
          transition: "opacity 200ms ease-out",
        }}
      >
        <PlaceholderIcon gameId={gameId} size={size} />
      </div>

      {/* Real image — invisible until loaded */}
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={path}
          alt={alt ?? ""}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 200ms ease-out",
          }}
        />
      )}
    </div>
  );
}

/**
 * SVG placeholder — soft gradient blob + bold initial.
 * Used until the real icon is generated and dropped into public/icons/games/.
 *
 * Renders as 100% × 100% so it scales with parent container automatically.
 * Font sizes are SVG-relative units (viewBox 100), so they scale too.
 */
function PlaceholderIcon({
  gameId,
  className,
  style,
}: {
  gameId: GameId;
  size?: number; // ignored — placeholder always fills parent
  className?: string;
  style?: React.CSSProperties;
}) {
  const accent = gameColors[gameId].accent;
  const deep = gameColors[gameId].deep;
  const initial = initials[gameId];
  // Font size in SVG units (viewBox is 100×100), scales with parent
  const fontSize = initial.length >= 3 ? 32 : 45;

  const gradId = `placeholder-grad-${gameId}`;
  const blurId = `placeholder-blur-${gameId}`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", ...style }}
      aria-label={`Иконка для игры (заглушка): ${gameId}`}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.5" />
          <stop offset="100%" stopColor={deep} stopOpacity="0.3" />
        </radialGradient>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <circle cx="50" cy="50" r="42" fill={accent} opacity="0.25" filter={`url(#${blurId})`} />
      <circle cx="50" cy="50" r="38" fill={`url(#${gradId})`} />
      <ellipse cx="42" cy="35" rx="14" ry="9" fill="white" opacity="0.18" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.6" />

      <text
        x="50"
        y="50"
        dy="0.36em"
        textAnchor="middle"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        fill="white"
        style={{ letterSpacing: initial.length >= 3 ? "-0.04em" : "-0.02em" }}
      >
        {initial}
      </text>
    </svg>
  );
}
