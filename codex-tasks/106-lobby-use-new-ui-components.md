# TASK-106 — Lobby: use PlayerAvatar + Badge in AvatarPill and RoomMenu

## Goal

Replace three inline style blocks in `Lobby.tsx` with the new reusable UI components
created in TASK-104/105. No behaviour changes — purely visual/code cleanup.

## Whitelist

- `src/components/lobby/Lobby.tsx` — only the three targeted spots described below

## Acceptance criteria

- `npm run lint` passes (no new errors)
- `npm run build` passes
- Lobby still renders correctly (no visual regressions)
- `const initial = user.nickname.charAt(0)` line and the inline `<div>` avatar
  circle in `AvatarPill` are gone — replaced by `<PlayerAvatar>`
- Inline `<span>` "хост" badge in RoomMenu player chips is gone — replaced by `<Badge>`
- `<PlayerAvatar size="xs">` appears before the nickname in each player chip

---

## Changes

### 1. Add imports at top of file

After the existing import line:
```ts
import { GameIcon } from "@/components/GameIcon";
```

Add:
```ts
import { PlayerAvatar, Badge } from "@/components/ui";
```

---

### 2. AvatarPill — replace inline avatar circle with `<PlayerAvatar>`

**Location:** function `AvatarPill`, around line 1064–1106.

Find this block (the avatar div + the `const initial` line above it):

```tsx
const initial = user.nickname.charAt(0);
return (
  <motion.button
    ...
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #ff9f0a, #ff375f)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        color: "white",
      }}
    >
      {initial}
    </div>
    {!isMobile && <span style={{ fontSize: 14, fontWeight: 600 }}>{user.nickname}</span>}
  </motion.button>
);
```

Replace with (remove `const initial` line, replace the div):

```tsx
return (
  <motion.button
    ...
  >
    <PlayerAvatar nickname={user.nickname} size="sm" />
    {!isMobile && <span style={{ fontSize: 14, fontWeight: 600 }}>{user.nickname}</span>}
  </motion.button>
);
```

Keep all `motion.button` props unchanged (data-topbar, onClick, onFocus, onBlur,
whileHover, whileTap, transition, style). Only remove `const initial` and replace
the inner `<div>` with `<PlayerAvatar nickname={user.nickname} size="sm" />`.

---

### 3. RoomMenu player chips — add PlayerAvatar + replace «хост» badge

**Location:** inside `connectedPlayers.map(...)`, around lines 2162–2215.

Find the player chip button content:

```tsx
<span>{player.nickname}</span>
{isHost && (
  <span
    style={{
      padding: "3px 7px",
      borderRadius: radius.full,
      background: `linear-gradient(135deg, ${accent}, ${deep})`,
      color: "white",
      fontSize: 10,
      fontWeight: 800,
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    }}
  >
    хост
  </span>
)}
```

Replace with:

```tsx
<PlayerAvatar nickname={player.nickname} size="xs" />
<span>{player.nickname}</span>
{isHost && (
  <Badge variant="game" gameColor={accent}>хост</Badge>
)}
```

Keep all surrounding `<button>` props unchanged (type, data-player-chip, onClick,
style). Only modify the button's children as shown above.

---

## Notes

- Do NOT change any logic, event handlers, socket events, or other parts of the file.
- Do NOT change the `<motion.button>` wrapper styles in AvatarPill.
- The `accent` variable is already in scope inside the RoomMenu component — use it
  directly as `gameColor={accent}`.
- `PlayerAvatar size="xs"` = 24px circle. `size="sm"` = 32px (matches current 32px inline div).

## Report

Write report to `codex-reports/106-lobby-use-new-ui-components.md`.
Include: exact lines changed, lint/build status.
Do NOT commit.
