# REPORT TASK-115: fix-reconnect-and-timer

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-20 21:04
> - **Финиш:** 2026-05-20 21:09
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На socket reconnect клиент теперь отправляет `player:back`, если документ видим. На сервере добавлен `reconnectTimer`, предыдущий grace-period таймер очищается перед новым, а успешный `room:join` отменяет pending timer.

---

## Что сделано

### Изменённые файлы

- `src/lib/use-socket.ts` — `onConnect` теперь делает `socket.emit('player:back')`, если `document.hidden === false`.
- `src/server/socket-handlers.mts` — добавлен `reconnectTimer`, clearTimeout при reconnect через `room:join`, clearTimeout перед новым grace timer.

### Новые файлы

- `codex-reports/115-fix-reconnect-and-timer.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Before/After Diffs

### `src/lib/use-socket.ts`

Before:

```ts
const onConnect = () => setIsConnected(true);
```

After:

```ts
const onConnect = () => {
  setIsConnected(true);
  if (typeof document !== 'undefined' && !document.hidden) {
    socket.emit('player:back');
  }
};
```

### `src/server/socket-handlers.mts` — Player

Before:

```ts
team?: string;
```

After:

```ts
team?: string;
reconnectTimer?: ReturnType<typeof setTimeout>;
```

### `src/server/socket-handlers.mts` — room:join

Before:

```ts
if (existingPlayer) {
  existingPlayer.socketId = socket.id;
  existingPlayer.isConnected = true;
  existingPlayer.isAway = false;
} else {
```

After:

```ts
if (existingPlayer) {
  if (existingPlayer.reconnectTimer) {
    clearTimeout(existingPlayer.reconnectTimer);
    existingPlayer.reconnectTimer = undefined;
  }
  existingPlayer.socketId = socket.id;
  existingPlayer.isConnected = true;
  existingPlayer.isAway = false;
} else {
```

### `src/server/socket-handlers.mts` — grace timer

Before:

```ts
// Unexpected disconnect with other players present keeps the reconnect grace period.
setTimeout(() => {
```

After:

```ts
// Cancel any existing grace-period timer before starting a new one.
// Mobile may disconnect/reconnect multiple times; only the latest timer counts.
if (player.reconnectTimer) clearTimeout(player.reconnectTimer);

// Unexpected disconnect with other players present keeps the reconnect grace period.
player.reconnectTimer = setTimeout(() => {
```

---

## Diff stat

```
src/lib/use-socket.ts          |  7 ++++++-
src/server/socket-handlers.mts | 11 ++++++++++-
2 files changed, 16 insertions(+), 2 deletions(-)
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

- `src/lib/use-socket.ts:22-27` — restore color on reconnect.
- `src/server/socket-handlers.mts:155-158` — cancel pending timer on successful reconnect.
- `src/server/socket-handlers.mts:407-410` — only latest grace timer remains active.
- Timeout `300000` не менялся.
