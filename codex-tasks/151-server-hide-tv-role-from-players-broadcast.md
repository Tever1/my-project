# TASK-151: сервер — скрыть TV-роль из broadcasted players (десктоп не игрок)

> **Метаданные**
> - **Дата создания:** 2026-05-26
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** TASK-150

---

## Цель

Десктоп (`role='tv'`) перестаёт отображаться как игрок где бы то ни было: ни в лобби, ни в QR-экране, ни в скорборде квиза. TV — это устройство отображения, а не участник игры.

---

## Контекст

После TASK-150 квиз работает, но пользователь обнаружил: создал комнату с десктопа, подключил 2 телефона — отображалось **3 игрока**. Третий — десктоп с `role='tv'`.

Сейчас на сервере (`src/server/socket-handlers.mts`):
- `room:create` и `room:join` добавляют socket в `room.players` независимо от роли.
- `broadcastRoomState` отправляет весь `room.players` всем клиентам.

На клиенте фильтры `role !== "tv"` стоят в Lobby (QR-экран line 644, room-panel line 1720) и на join-странице (line 113, фикс TASK-150). НО:
- `tv/[gameType]/page.tsx` — скорборд берёт `players` из `room:state` напрямую, не фильтрует.
- `game/[roomId]/quiz/page.tsx` — `gameState.players` включает TV, поэтому `totalPlayers`, scoreboard и подобные счётчики завышены на 1.
- Аналогично — `crocodile`, `alias`, `mafia`, `spy`, `who-am-i`, `hundred-to-one` (все читают `players` из room:state).

Вместо того чтобы плодить фильтры в каждом файле, **отфильтровать на сервере один раз**: TV хранится в `room.players` для внутреннего учёта (reconnect, away/back, disconnect), но в broadcasted `players` его нет.

`hostId` остаётся прежним (указывает на десктопа-создателя). Клиентский код `roomState?.hostId === user?.id` продолжает работать.

`tvConnected` тоже остаётся — вычисляется ДО фильтра.

---

## Файлы к изменению (whitelist)

- `src/server/socket-handlers.mts` — отфильтровать `role === 'tv'` из broadcasted `players` в двух местах: `broadcastRoomState` и `room:get-state` handler.

### НЕ ТРОГАТЬ

- Никаких клиентских файлов. Существующие клиентские фильтры `role !== "tv"` остаются как есть — они становятся избыточны, но не вредят.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

### Шаг 1: `broadcastRoomState` (около line 68)

Текущий код:
```ts
function broadcastRoomState(io: SocketIOServer, room: Room) {
  const players = Array.from(room.players.values()).map(({ socketId: _socketId, ...rest }) => {
    void _socketId;
    return rest;
  });
  const state = {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    players,
    maxPlayers: room.maxPlayers,
    status: room.status,
    currentGame: room.currentGame,
    gameState: room.gameState,
    tvConnected: players.some((p) => p.role === 'tv' && p.isConnected),
    gameHostPlayerId: room.gameHostPlayerId,
  };
  io.to(`room:${room.code}`).emit('room:state', state);
}
```

Новый код:
```ts
function broadcastRoomState(io: SocketIOServer, room: Room) {
  const allPlayers = Array.from(room.players.values());
  const tvConnected = allPlayers.some((p) => p.role === 'tv' && p.isConnected);
  const players = allPlayers
    .filter((p) => p.role !== 'tv')
    .map(({ socketId: _socketId, ...rest }) => {
      void _socketId;
      return rest;
    });
  const state = {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    players,
    maxPlayers: room.maxPlayers,
    status: room.status,
    currentGame: room.currentGame,
    gameState: room.gameState,
    tvConnected,
    gameHostPlayerId: room.gameHostPlayerId,
  };
  io.to(`room:${room.code}`).emit('room:state', state);
}
```

### Шаг 2: `room:get-state` handler (около line 218-241)

Аналогичная правка — добавить фильтр `role !== 'tv'` после `Array.from(...)` и вычислить `tvConnected` ДО фильтра. Сохранить ту же структуру ответа.

### Шаг 3: проверки

- `npm run lint` — без новых ошибок.
- `npx tsc --noEmit` — без ошибок.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` успешен
- [ ] `broadcastRoomState` фильтрует TV из `players`, но сохраняет `tvConnected`
- [ ] `room:get-state` handler фильтрует TV из `players`, но сохраняет `tvConnected`
- [ ] `room.players` Map остаётся нетронут (TV там хранится для disconnect/reconnect/away/back логики)
- [ ] Никаких изменений в файлах вне whitelist

---

## Открытые вопросы

Нет.

---

## Отчёт

Codex пишет отчёт в `codex-reports/151-server-hide-tv-role-from-players-broadcast.md`:
- diff-сводка
- результаты lint/tsc
- подтверждение что `room.players` Map не тронут
