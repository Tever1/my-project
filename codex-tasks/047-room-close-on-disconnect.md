# TASK-047: Мгновенное закрытие комнаты / передача хоста при выходе

## Цель

1. **Один игрок в комнате** — при любом дисконнекте (закрыл вкладку, вышел из сети) 
   комната удаляется **немедленно**, без 30-секундного таймаута.
2. **Несколько игроков, игрок выходит явно (`room:leave`)** — игрок сразу удаляется 
   из комнаты (не через 30с). Хост передаётся мгновенно если нужно.
3. **Несколько игроков, неожиданный дисконнект** — поведение остаётся прежним: 
   хост передаётся сразу, сам игрок удаляется через 30с (даёт время на переподключение).

## Контекст

`src/server/socket-handlers.mts` — функция `handleDisconnect` (строки ~311-361).
Сейчас она одинаково обрабатывает intentional leave и disconnect: 30с таймаут всегда.

Обработчик `room:leave` (строка ~297) просто вызывает `handleDisconnect`.

## Файлы

**Whitelist:** только `src/server/socket-handlers.mts`

## Изменения

### 1. Изменить сигнатуру `handleDisconnect`

```ts
function handleDisconnect(io: SocketIOServer, socket: Socket, explicit = false)
```

### 2. Внутри `handleDisconnect` — блок работы с игроком

Текущая логика (строки ~327-357):
```ts
player.isConnected = false;
// host transfer
// 30s setTimeout → remove player
```

Новая логика:

```ts
player.isConnected = false;

// If host disconnects and multiple players, assign new host immediately
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

if (explicit || room.players.size === 1) {
  // Intentional leave OR last player — remove immediately, no grace period
  room.players.delete(playerId);
  playerRooms.delete(socket.id);
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    return; // room gone, no broadcast needed
  }
  broadcastRoomState(io, room);
  return;
}

// Unexpected disconnect with other players still present — 30s grace for reconnect
setTimeout(() => {
  if (!player.isConnected) {
    room.players.delete(playerId);
    if (room.players.size === 0) {
      rooms.delete(roomCode);
    } else {
      broadcastRoomState(io, room);
    }
  }
}, 30000);
```

### 3. Обновить вызов из `room:leave`

Строка ~298: `handleDisconnect(io, socket)` → `handleDisconnect(io, socket, true)`

### 4. Убедиться что `playerRooms.delete` не дублируется

Строка ~359 (`playerRooms.delete(socket.id)`) выполняется после цикла.
В новой логике для explicit/single мы уже делаем `return` раньше — 
убедиться, что `playerRooms.delete` вызывается во всех путях.
Перенести `playerRooms.delete(socket.id)` и `broadcastRoomState` после `break` 
только для пути с setTimeout, остальные пути уже обработаны внутри блока.

## Acceptance

- `npx tsc --noEmit` проходит без ошибок
- Логически: явный `room:leave` → игрок удалён сразу, без 30с задержки
- Последний игрок закрыл вкладку → комната удаляется немедленно (не через 30с)
- Несколько игроков, один дисконнектнулся случайно → 30с grace period остаётся

## Не трогать

- Логику TV socket (строки ~318-324)
- Логику `room:create`, `room:join`, `room:kick`, `room:transfer-host`
- Всё кроме функции `handleDisconnect` и обработчика `room:leave`

## Отчёт

`codex-reports/047-room-close-on-disconnect.md`
