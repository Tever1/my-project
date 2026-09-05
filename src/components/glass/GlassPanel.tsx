/**
 * <GlassPanel> — Phase B Liquid Glass system
 *
 * iOS 26-inspired frosted-glass surface. Use this as the foundation for
 * any container that overlays a background (cards, sheets, modals, info-cards).
 *
 * Variants:
 *   - card      — default. Standard content panel.
 *   - floating  — popovers, dropdowns. Slightly stronger blur + shadow.
 *   - hero      — large featured panels (e.g. lobby info-card). Deep shadow.
 *   - subtle    — quiet backgrounds. Low blur, almost transparent.
 *   - elevated  — modal-like, top-of-stack. Strongest blur + shadow.
 *
 * Examples:
 *   <GlassPanel>Default card</GlassPanel>
 *   <GlassPanel variant="hero" radius="xl">Big info</GlassPanel>
 *   <GlassPanel as="article" interactive>Hover me</GlassPanel>
 *
 * Built on tokens from src/lib/design/tokens.ts. See docs/design-tokens.md.
 */

"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";
import { spring, blur, shadow, radius as radiusTokens } from "@/lib/design/tokens";
import { hover, tap } from "@/lib/design/motion";

export type GlassVariant = "card" | "floating" | "hero" | "subtle" | "elevated";
export type GlassRadius = keyof typeof radiusTokens;

export interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
  variant?: GlassVariant;
  radius?: GlassRadius;
  /** Add hover lift + tap press animations. Use for clickable panels. */
  interactive?: boolean;
  /** Per-game accent — adds a subtle colored glow on the border. */
  accentColor?: string;
  /** Padding inside the panel. Defaults vary by variant. */
  padding?: number | string;
  children?: ReactNode;
}

const variantStyles: Record<
  GlassVariant,
  {
    blur: number;
    bg: string;
    border: string;
    shadow: string;
    defaultPadding: number;
  }
> = {
  subtle: {
    blur: blur.subtle,
    bg: "rgba(255, 255, 255, 0.03)",
    border: "rgba(255, 255, 255, 0.06)",
    shadow: shadow.xs,
    defaultPadding: 16,
  },
  card: {
    blur: blur.default,
    bg: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.1)",
    shadow: shadow.md,
    defaultPadding: 24,
  },
  floating: {
    blur: blur.strong,
    bg: "rgba(255, 255, 255, 0.07)",
    border: "rgba(255, 255, 255, 0.12)",
    shadow: shadow.lg,
    defaultPadding: 16,
  },
  hero: {
    blur: blur.strong,
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.1)",
    shadow: shadow.xl,
    defaultPadding: 40,
  },
  elevated: {
    blur: blur.intense,
    bg: "rgba(255, 255, 255, 0.08)",
    border: "rgba(255, 255, 255, 0.14)",
    shadow: shadow.xl,
    defaultPadding: 32,
  },
};

export function GlassPanel({
  variant = "card",
  radius = "lg",
  interactive = false,
  accentColor,
  padding,
  children,
  style,
  whileHover,
  whileTap,
  transition,
  ...rest
}: GlassPanelProps) {
  const v = variantStyles[variant];
  const r = radiusTokens[radius];
  const computedPadding = padding ?? v.defaultPadding;

  // Optional per-game accent glow on border
  const borderColor = accentColor
    ? `color-mix(in srgb, ${accentColor} 35%, ${v.border})`
    : v.border;
  const accentGlow = accentColor
    ? `, 0 0 32px color-mix(in srgb, ${accentColor} 25%, transparent)`
    : "";

  return (
    <motion.div
      style={{
        background: v.bg,
        backdropFilter: `blur(${v.blur}px)`,
        WebkitBackdropFilter: `blur(${v.blur}px)`,
        border: `1px solid ${borderColor}`,
        borderRadius: r,
        boxShadow: `${v.shadow}${accentGlow}`,
        padding: computedPadding,
        ...style,
      }}
      whileHover={interactive ? whileHover ?? hover.lift : whileHover}
      whileTap={interactive ? whileTap ?? tap.press : whileTap}
      transition={transition ?? spring.soft}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
