# TASK-131: Quiz mid-game reconnect + host role fix

> **Метаданные**
> - **Дата создания:** 2026-05-22
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~20 минут
> - **Зависит от тасков:** TASK-119 (mobile reconnect, merged)

---

## Цель

1. **Баг 1 — рефреш выбивает из квиза.** Игрок обновляет страницу во время квиза →
   новый сокет не входит в `room:${code}` channel → все `game:action` события
   до него не доходят → игрок видит пустой экран и выпадает из игры.
   Фикс: quiz-страница должна делать `room:join` с `isReconnect: true` при
   каждом (ре)конекте сокета, как это делает `Lobby.tsx`.

2. **Баг 2 — хост теряет роль после рефреша.** Сервер мгновенно переназначает хоста
   в `handleDisconnect`, ещё до grace-period. Хост нечаянно обновил страницу →
   роль ушла другому → после реконнекта кнопка «Завершить» исчезает.
   Фикс: перенести переназначение хоста из немедленного disconnect → в конец
   grace-period таймера (только если игрок так и не вернулся через 5 мин).

3. **Баг 2b — двойное подтверждение завершения.** `onEnd` в GameLayout зовёт
   `endGame()` который открывает modal в quiz-странице поверх уже закрытого
   GameLayout-модала. Пользователь кликает «Завершить» дважды.
   Фикс: передавать в GameLayout `confirmEndGame` вместо `endGame`.

---

## Контекст

### Баг 1 — детали

`quiz/page.tsx` при монтировании делает `emit('room:get-state', { code: roomId })`.
Это даёт прямой ответ от сервера только запрашивающему сокету, но **не добавляет
сокет в socket.io room `room:${code}`**. Добавление в channel происходит только
через `socket.join()` на сервере, которое вызывается только в хэндлере `room:join`.

После рефреша:
- Новый сокет получает state (через `room:get-state`) — хорошо.
- Но не получает последующие `game:action`, `room:state` (они идут через
  `io.to('room:code')`) — плохо.
- Старый сокет в grace-period, но новый никогда не «заявил права» на слот.

Как сделано в `Lobby.tsx` (строки ~260-272):
```ts
useEffect(() => {
  if (!user || !isConnected) return;
  const code = initialCode || roomCode;
  if (!code) return;
  emit('room:join', { code, playerId: user.id, nickname: user.nickname, isReconnect: true },
    (res) => {
      const response = res as { success: boolean; error?: string };
      if (!response.success) {
        router.push('/');
      }
    }
  );
}, [emit, initialCode, roomCode, isConnected, isRoomRoute, router, user]);
```

Quiz-страница должна делать то же самое.

### Баг 2 — детали

В `handleDisconnect` (`src/server/socket-handlers.mts`, строки ~389-397):
```ts
// If host disconnects, assign new host  ← происходит НЕМЕДЛЕННО
if (player.isHost && room.players.size > 1) {
  player.isHost = false;
  for (const [, p] of room.players.entries()) {
    if (p.id !== playerId && p.isConnected) {
      p.isHost = true;
      room.hostId = p.id;
      break;
    }
  }
}
```

Нужно убрать этот блок из моментального disconnect и добавить его внутрь
grace-period таймера (строки ~419-431), который срабатывает через 5 мин:

```ts
player.reconnectTimer = setTimeout(() => {
  if (!player.isConnected) {
    // NEW: transfer host only now (player didn't reconnect in time)
    if (player.isHost && room.players.size > 1) {
      player.isHost = false;
      for (const [, p] of room.players.entries()) {
        if (p.id !== playerId && p.isConnected) {
          p.isHost = true;
          room.hostId = p.id;
          break;
        }
      }
    }
    room.kickedPlayerIds.add(playerId);
    room.players.delete(playerId);
    ...
  }
}, 300000);
```

### Баг 2b — детали

В `quiz/page.tsx`:
```ts
// СЕЙЧАС (строка ~627):
onEnd={isHost ? endGame : undefined}

// endGame() только открывает второй modal:
const endGame = () => { setShowEndConfirm(true); };
```

GameLayout уже имеет свой modal подтверждения. После него зовёт `onEnd()`.
Если `onEnd = endGame`, открывается ещё один modal — лишний.

Фикс:
```ts
onEnd={isHost ? confirmEndGame : undefined}
```

`confirmEndGame` напрямую делает `emit('game:end')` без лишнего modal.

---

## Файлы к изменению (whitelist)

- `src/server/socket-handlers.mts` — перенос host reassignment в grace timer
- `src/app/game/[roomId]/quiz/page.tsx` — auto-reconnect useEffect + исправление onEnd

### НЕ ТРОГАТЬ

- `src/components/lobby/Lobby.tsx` — не трогаем
- `src/lib/use-socket.ts` — не трогаем
- `CLAUDE.md`, `AGENTS.md`
- все остальные файлы вне whitelist

---

## Шаги реализации

### 1. `socket-handlers.mts` — убрать немедленный host reassignment

