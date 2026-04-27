/**
 * <GlassSheet> — Phase B Liquid Glass system
 *
 * Drag-to-dismiss bottom sheet (or side drawer) with frosted glass styling.
 * Built on `vaul` (Emil Kowalski's drawer library).
 *
 * Use for: in-game modals, player menus, settings panels, "more info" sheets.
 *
 * Examples:
 *   <GlassSheet open={open} onOpenChange={setOpen} title="Settings">
 *     <p>Sheet content here</p>
 *   </GlassSheet>
 *
 *   <GlassSheet direction="right" open={open} onOpenChange={setOpen}>
 *     <ChatPanel />
 *   </GlassSheet>
 */

"use client";

import { Drawer } from "vaul";
import { type ReactNode } from "react";
import { blur, shadow, radius, z } from "@/lib/design/tokens";

export interface GlassSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bottom is the iOS default. Side drawers also supported. */
  direction?: "bottom" | "top" | "left" | "right";
  title?: string;
  description?: string;
  children: ReactNode;
  /** Maximum height for bottom/top sheets. Defaults to 85vh. */
  maxHeight?: string;
  /** Maximum width for left/right drawers. Defaults to 420px. */
  maxWidth?: string;
}

export function GlassSheet({
  open,
  onOpenChange,
  direction = "bottom",
  title,
  description,
  children,
  maxHeight = "85vh",
  maxWidth = "420px",
}: GlassSheetProps) {
  const isVertical = direction === "bottom" || direction === "top";

  // Position-specific styling
  const contentPosition: React.CSSProperties = isVertical
    ? {
        left: 0,
        right: 0,
        [direction]: 0,
        maxHeight,
        borderTopLeftRadius: direction === "bottom" ? radius["2xl"] : 0,
        borderTopRightRadius: direction === "bottom" ? radius["2xl"] : 0,
        borderBottomLeftRadius: direction === "top" ? radius["2xl"] : 0,
        borderBottomRightRadius: direction === "top" ? radius["2xl"] : 0,
      }
    : {
        top: 0,
        bottom: 0,
        [direction]: 0,
        maxWidth,
        width: "100%",
        borderTopLeftRadius: direction === "right" ? radius["2xl"] : 0,
        borderBottomLeftRadius: direction === "right" ? radius["2xl"] : 0,
        borderTopRightRadius: direction === "left" ? radius["2xl"] : 0,
        borderBottomRightRadius: direction === "left" ? radius["2xl"] : 0,
      };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: `blur(${blur.subtle}px)`,
            WebkitBackdropFilter: `blur(${blur.subtle}px)`,
            zIndex: z.overlay,
          }}
        />
        <Drawer.Content
          style={{
            position: "fixed",
            ...contentPosition,
            background: "rgba(20, 18, 35, 0.85)",
            backdropFilter: `blur(${blur.intense}px) saturate(180%)`,
            WebkitBackdropFilter: `blur(${blur.intense}px) saturate(180%)`,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: shadow.xl,
            color: "#f0eef6",
            zIndex: z.overlay,
            display: "flex",
            flexDirection: "column",
            outline: "none",
          }}
        >
          {isVertical && direction === "bottom" && (
            <div
              aria-hidden
              style={{
                width: 48,
                height: 4,
                borderRadius: radius.full,
                background: "rgba(255, 255, 255, 0.25)",
                margin: "12px auto 0",
                flexShrink: 0,
              }}
            />
          )}

          <div style={{ padding: 24, overflow: "auto", flex: 1 }}>
            {title && (
              <Drawer.Title
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  marginBottom: description ? 4 : 16,
                }}
              >
                {title}
              </Drawer.Title>
            )}
            {description && (
              <Drawer.Description
                style={{
                  fontSize: 14,
                  color: "rgba(240, 238, 246, 0.6)",
                  margin: 0,
                  marginBottom: 16,
                }}
              >
                {description}
              </Drawer.Description>
            )}
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
