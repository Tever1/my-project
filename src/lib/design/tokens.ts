/**
 * Design tokens — Phase A (Foundation)
 *
 * Type-safe tokens for use in TypeScript / JSX (Framer Motion presets,
 * inline styles, Tailwind arbitrary values).
 *
 * For CSS variables and Tailwind theme tokens, see `src/app/globals.css`.
 * For full reference, see `docs/design-tokens.md`.
 */

// ============================================================
// Motion: spring presets (Framer Motion)
// ============================================================

/**
 * Spring physics presets — use with Framer Motion's `transition` prop.
 *
 *   <motion.div transition={spring.soft} ... />
 *
 * Tuning philosophy:
 * - "soft"  — luxurious, premium feel (most UI elements)
 * - "snappy" — quick feedback (buttons, toggles)
 * - "bouncy" — playful overshoot (celebrations, success states)
 * - "stiff"  — minimal travel, near-instant (focus rings)
 */
export const spring = {
  soft: { type: "spring", stiffness: 200, damping: 30, mass: 1 },
  medium: { type: "spring", stiffness: 280, damping: 28, mass: 1 },
  snappy: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 },
  bouncy: { type: "spring", stiffness: 350, damping: 18, mass: 1 },
  stiff: { type: "spring", stiffness: 500, damping: 35, mass: 0.6 },
} as const;

// ============================================================
// Motion: durations (ms)
// ============================================================

export const duration = {
  micro: 0.12,    // 120ms — focus rings
  fast: 0.2,     // 200ms — hover, tap
  base: 0.35,    // 350ms — most transitions
  slow: 0.55,    // 550ms — cards, sheets
  cinema: 0.8,   // 800ms — TV transitions, dramatic moments
} as const;

// ============================================================
// Motion: easings (cubic-bezier — Framer Motion accepts arrays)
// ============================================================

export const easing = {
  ios: [0.32, 0.72, 0, 1] as [number, number, number, number],
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  outBack: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

// ============================================================
// Per-game accent palette (Phase I will use these heavily)
// ============================================================

export type GameId =
  | "quiz"
  | "mafia"
  | "crocodile"
  | "spy"
  | "alias"
  | "who-am-i"
  | "hundred-to-one";

export const gameColors: Record<GameId, { accent: string; deep: string }> = {
  quiz:            { accent: "#06b6d4", deep: "#0e7490" }, // cyan
  mafia:           { accent: "#8b5cf6", deep: "#4c1d95" }, // violet
  crocodile:       { accent: "#f97316", deep: "#c2410c" }, // orange
  spy:             { accent: "#14b8a6", deep: "#0f766e" }, // teal
  alias:           { accent: "#ec4899", deep: "#be185d" }, // pink
  "who-am-i":      { accent: "#a78bfa", deep: "#7c3aed" }, // pastel violet
  "hundred-to-one":{ accent: "#f59e0b", deep: "#b45309" }, // amber gold
};

// ============================================================
// Radius scale (matches CSS vars)
// ============================================================

export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
  full: 9999,
} as const;

// ============================================================
// Depth layers — z-index scale (matches CSS vars)
// ============================================================

export const z = {
  base: 1,
  elevated: 10,
  floating: 40,
  overlay: 50,
  toast: 60,
  debug: 9999,
} as const;

// ============================================================
// Blur scale (matches CSS vars)
// ============================================================

export const blur = {
  subtle: 8,
  default: 16,
  strong: 24,
  intense: 40,
} as const;

// ============================================================
// Glass shadow scale (matches CSS vars)
// ============================================================

export const shadow = {
  xs: "0 2px 8px rgba(0, 0, 0, 0.08)",
  sm: "0 4px 16px rgba(0, 0, 0, 0.12)",
  md: "0 8px 32px rgba(0, 0, 0, 0.18)",
  lg: "0 16px 48px rgba(0, 0, 0, 0.28)",
  xl: "0 24px 64px rgba(0, 0, 0, 0.4)",
} as const;
