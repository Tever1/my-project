# TASK-205 — Авто-передача хоста случайному игроку при выходе хоста

## Контекст / баги

Когда хост покидает комнату, хост должен автоматически перейти к **случайному**
оставшемуся игроку (`role: 'player'`). Сейчас это сломано в двух местах
`src/server/socket-handlers.mts`:

1. **Явный выход** (`room:leave` → `handleDisconnect(io, socket, true)`,
   ветка `if (explicit)`, строки ~505-516): игрок просто удаляется
   (`room.players.delete`), но **хост не передаётся вообще**. Если выходит хост —
   `room.hostId` / `room.gameHostPlayerId` остаются указывать на удалённого
   игрока. Комната остаётся без хоста.

2. **Дисконнект после grace-периода** (строки ~527-540): передача есть, но:
   - берёт **первого** подключённого игрока (`for...break`), а не случайного;
   - **не фильтрует** `role === 'player'` → хостом может стать TV/экран
     (нарушение ролевой модели TASK-202);
   - обновляет только `room.hostId`, но **НЕ** `room.gameHostPlayerId`.

**Эталон корректной логики** — ручной хендлер `room:transfer-host`
(строки ~413-426): новый хост обязан быть `role === 'player'`, сбрасывается
`isHost` у всех, ставится у нового, обновляются И `hostId`, И `gameHostPlayerId`.

## Целевое поведение (подтверждено пользователем)

При выходе/дисконнекте игрока, который был хостом (`isHost === true`):
- Выбрать **случайного** игрока среди оставшихся с `role === 'player'` и
  `isConnected === true` (исключая выходящего).
- Сделать его хостом: сбросить `isHost` у всех, поставить `true` новому,
  `room.hostId = newHost.id`, `room.gameHostPlayerId = newHost.id`.
- Если подходящих игроков нет (остались только TV/экран или никого) —
  **сбросить хоста**: `room.hostId = ''`, `room.gameHostPlayerId = null`
  (хоста нет; следующий зашедший телефон-игрок станет хостом автоматически
  через существующий join-логик, строка ~254). Комнату НЕ закрывать.

Если выходящий игрок не был хостом — ничего не делать (поведение как сейчас).

## Что сделать

Файл: `src/server/socket-handlers.mts`.

### 1. Добавить module-level хелпер

Рядом с другими хелперами (например, около `scheduleRoomInactivityCheck` /
`broadcastRoomState`, вне `io.on('connection')`), добавить:

```ts
// Reassign host to a random remaining connected player (role:'player') when the
// host leaves. If none eligible, clear host so the next joining phone becomes host.
// Mirrors the role-model rules of the manual room:transfer-host handler.
function reassignHostOnLeave(room: Room, departingPlayerId: string): void {
  const eligible = Array.from(room.players.values()).filter(
    (p) => p.id !== departingPlayerId && p.role === 'player' && p.isConnected,
  );
  for (const p of room.players.values()) {
    p.isHost = false;
  }
  if (eligible.length > 0) {
    const newHost = eligible[Math.floor(Math.random() * eligible.length)];
    newHost.isHost = true;
    room.hostId = newHost.id;
    room.gameHostPlayerId = newHost.id;
  } else {
    room.hostId = '';
    room.gameHostPlayerId = null;
  }
}
```

(Тип `Room` уже определён в файле — используй существующий. Если хелперы лежат
не на module-level, а внутри замыкания — размести так, чтобы был доступен из
`handleDisconnect`. Главное: НЕ дублировать тип `Room`, НЕ менять сигнатуры
существующих функций.)

### 2. Явный выход (ветка `if (explicit)`, ~505-516)

Захватить флаг хоста ДО удаления и вызвать хелпер ПОСЛЕ удаления, если комната
не опустела:

```ts
if (explicit) {
  const wasHost = player.isHost;
  room.players.delete(playerId);
  playerRooms.delete(socket.id);
  if (room.players.size === 0) {
    if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
    rooms.delete(roomCode);
    return;
  }
  if (wasHost) reassignHostOnLeave(room, playerId);
  scheduleRoomInactivityCheck(io, room);
  broadcastRoomState(io, room);
  return;
}
```

### 3. Дисконнект после grace (~527-554)

Заменить inline-блок передачи хоста (строки ~530-540) на вызов хелпера.
Было:

```ts
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
```

Стало:

```ts
const wasHost = player.isHost;
// игрок удаляется ниже; реассайн делаем перед удалением/после — главное до broadcast
```

Логику привести к такому порядку внутри `if (!player.isConnected) { ... }`:
```ts
const wasHost = player.isHost;
room.kickedPlayerIds.add(playerId);
room.players.delete(playerId);
if (room.players.size === 0) {
  if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
  rooms.delete(roomCode);
} else {
  if (wasHost) reassignHostOnLeave(room, playerId);
  scheduleRoomInactivityCheck(io, room);
  broadcastRoomState(io, room);
}
```

(Т.е. реассайн происходит уже после удаления игрока из `room.players` —
`departingPlayerId` всё равно исключается фильтром, так что это безопасно.
Убедись, что не остаётся старого `for...break`-блока и двойного broadcast.)

## Чего НЕ трогать

- Ручной `room:transfer-host`, `room:kick` — оставить как есть.
- `room:join` host-assignment (строка ~254) — не трогать, он и закрывает кейс
  «сброшен хост → следующий телефон станет хостом».
- Grace-период (300000 мс), `scheduleRoomInactivityCheck`, `kickedPlayerIds`,
  reconnect-логику — НЕ менять (кроме перестановки строк выше).
- Клиентский код (`src/app/**`, `src/components/**`).

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/server/socket-handlers.mts`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
любые другие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика:
  - Хост вышел (явно или дисконнект 5 мин), есть ≥1 другой `role:'player'`
    подключён → хост случайно переходит к одному из них; `hostId` и
    `gameHostPlayerId` совпадают с новым хостом.
  - Хост вышел, остались только TV/экран → `hostId=''`, `gameHostPlayerId=null`,
    комната жива; следующий зашедший телефон-игрок становится хостом.
  - Вышел не-хост → хост не меняется.

## Отчёт

`codex-reports/205-auto-transfer-host-on-leave.md`. Не коммить.
