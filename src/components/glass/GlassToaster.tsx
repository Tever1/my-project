/**
 * <GlassToaster> — Phase B Liquid Glass system
 *
 * Toast notifications styled to match our glass aesthetic. Built on `sonner`
 * (Emil Kowalski's toast library — same author as vaul).
 *
 * Mount once near root (e.g. in providers.tsx or layout.tsx):
 *   <GlassToaster />
 *
 * Then trigger from anywhere:
 *   import { toast } from "sonner";
 *   toast("Игрок присоединился");
 *   toast.success("Победа!");
 *   toast.error("Соединение потеряно");
 *
 * For per-game theming, pass accentColor:
 *   <GlassToaster accentColor={gameColors.mafia.accent} />
 */

"use client";

import { Toaster, type ToasterProps } from "sonner";
import { blur, shadow, radius, z } from "@/lib/design/tokens";

export interface GlassToasterProps extends Omit<ToasterProps, "theme"> {
  /** Per-game accent color for borders/icons. */
  accentColor?: string;
}

export function GlassToaster({
  accentColor = "#c084fc",
  position = "top-center",
  duration = 3500,
  ...rest
}: GlassToasterProps) {
  return (
    <Toaster
      theme="dark"
      position={position}
      duration={duration}
      richColors={false}
      closeButton
      toastOptions={{
        unstyled: false,
        style: {
          background: "rgba(20, 18, 35, 0.82)",
          backdropFilter: `blur(${blur.strong}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${blur.strong}px) saturate(180%)`,
          border: `1px solid color-mix(in srgb, ${accentColor} 25%, rgba(255,255,255,0.1))`,
          borderRadius: `${radius.lg}px`,
          boxShadow: shadow.lg,
          color: "#f0eef6",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          padding: "14px 18px",
        },
        className: "glass-toast",
      }}
      style={{
        zIndex: z.toast,
        // CSS vars for sonner internals
        ...({
          "--normal-bg": "rgba(20, 18, 35, 0.82)",
          "--normal-border": `color-mix(in srgb, ${accentColor} 25%, rgba(255,255,255,0.1))`,
          "--normal-text": "#f0eef6",
          "--success-bg": "rgba(20, 18, 35, 0.82)",
          "--success-border": `color-mix(in srgb, #22c55e 35%, rgba(255,255,255,0.1))`,
          "--success-text": "#86efac",
          "--error-bg": "rgba(20, 18, 35, 0.82)",
          "--error-border": `color-mix(in srgb, #ef4444 35%, rgba(255,255,255,0.1))`,
          "--error-text": "#fca5a5",
        } as Record<string, string>),
      }}
      {...rest}
    />
  );
}
