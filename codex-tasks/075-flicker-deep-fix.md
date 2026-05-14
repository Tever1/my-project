# TASK-075: Deep flicker fix — kill router remounts + stabilize compositing

## Root causes

1. `router.push('/lobby/CODE')` and `router.push('/')` cause full **Next.js page
   navigation** — Lobby component unmounts and remounts even though both
   routes render the same `<Lobby />`. Visible as "the whole interface
   re-renders" on desktop on create-room and leave-room.
2. On mobile, `RoomMenu` (rendered inside the fixed panel) has its own
   `backdrop-filter: blur(24px)` while the backdrop already has
   `backdrop-filter: blur(4px)`. Nested backdrop-filters on iOS Safari cause
   the entire underlying content to repaint on mount, visible as flicker.

Fix both without changing any animation values.

---

## Fix 1: Replace router.push with window.history.pushState

**File:** `src/components/lobby/Lobby.tsx`

`router.push` triggers Next.js navigation which unmounts the page tree.
`window.history.pushState` only updates the URL — the component stays mounted.
Since both `/` and `/lobby/[roomId]` render the same `<Lobby />`, the
component is already alive; we just need the URL to reflect the room.

### Change 1a: createRoom callback (~line 370–372)

Find this block:
```tsx
if (res.success && res.code) {
  setRoomCode(res.code);
  router.push(`/lobby/${res.code}?m=1&game=${activeGame}`);
} else {
```

Replace with:
```tsx
if (res.success && res.code) {
  setRoomCode(res.code);
  setRoomMenuOpen(true);
  window.history.pushState({}, '', `/lobby/${res.code}`);
} else {
```

Note: `m=1` query param was used to signal "open the menu after navigation".
Since we no longer navigate, we set `setRoomMenuOpen(true)` directly. The
`game=X` query param was also for state restoration after remount — not
needed anymore.

### Change 1b: handleLeaveRoom (~line 461–471)

Find this block:
```tsx
const handleLeaveRoom = useCallback(() => {
  if (!roomCode) return;
  emit('room:leave', {});
  setRoomMenuOpen(false);
  if (isRoomRoute) {
    router.push("/");
    return;
  }
  setRoomCode(null);
  setRoomState(null);
}, [emit, isRoomRoute, roomCode, router]);
```

Replace with:
```tsx
const handleLeaveRoom = useCallback(() => {
  if (!roomCode) return;
  emit('room:leave', {});
  setRoomMenuOpen(false);
  setRoomCode(null);
  setRoomState(null);
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.history.pushState({}, '', '/');
  }
}, [emit, roomCode]);
```

Note: drop `isRoomRoute` and `router` from deps since we no longer use them
in this callback. Do NOT remove them from imports — they may be used elsewhere.

---

## Fix 2: Eliminate nested backdrop-filter on mobile

**File:** `src/components/lobby/Lobby.tsx`

The `RoomMenu` component uses `GlassPanel` with `backdropFilter: blur(24px)`.
When rendered inside the mobile fixed panel (which sits over a backdrop that
already has `blur(4px)`), iOS Safari's nested compositing causes flicker.

### Change 2: Pass `isMobile` to RoomMenu and skip backdrop-filter when mobile

In the `RoomMenu` component (its function signature is around line 2010–2030),
add `isMobile` to its prop types and to the destructured params.

Find this block (around line 2008):
```tsx
const RoomMenu = forwardRef<HTMLDivElement, {
  roomCode: string;
  roomState: RoomState | null;
  accent: string;
  deep: string;
  currentUserId: string;
  onKick: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}>(function RoomMenu({
  roomCode,
  roomState,
  accent,
  deep,
  currentUserId,
  onKick,
  onTransferHost,
  onLeaveRoom,
  onClose,
}, ref) {
```

Replace with:
```tsx
const RoomMenu = forwardRef<HTMLDivElement, {
  roomCode: string;
  roomState: RoomState | null;
  accent: string;
  deep: string;
  currentUserId: string;
  isMobile?: boolean;
  onKick: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}>(function RoomMenu({
  roomCode,
  roomState,
  accent,
  deep,
  currentUserId,
  isMobile = false,
  onKick,
  onTransferHost,
  onLeaveRoom,
  onClose,
}, ref) {
```

Then in the `GlassPanel` style (around line 2069–2081), replace:
```tsx
style={{
  width: "100%",
  maxWidth: 460,
  minHeight: 480,
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  willChange: "opacity, transform",
}}
```

with:
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

On mobile: solid-ish background (no blur inside, because outer backdrop blurs the page). On desktop: unchanged glass effect.

Then pass `isMobile` to RoomMenu at both mount sites:

Desktop one (around line 672):
```tsx
<RoomMenu
  key="room-menu"
  ref={roomMenuRef}
  roomCode={roomCode}
  roomState={roomState}
  accent={accent}
  deep={deep}
  currentUserId={user?.id ?? ""}
  onKick={handleKick}
  onTransferHost={handleTransferHost}
  onLeaveRoom={handleLeaveRoom}
  onClose={() => setRoomMenuOpen(false)}
/>
```
→ no change needed on desktop, default `isMobile=false` is correct.

Mobile one (around line 733):
```tsx
<RoomMenu
  ref={roomMenuRef}
  roomCode={roomCode}
  roomState={roomState}
  accent={accent}
  deep={deep}
  currentUserId={user?.id ?? ""}
  onKick={handleKick}
  onTransferHost={handleTransferHost}
  onLeaveRoom={handleLeaveRoom}
  onClose={() => setRoomMenuOpen(false)}
/>
```
→ add `isMobile={true}` prop:
```tsx
<RoomMenu
  ref={roomMenuRef}
  roomCode={roomCode}
  roomState={roomState}
  accent={accent}
  deep={deep}
  currentUserId={user?.id ?? ""}
  isMobile={true}
  onKick={handleKick}
  onTransferHost={handleTransferHost}
  onLeaveRoom={handleLeaveRoom}
  onClose={() => setRoomMenuOpen(false)}
/>
```

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

Do NOT touch: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, any other file.

## Acceptance criteria

1. `npm run lint` passes.
2. No animation values changed — all `initial`/`animate`/`exit`/`transition`
   identical.
3. `router.push` removed from `createRoom` callback and `handleLeaveRoom`;
   replaced with `window.history.pushState`.
4. `RoomMenu` accepts `isMobile` prop; when `true`, drops `backdropFilter`
   from its GlassPanel and uses solid `rgba(20,18,32,0.92)` background.
5. Mobile RoomMenu mount site passes `isMobile={true}`.
6. Desktop RoomMenu mount site stays unchanged (default `isMobile=false`).

## Report

Write report to `codex-reports/075-flicker-deep-fix.md`.
Do NOT commit.
