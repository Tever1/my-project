# TASK-082 — Fix AuthDropdown flicker + RoomMenu close delay on mobile

## Context

Two mobile UX bugs reported by user:
1. **Flicker** when opening AuthDropdown (nickname entry) and when logging out via AccountDropdown
2. **~500ms perceived delay** when tapping outside RoomMenu to close it

Root causes are the same class of problem fixed in TASK-076/078/081:
- `backdropFilter: blur(4px)` on fixed overlay → A16 GPU overload
- Framer Motion exit animations on full-screen `position:fixed` divs with `scale` → GPU reprojection of entire viewport → visible flash
- JS-driven `AnimatePresence` exit (`y: 40`, 0.28s) → JS scheduling latency adds to perceived close time

Pattern proven to work: remove `scale` from full-screen overlay animations, remove `backdropFilter` from fixed overlays, and use CSS-only transitions for close (not Framer Motion exit).

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Fix 1 — AuthDropdown mobile: remove blur + simplify animation

### Current (around line 1300, `containerStyle` in `AuthDropdown` function):
```js
const containerStyle: React.CSSProperties = isMobile
  ? {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      background: `radial-gradient(ellipse 120% 70% at 70% 30%, ${accent}44, transparent 60%), radial-gradient(ellipse 100% 80% at 20% 70%, ${deep}55, transparent 60%), rgba(6,6,12,0.92)`,
      backdropFilter: 'blur(4px)',
      padding: 24,
    }
  : { ... };
```

### Fix:
Remove `backdropFilter: 'blur(4px)'` from the mobile containerStyle. Just delete that line.

---

### Current (around line 1360, the `motion.div` return in `AuthDropdown`):
```jsx
<motion.div
  initial={{ opacity: 0, y: -8, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: -8, scale: 0.97 }}
  transition={spring.snappy}
  style={containerStyle}
>
```

### Fix:
For mobile, the `motion.div` animates a `position:fixed, inset:0` overlay — animating `scale` on this causes the GPU to reprojection the entire viewport. Replace with opacity-only animation, use a shorter duration:

```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15, ease: 'easeOut' }}
  style={containerStyle}
>
```

This applies to both mobile and desktop (desktop uses `position:absolute` — no viewport scale issue, and opacity-only is fine there too).

---

## Fix 2 — AccountDropdown mobile: remove scale from fixed overlay animation

### Current (around line 1548, the `motion.div` return in `AccountDropdown`):
```jsx
<motion.div
  initial={{ opacity: 0, y: -8, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: -8, scale: 0.97 }}
  transition={spring.snappy}
  style={containerStyle}
  onClick={isMobile ? onClose : undefined}
>
```

On mobile, `containerStyle` is `position:fixed, inset:0`. Animating `scale: 0.97` on this = GPU reprojection of the whole screen.

### Fix:
Apply different animations based on `isMobile`:

```jsx
<motion.div
  initial={isMobile ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
  animate={isMobile ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
  exit={isMobile ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
  transition={isMobile ? { duration: 0.15, ease: 'easeOut' } : spring.snappy}
  style={containerStyle}
  onClick={isMobile ? onClose : undefined}
>
```

---

## Fix 3 — Mobile RoomMenu sheet: replace AnimatePresence exit with CSS-only close

### Problem
The mobile RoomMenu sheet uses `AnimatePresence` + `motion.div` with `exit={{ y: 40 }}` and `transition={{ duration: 0.28 }}`. This is a JS-driven exit animation. On mobile, JS scheduling + React re-render overhead makes the perceived close time ~400-500ms even though the declared duration is 280ms.

Pattern from TASK-078/081: extract the backdrop to pure CSS (already done), and now also make the panel slide-in/out use CSS instead of Framer Motion.

### Current (around lines 693-744):
```jsx
{/* Mobile room menu overlay */}
{isMobile && (
  <>
    <div
      onClick={() => setRoomMenuOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 40,
        opacity: roomMenuOpen && roomCode ? 1 : 0,
        pointerEvents: roomMenuOpen && roomCode ? "auto" : "none",
        transition: "opacity 0.28s ease-out",
        willChange: "opacity",
      }}
    />
    <AnimatePresence>
      {roomMenuOpen && roomCode && (
        <motion.div
          key="room-menu-mobile"
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 41,
            maxHeight: "88dvh",
            overflowY: "auto",
            padding: "0 12px 24px",
            willChange: "transform",
          }}
        >
          <RoomMenu ... />
        </motion.div>
      )}
    </AnimatePresence>
  </>
)}
```

### Fix:
Replace `AnimatePresence` + `motion.div` with a plain `div` always present in DOM when `roomCode` exists, using CSS transition for transform. This makes close happen at CSS animation speed with no JS scheduling overhead:

```jsx
{/* Mobile room menu overlay */}
{isMobile && roomCode && (
  <>
    <div
      onClick={() => setRoomMenuOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 40,
        opacity: roomMenuOpen ? 1 : 0,
        pointerEvents: roomMenuOpen ? "auto" : "none",
        transition: "opacity 0.22s ease-out",
        willChange: "opacity",
      }}
    />
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 41,
        maxHeight: "88dvh",
        overflowY: "auto",
        padding: "0 12px 24px",
        transform: roomMenuOpen ? "translateY(0)" : "translateY(100%)",
        transition: roomMenuOpen
          ? "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"
          : "transform 0.22s cubic-bezier(0.4, 0, 1, 1)",
        willChange: "transform",
      }}
    >
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
    </div>
  </>
)}
```

Note the two different easing curves:
- **Open** (`roomMenuOpen=true`): `cubic-bezier(0.32, 0.72, 0, 1)` — decelerate (slides up gracefully)
- **Close** (`roomMenuOpen=false`): `cubic-bezier(0.4, 0, 1, 1)` — accelerate (snaps away quickly, reduces perceived delay)

Also reduce close duration from 0.28 to 0.22s.

The `roomCode &&` condition means the element is only present in DOM when there's an active room — same as before effectively.

---

## Whitelist

Only `src/components/lobby/Lobby.tsx` may be modified.

## Acceptance

1. **AuthDropdown**: no `backdropFilter` blur on mobile overlay; animation is opacity-only (no scale, no y)
2. **AccountDropdown**: no `scale` animation on mobile (opacity-only)
3. **Mobile RoomMenu**: no `AnimatePresence` + `motion.div` for the sheet; uses CSS transition; close feels instant/snappy (no 500ms lag)
4. `npm run build` passes (no TypeScript errors)
5. Desktop behavior unchanged (RoomMenu on desktop still uses `AnimatePresence mode="wait"`)

## Report

Write to `codex-reports/082-auth-dropdown-flicker-roommenu-close-delay.md`
