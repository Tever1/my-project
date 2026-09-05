# TASK-073: TopBar mobile — hide brand text + fix QR icon clipping

## Problem

On mobile (isMobile=true) the TopBar header is too crowded:
1. `BrandMark` always renders the "Party Hub" text — on mobile it gets truncated ("Party Hu")
   and pushes the RoomButton and AvatarPill to the right edge.
2. `RoomButton` has `padding: "8px 18px"` and `maxWidth: 180px` with `overflow: hidden`,
   which clips the QR SVG icon (14×14, flexShrink: 0) on the right side.

## Fix

**File:** `src/components/lobby/Lobby.tsx` — only this file.

---

### Change 1: Pass `isMobile` to `BrandMark` and hide text on mobile

In `TopBar` render, change:
```tsx
<BrandMark />
```
to:
```tsx
<BrandMark isMobile={isMobile} />
```

In `BrandMark` function signature, change:
```tsx
function BrandMark() {
```
to:
```tsx
function BrandMark({ isMobile = false }: { isMobile?: boolean }) {
```

In `BrandMark` render, wrap the "Party Hub" text div with a conditional:
```tsx
{!isMobile && (
  <div
    style={{
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: "-0.02em",
      whiteSpace: "nowrap",
    }}
  >
    Party Hub
  </div>
)}
```

---

### Change 2: Fix RoomButton padding and maxWidth on mobile so QR icon fits

In `RoomButton` style, change:
```tsx
padding: isNarrowDesktop ? "8px 14px" : "8px 18px",
```
to:
```tsx
padding: isMobile ? "7px 12px" : isNarrowDesktop ? "8px 14px" : "8px 18px",
```

And change:
```tsx
maxWidth: isMobile ? 180 : undefined,
```
to:
```tsx
maxWidth: isMobile ? 200 : undefined,
```

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. On mobile (`isMobile=true`): TopBar shows only the "P" icon, no "Party Hub" text.
3. On desktop (`isMobile=false`): "Party Hub" text still visible — unchanged.
4. RoomButton with room code on mobile: QR icon is fully visible, not clipped.

## Report

Write report to `codex-reports/073-topbar-mobile-brand-room.md`.
Do NOT commit.
