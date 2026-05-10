# TASK-045: Confirm before leaving room

## Problem

Clicking «Выйти» in the room menu immediately leaves the room with no confirmation.
Users accidentally lose their room. Need a two-step confirmation.

## File

`src/components/lobby/Lobby.tsx` — only this file changes.

## Where to change

Inside the `RoomMenu` component (defined around line ~1901 as a `forwardRef`).

### 1. Add local `confirmLeave` state

At the top of the `RoomMenu` function body, add:
```js
const [confirmLeave, setConfirmLeave] = useState(false);
```

### 2. Replace the «Выйти» button with a two-step UI

**Current button** (around line ~2010–2040): a single `<button>` that calls `onLeaveRoom` on click.

**Replace it** with:

```jsx
{!confirmLeave ? (
  <button
    /* ... keep all existing styles exactly as they are ... */
    onClick={() => setConfirmLeave(true)}
  >
    Выйти
  </button>
) : (
  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
    <span style={{
      fontSize: 12,
      color: "#fca5a5",
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      Выйти?
    </span>
    <button
      type="button"
      onClick={onLeaveRoom}
      style={{
        padding: "6px 12px",
        borderRadius: "999px",
        background: "rgba(239, 68, 68, 0.75)",
        border: "1px solid rgba(239, 68, 68, 0.9)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Да
    </button>
    <button
      type="button"
      onClick={() => setConfirmLeave(false)}
      style={{
        padding: "6px 12px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.7)",
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Отмена
    </button>
  </div>
)}
```

### 3. Reset `confirmLeave` when menu closes

`RoomMenu` already has a `useEffect` that listens to `onClose`. In that same effect
(or in the `onClose` callback path), reset `confirmLeave` to `false` when the menu
closes so the next time it opens it starts fresh.

Find the existing useEffect that calls `onClose` on Escape / pointer-down and add
`setConfirmLeave(false)` wherever `onClose()` is called inside that effect, OR add
a separate cleanup effect:

```js
useEffect(() => {
  setConfirmLeave(false);
}, []); // no-op on mount is fine; alternatively hook into the close handlers above
```

The cleanest approach: just reset it inside the existing `onClose` wrappers — wherever
`onClose()` is called inside `RoomMenu`, do `setConfirmLeave(false); onClose();`.

## Whitelist

- `src/components/lobby/Lobby.tsx` only

## Acceptance

1. Click «Выйти» → button changes to «Выйти? [Да] [Отмена]»
2. Click «Да» → leaves room (existing `onLeaveRoom` logic fires)
3. Click «Отмена» → reverts to original «Выйти» button
4. Close menu (✕ or Escape or click outside) → reopening shows «Выйти» again (not stuck in confirm state)
5. No TypeScript errors (`npx tsc --noEmit` clean)

## Do NOT

- Change `handleLeaveRoom` in the parent Lobby component
- Add any new props to `RoomMenu`
- Touch any other components or files
