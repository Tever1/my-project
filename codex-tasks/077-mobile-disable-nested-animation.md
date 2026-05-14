# TASK-077: Disable nested RoomMenu animation on mobile (fix iPhone 15 flicker)

## Problem

On iPhone 15 (A16 GPU, 60Hz display) the mobile room menu still flickers
when created. The cause is two overlapping animations:

1. Outer mobile fixed panel: `y: 40 → 0, opacity: 0 → 1` (280ms)
2. Inner RoomMenu's GlassPanel: `opacity: 0 → 1, scale: 0.95 → 1` (300ms)

Both run simultaneously with heavy content (QR code canvas, player list)
inside. A16 GPU at 60Hz drops frames.

The outer slide-up is the visible animation. The inner one is redundant
(content is hidden by the moving panel anyway).

## Fix

When `isMobile=true`, disable the RoomMenu's own entrance/exit animation.
The outer panel handles the visible motion.

**File:** `src/components/lobby/Lobby.tsx`

In `RoomMenu` component, find the `GlassPanel` return (around line 2059–2081)
with these props:

```tsx
return (
  <GlassPanel
    ref={ref}
    variant="floating"
    radius="lg"
    padding={32}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    style={{
      ...
    }}
  >
```

Replace `initial`, `animate`, `exit`, `transition` with conditional values:

```tsx
return (
  <GlassPanel
    ref={ref}
    variant="floating"
    radius="lg"
    padding={32}
    initial={isMobile ? false : { opacity: 0, scale: 0.95 }}
    animate={isMobile ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
    exit={isMobile ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
    transition={isMobile ? { duration: 0 } : { duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    style={{
      ...
    }}
  >
```

Explanation:
- `initial={false}` on mobile: GlassPanel skips entrance animation entirely,
  starts at final state.
- `exit` matches `animate` on mobile so no exit fade — but the outer panel
  slides down with its own exit, hiding the content.
- `transition={{ duration: 0 }}` on mobile: any residual prop transitions
  happen instantly, no animation frames spent.

Also remove `willChange: "opacity, transform"` from the inline `style` when
`isMobile=true` — no point allocating a GPU layer for a non-animating element,
and nested `will-change` over the outer panel's `will-change` confuses iOS
Safari compositor.

Change the existing `style`:
```tsx
style={{
  width: "100%",
  maxWidth: 460,
  minHeight: 480,
  background: isMobile ? "rgba(20, 18, 32, 0.92)" : "rgba(255,255,255,0.08)",
  backdropFilter: isMobile ? undefined : "blur(24px)",
  WebkitBackdropFilter: isMobile ? undefined : "blur(24px)",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  willChange: "opacity, transform",
}}
```

to:
```tsx
style={{
  width: "100%",
  maxWidth: 460,
  minHeight: 480,
  background: isMobile ? "rgba(20, 18, 32, 0.92)" : "rgba(255,255,255,0.08)",
  backdropFilter: isMobile ? undefined : "blur(24px)",
  WebkitBackdropFilter: isMobile ? undefined : "blur(24px)",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  willChange: isMobile ? undefined : "opacity, transform",
}}
```

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. Desktop RoomMenu: animation unchanged (initial/animate/exit/transition
   identical to before).
3. Mobile RoomMenu: `initial={false}`, `transition={{ duration: 0 }}`,
   `willChange: undefined` — no inner animation.
4. Outer mobile fixed panel animation (slide up) unchanged.

## Report

Write report to `codex-reports/077-mobile-disable-nested-animation.md`.
Do NOT commit.
