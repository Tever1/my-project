# TASK-210 — Прервать игру и вернуть в лобби, когда вышли ВСЕ игроки

## Контекст / требование (от пользователя)

Если во время идущей игры из комнаты выходят **все игроки** — игра должна
прерваться, а игровое поле (TV-дисплей) вернуться в лобби.

## Корень

Файл: `src/server/socket-handlers.mts`, функция `handleDisconnect`
(около строк 525-593). Сейчас при выходе игрока комната закрывается только при
`room.players.size === 0`. Но:
- TV-дисплей подключён через `room.tvSocketId` (обрабатывается отдельно, строка
  533) и **не входит** в `room.players`.
- Создатель-десктоп (TV-лобби) заходит с `role: 'tv'` и остаётся в
  `room.players` как «призрак» в grace-периоде (5 мин) после навигации на
  игровой экран.

Поэтому когда все телефоны (`role: 'player'`) вышли, `room.players.size` может
быть `!= 0` (висит `role:'tv'` запись), игра НЕ прерывается, а статус остаётся
`in-game` — TV-дисплей застревает на игровом поле.

Событие `game:ended` уже уводит TV в `/lobby/{roomId}`, а телефоны в `/join`
(`src/lib/use-navigate-on-game-end.ts`) — менять его НЕ нужно, только инициировать.

## Что сделать

Файл: `src/server/socket-handlers.mts`. Менять ТОЛЬКО его.

### 1. Хелпер (рядом с `reassignHostOnLeave`, около строк 162-183)

```ts
// If an in-progress game loses its last real player (role:'player'), abort the
// game and return everyone (incl. the TV display) to the lobby. The TV/lobby
// 'tv' entries don't count — only phones playing the game keep it alive.
function abortGameIfNoPlayers(io: SocketIOServer, room: Room): boolean {
  if (room.status !== 'in-game') return false;
  const hasPlayers = Array.from(room.players.values()).some(
    (p) => p.role === 'player',
  );
  if (hasPlayers) return false;
  room.status = 'lobby';
  room.gameState = null;
  room.currentGame = null;
  room.pendingQuizConfig = null;
  broadcastRoomState(io, room);
  io.to(`room:${room.code}`).emit('game:ended');
  return true;
}
```

(Сигнатуру/значения сброса держать идентичными хендлеру `game:end`, около строк
402-412.)

### 2. Вызвать хелпер в обеих ветках `handleDisconnect` после удаления игрока

- **Explicit-ветка** (около строк 545-557): после `room.players.delete(playerId)`
  и существующей проверки `room.players.size === 0` (если комната не удалена) —
  перед `broadcastRoomState`/после `reassignHostOnLeave` вызвать
  `abortGameIfNoPlayers(io, room)`. Если он вернул `true`, повторный
  `broadcastRoomState` не обязателен (хелпер уже разослал). Не ломать
  существующий поток reassignHost.
- **Grace-timer ветка** (около строк 569-585): внутри `setTimeout`, в `else`
  (когда `room.players.size !== 0`) после `reassignHostOnLeave` + до/вместо
  финального `broadcastRoomState` вызвать `abortGameIfNoPlayers(io, room)`.

Аккуратно: если `room.players.size === 0` (комната удаляется) — хелпер не нужен
(комнаты больше нет), оставить существующую логику удаления как есть.

## Поведение, которое должно получиться

- Идёт игра, выходят/удаляются все `role:'player'` → `status` сбрасывается в
  `lobby`, `currentGame=null`, рассылается `game:ended` → TV уходит в
  `/lobby/{roomId}`, телефоны (если остались) — в `/join`.
- Если игрок просто свернул телефон (disconnect, grace) — он ещё в `room.players`,
  игра НЕ прерывается, пока grace-таймер не удалит его окончательно.
- Вне игры (`status !== 'in-game'`) хелпер ничего не делает.

## Чего НЕ трогать

- `use-navigate-on-game-end.ts`, клиентские файлы, `/tv`, `/join`, `Lobby.tsx`.
- `game:end`, `game:start`, `game:select`, `game:deselect`, `reassignHostOnLeave`,
  логику kicked/grace/reconnect — только добавить вызовы хелпера.
- Путь удаления комнаты при `room.players.size === 0`.

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/server/socket-handlers.mts`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика соответствует разделу «Поведение, которое должно получиться».

## Отчёт

`codex-reports/210-abandon-game-when-no-players.md`. Не коммить.
