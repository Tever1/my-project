# REPORT TASK-117: permanent-kick-after-grace

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-20 22:17
> - **Финиш:** 2026-05-20 22:22
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлена память о playerId, удалённых grace timer-ом: auto-reconnect теперь отклоняется, а manual join очищает kicked flag и разрешает войти заново. Клиент передаёт `isReconnect: true` в auto-effect и `isReconnect: false` в ручном join.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `kickedPlayerIds`, проверка в `room:join`, запись playerId в grace timer.
- `src/components/lobby/Lobby.tsx` — добавлен `isReconnect` в auto/manual `room:join` payloads.

### Новые файлы

- `codex-reports/117-permanent-kick-after-grace.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Exact Before/After Diffs

### 1. Room interface

Before:

```ts
createdAt: number;
```

After:

```ts
createdAt: number;
kickedPlayerIds: Set<string>;
```

### 2. room:create

Before:

```ts
createdAt: Date.now(),
```

After:

```ts
createdAt: Date.now(),
kickedPlayerIds: new Set<string>(),
```

### 3. room:join payload + kicked-list check

Before:

```ts
socket.on('room:join', (data: { code: string; playerId: string; nickname: string }, callback) => {
```

After:

```ts
socket.on('room:join', (data: { code: string; playerId: string; nickname: string; isReconnect?: boolean }, callback) => {
```

Added after room lookup:

```ts
if (room.kickedPlayerIds.has(data.playerId)) {
  if (data.isReconnect) {
    callback({ success: false, error: 'Player was removed due to inactivity' });
    return;
  }
  room.kickedPlayerIds.delete(data.playerId);
}
```

### 4. grace timer marks kicked

Before:

```ts
if (!player.isConnected) {
  room.players.delete(playerId);
```

After:

```ts
if (!player.isConnected) {
  // Mark as kicked so auto-reconnect (isReconnect=true) is refused.
  // Manual re-join via code input/QR clears this flag.
  room.kickedPlayerIds.add(playerId);
  room.players.delete(playerId);
```

### 5. auto-reconnect useEffect

Before:

```tsx
emit('room:join', { code, playerId: user.id, nickname: user.nickname }, (res: unknown) => {
```

After:

```tsx
emit('room:join', { code, playerId: user.id, nickname: user.nickname, isReconnect: true }, (res: unknown) => {
```

### 6. manual handleJoinRoom

Before:

```tsx
const sent = emit('room:join', { code, ...player }, (response: unknown) => {
```

After:

```tsx
const sent = emit('room:join', { code, ...player, isReconnect: false }, (response: unknown) => {
```

---

## Diff stat

```
src/components/lobby/Lobby.tsx |  4 ++--
src/server/socket-handlers.mts | 17 ++++++++++++++++-
2 files changed, 18 insertions(+), 3 deletions(-)
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

- `src/server/socket-handlers.mts:26`, `:115`, `:137-152`, `:424-427`.
- `src/components/lobby/Lobby.tsx:264`, `:399`.
