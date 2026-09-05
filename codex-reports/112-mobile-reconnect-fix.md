# REPORT TASK-112: mobile-reconnect-fix

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-20 20:20
> - **Финиш:** 2026-05-20 20:24
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлен mobile reconnect сценарий: `room:leave` на `/` больше не срабатывает от смены `isConnected`, а сервер сразу broadcast-ит `isConnected=false` в grace-period path. Добавлены debug logs для `player:away`, `player:back` и `disconnect`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — удалён `isConnected` из deps array auto-leave effect, guard `!isConnected` сохранён, добавлен eslint-disable comment.
- `src/server/socket-handlers.mts` — добавлены 3 debug log строки и immediate `broadcastRoomState(io, room)` перед grace-period `setTimeout`.

### Новые файлы

- `codex-reports/112-mobile-reconnect-fix.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Exact Before/After

### `src/components/lobby/Lobby.tsx`

Before:

```tsx
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
}, [isRoomRoute, isConnected, emit]);
```

After:

```tsx
// Only emit room:leave when navigating away from a room route,
// NOT on socket reconnect (isConnected changes must not trigger this).
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (isRoomRoute || !isConnected) return;
  emit('room:leave', {});
}, [isRoomRoute, emit]);
```

### `src/server/socket-handlers.mts`

Before:

```ts
player.isAway = true;
broadcastRoomState(io, room);
```

After:

```ts
player.isAway = true;
console.log(`[Socket] player:away nickname=${player.nickname}`);
broadcastRoomState(io, room);
```

Before:

```ts
player.isAway = false;
broadcastRoomState(io, room);
```

After:

```ts
player.isAway = false;
console.log(`[Socket] player:back nickname=${player.nickname}`);
broadcastRoomState(io, room);
```

Before:

```ts
player.isConnected = false;
```

After:

```ts
player.isConnected = false;
console.log(`[Socket] disconnect nickname=${player.nickname} explicit=${explicit}`);
```

Before:

```ts
if (explicit || room.players.size === 1) {
  room.players.delete(playerId);
  playerRooms.delete(socket.id);
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    return;
  }
  broadcastRoomState(io, room);
  return;
}

// Unexpected disconnect with other players present keeps the reconnect grace period.
setTimeout(() => {
```

After:

```ts
if (explicit || room.players.size === 1) {
  room.players.delete(playerId);
  playerRooms.delete(socket.id);
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    return;
  }
  broadcastRoomState(io, room);
  return;
}

// Broadcast immediately so other clients see the grayscale avatar.
broadcastRoomState(io, room);

// Unexpected disconnect with other players present keeps the reconnect grace period.
setTimeout(() => {
```

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 5 ++++-
src/server/socket-handlers.mts | 8 +++++++-
2 files changed, 11 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | TypeScript прошёл без ошибок |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- `src/components/lobby/Lobby.tsx:273-279` — ключевой фикс reconnect loop.
- `src/server/socket-handlers.mts:397-398` — immediate broadcast для grayscale before grace timeout.
- `300000` timeout из TASK-111 сохранён.