Найти блок в `handleDisconnect` (после `player.isConnected = false;`):

```ts
// If host disconnects, assign new host
if (player.isHost && room.players.size > 1) {
  player.isHost = false;
  for (const [, p] of room.players.entries()) {
    if (p.id !== playerId && p.isConnected) {
      p.isHost = true;
      room.hostId = p.id;
      break;
    }
  }
}
```

**Удалить этот блок** из места после `player.isConnected = false`.

### 2. `socket-handlers.mts` — добавить host reassignment в grace timer

Найти `player.reconnectTimer = setTimeout(() => {` и внутри `if (!player.isConnected) {`
добавить host reassignment **перед** `room.kickedPlayerIds.add(playerId)`:

```ts
// Transfer host role only after grace period expires (player never came back)
if (player.isHost && room.players.size > 1) {
  player.isHost = false;
  for (const [, p] of room.players.entries()) {
    if (p.id !== playerId && p.isConnected) {
      p.isHost = true;
      room.hostId = p.id;
      break;
    }
  }
  broadcastRoomState(io, room);
}
room.kickedPlayerIds.add(playerId);
room.players.delete(playerId);
```

Обрати внимание: `broadcastRoomState` уже вызывается дальше по коду после delete.
Дополнительный вызов нужен только если хост передан — чтобы клиенты сразу узнали
о новом хосте. Если `room.players.size === 0` после delete — вызывать не нужно
(комната удаляется).

### 3. `quiz/page.tsx` — добавить auto-reconnect

Импортировать `isConnected` из `useSocket()`. Найти строку:
```ts
const { emit, on } = useSocket();
```
Изменить на:
```ts
const { emit, on, isConnected } = useSocket();
```

Добавить новый `useEffect` **до** существующих (после объявления `isConnected`):

```ts
// Auto-reconnect: re-join room channel on socket reconnect (e.g. page refresh mid-game)
useEffect(() => {
  if (!user || !isConnected || !roomId) return;
  emit(
    'room:join',
    { code: roomId, playerId: user.id, nickname: user.nickname, isReconnect: true },
    (res: unknown) => {
      const response = res as { success: boolean; error?: string };
      if (!response.success) {
        // Kicked (grace expired) or room gone — send to home
        router.push('/');
      }
    }
  );
}, [isConnected, emit, user, roomId, router]);
```

### 4. `quiz/page.tsx` — исправить onEnd (убрать двойной modal)

Найти строку (~627):
```tsx
onEnd={isHost ? endGame : undefined}
```
Заменить на:
```tsx
onEnd={isHost ? confirmEndGame : undefined}
```

`confirmEndGame` (строки ~594-598) уже делает `setShowEndConfirm(false)`,
`stopTimerSound()` и `emit('game:end')` — этого достаточно.

---

## Acceptance criteria

- [ ] `npm run lint` без ошибок
- [ ] `npm run build` успешен
- [ ] В `handleDisconnect`: блок `// If host disconnects, assign new host` удалён
      из немедленной части
- [ ] В grace-period таймере: host reassignment добавлен перед kick
- [ ] `quiz/page.tsx`: `isConnected` деструктурирован из `useSocket()`
- [ ] `quiz/page.tsx`: useEffect для auto-reconnect присутствует с deps
      `[isConnected, emit, user, roomId, router]`
- [ ] `quiz/page.tsx`: `onEnd={isHost ? confirmEndGame : undefined}`
      (не `endGame`)

---

## Ограничения и подводные камни

- **`explicit` disconnect** (явный выход из игры) обрабатывается отдельно — его
  не трогаем. Там сразу `room.players.delete()` без grace timer.
- **`broadcastRoomState` в grace timer**: вызывать только если действительно
  передали хоста (т.е. `room.players.size > 1`). Если комната опустела —
  вызывать не надо (комната удаляется).
- **`isConnected` dep в auto-reconnect useEffect**: при каждом реконнекте
  (isConnected: false → true) будет новый `room:join`. Это нормально —
  сервер идемпотентно обрабатывает повторные join'ы от существующего игрока.
- **`confirmEndGame` вместо `endGame` в `onEnd`**: убедись что `confirmEndGame`
  объявлен до использования в JSX (он уже есть на строках ~594-598).
- Комментарии — только английский.
- Не коммитить.

---

## Открытые вопросы для Codex

- В `handleDisconnect` после шага 1, строка `broadcastRoomState(io, room)` которая
  стоит СРАЗУ после удалённого блока — оставить её на месте. Она нужна чтобы другие
  клиенты сразу увидели серый аватар.
- В `room:join` хэндлере уже есть проверка kicked-list — она остаётся без изменений.

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только 2 файла из whitelist.
2. `npm run lint` — 0 новых ошибок.
3. `npm run build` — успешен (webpack fallback если Turbopack падает в sandbox).
4. Заполнить `codex-reports/131-quiz-reconnect-host-fix.md`.
5. **Не коммитить.**
