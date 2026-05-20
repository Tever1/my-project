# TASK-110 — Away state: visibility-based away/back + grayscale avatar

## Goal

Show players as "away" (grayscale avatar) when they background the tab,
lock screen, or receive a call — without removing them from the room.

When they return, avatar becomes colored again.

Disconnected players (socket dropped) also show grayscale (same visual signal:
"not active right now").

## Whitelist

- `src/server/socket-handlers.mts`
- `src/lib/use-socket.ts`
- `src/components/ui/PlayerAvatar.tsx`
- `src/components/lobby/Lobby.tsx`

## Acceptance criteria

- `npm run lint` passes (no new errors)
- `npm run build` passes
- Server `Player` interface gets `isAway: boolean` field, initialized `false`
- Server handles `player:away` and `player:back` events: updates `isAway` on the
  current socket's player, broadcasts room state
- `broadcastRoomState` includes `isAway` in each player object
- `useSocket` adds a `visibilitychange` listener that emits `player:away` when
  `document.hidden === true`, `player:back` when visible again
- `PlayerAvatar` accepts optional `away?: boolean` prop. When true: applies
  `filter: 'grayscale(1)'` and `opacity: 0.5`. Transition `200ms ease`.
- `RoomPlayer` interface on client gets `isAway: boolean` field
- All `<PlayerAvatar>` usages in RoomMenu chips pass `away={!player.isConnected || player.isAway}`
- `AvatarPill` (current user's own avatar) is NOT made grayscale — user's own
  avatar always stays colored regardless of their own visibility state

---

## Part 1: Server (`src/server/socket-handlers.mts`)

### 1.1 Add `isAway` to Player interface (line 4–11)

```ts
interface Player {
  id: string;
  socketId: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway: boolean;
  team?: string;
}
```

### 1.2 Initialize `isAway: false` when creating players

In `room:create` handler (~line 113), the player object:
```ts
const player: Player = {
  id: data.playerId,
  socketId: socket.id,
  nickname: data.nickname,
  isHost: true,
  isConnected: true,
  isAway: false,    // ← add
};
```

In `room:join` handler (~line 154):
```ts
const player: Player = {
  id: data.playerId,
  socketId: socket.id,
  nickname: data.nickname,
  isHost: false,
  isConnected: true,
  isAway: false,    // ← add
};
```

Also: when an existing player reconnects (~line 151), reset isAway to false:
```ts
if (existingPlayer) {
  existingPlayer.socketId = socket.id;
  existingPlayer.isConnected = true;
  existingPlayer.isAway = false;    // ← add
}
```

### 1.3 Include `isAway` in admin API snapshot (~line 36–43)

```ts
players: Array.from(room.players.values()).map((p) => ({
  nickname: p.nickname,
  isHost: p.isHost,
  isConnected: p.isConnected,
  isAway: p.isAway,    // ← add
})),
```

### 1.4 Add `player:away` and `player:back` handlers

Add new handlers near the other `socket.on(...)` blocks (e.g. after `room:leave`,
before `disconnect`):

```ts
socket.on('player:away', () => {
  const roomCode = playerRooms.get(socket.id);
  if (!roomCode) return;
  const room = getRoomByCode(roomCode);
  if (!room) return;
  for (const player of room.players.values()) {
    if (player.socketId === socket.id) {
      if (!player.isAway) {
        player.isAway = true;
        broadcastRoomState(io, room);
      }
      return;
    }
  }
});

socket.on('player:back', () => {
  const roomCode = playerRooms.get(socket.id);
  if (!roomCode) return;
  const room = getRoomByCode(roomCode);
  if (!room) return;
  for (const player of room.players.values()) {
    if (player.socketId === socket.id) {
      if (player.isAway) {
        player.isAway = false;
        broadcastRoomState(io, room);
      }
      return;
    }
  }
});
```

`broadcastRoomState` already exposes all player fields except `socketId` via
the spread, so `isAway` will be included automatically — no changes needed
to `broadcastRoomState` itself.

---

## Part 2: Client visibility listener (`src/lib/use-socket.ts`)

Add a new `useEffect` inside `useSocket()` that registers a `visibilitychange`
listener on `document`. When document becomes hidden, emit `player:away`.
When visible, emit `player:back`.

```ts
useEffect(() => {
  if (typeof document === 'undefined') return;
  const onVisibilityChange = () => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    if (document.hidden) {
      socket.emit('player:away');
    } else {
      socket.emit('player:back');
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}, []);
```

Place after the existing main `useEffect` (the one that calls `connectSocket()`).

Note: harmless if user isn't in any room — server handlers no-op for
sockets not in `playerRooms`.

---

## Part 3: PlayerAvatar accepts `away` prop (`src/components/ui/PlayerAvatar.tsx`)

Add `away?: boolean` to the interface. When true, apply grayscale + opacity:

```tsx
interface PlayerAvatarProps {
  nickname: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  away?: boolean;
  className?: string;
}

export function PlayerAvatar({
  nickname,
  size = 'md',
  away = false,
  className = '',
}: PlayerAvatarProps) {
  // ... existing logic ...

  return (
    <div
      className={className}
      aria-label={nickname}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: GRADIENTS[charCode % GRADIENTS.length],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: px * 0.4,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        filter: away ? 'grayscale(1)' : undefined,
        opacity: away ? 0.5 : 1,
        transition: 'filter 200ms ease, opacity 200ms ease',
      }}
    >
      {initial}
    </div>
  );
}
```

---

## Part 4: Lobby uses isAway (`src/components/lobby/Lobby.tsx`)

### 4.1 Extend `RoomPlayer` interface (~line 54)

```ts
interface RoomPlayer {
  id: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway: boolean;
}
```

### 4.2 In RoomMenu player chips, pass `away` to PlayerAvatar

Find the `<PlayerAvatar nickname={player.nickname} size="xs" />` inside
`connectedPlayers.map(...)` (around line 2180) and change to:

```tsx
<PlayerAvatar
  nickname={player.nickname}
  size="xs"
  away={!player.isConnected || player.isAway}
/>
```

### 4.3 AvatarPill stays colored

Do NOT add `away` prop to the `<PlayerAvatar nickname={user.nickname} size="sm" />`
inside `AvatarPill` — current user's own avatar always stays colored.

---

## Notes

- The visibility listener is global per socket — fires from any page. Server
  no-ops if socket isn't in a room. Safe.
- Don't add cleanup-style emit on unmount — visibility events are enough.
- Don't change the disconnect grace period logic — `isConnected` and `isAway`
  are independent fields.

## Report

Write report to `codex-reports/110-away-state-visibility.md`.
Include: files changed, lint/build status, any TypeScript adjustments.
Do NOT commit.
