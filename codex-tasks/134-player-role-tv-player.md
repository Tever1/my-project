# TASK-134: Player.role — поле 'tv' | 'player' на сервере и клиенте

> **Метаданные**
> - **Дата создания:** 2026-05-24
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~20 минут
> - **Зависит от тасков:** 132, 132.1, 132.2
> - **Часть пивота:** TV-mode (132…136), шаг 3/5.

---

## Цель

Добавить в серверный `Player` поле `role: 'tv' | 'player'`.  
- `'tv'` — десктопный экран, участвует в комнате как TV-экран, **не считается игроком**.
- `'player'` — мобильный участник игры.

Это фундамент: 135 (mobile join-only) и 136 (game start) опираются на это поле.

---

## Контекст

Текущее состояние сервера (`src/server/socket-handlers.mts`):
- `Player` — нет поля `role`. Все участники равноправны.
- `Room` — уже есть `tvSocketId: string | null` (для TV-страницы `/tv/[roomId]/game`).
  Это отдельная концепция (чистый зритель). `role: 'tv'` — другое: лобби-десктоп
  тоже является "TV-экраном комнаты", но join'ится через обычный `room:create`/`room:join`.
- `room:create` — создаёт комнату, создатель становится `isHost: true`.
- `room:join` — присоединяет игрока.
- `broadcastRoomState` — рассылает всех игроков клиентам.

Клиент (`src/components/lobby/Lobby.tsx`):
- При создании комнаты вызывает `room:create` — сейчас без `role`.
- Список игроков (`connectedPlayers`) показывает всех из `room.players`.
- Уже импортирует `usePlayMode` — нет, его там нет. Нужно добавить.

---

## Файлы к изменению (whitelist)

- `src/server/socket-handlers.mts` — добавить `role` в `Player`, принять из `room:create` и `room:join`.
- `src/components/lobby/Lobby.tsx` — передавать `role` при `room:create`/`room:join`, фильтровать TV из списка игроков.

### НЕ ТРОГАТЬ

- `src/types/game.ts`
- `src/components/Splash.tsx`, `src/components/ModeGate.tsx`
- `src/lib/use-play-mode.ts`, `src/lib/use-is-mobile.ts`
- `src/app/tv/**` — TV-страницы игр не трогаем
- Игровые страницы (`src/app/game/**`), `server.mts`
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`

---

## Шаги реализации

### 1. Сервер: добавить `role` в `Player`

```ts
// src/server/socket-handlers.mts
interface Player {
  id: string;
  socketId: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway: boolean;
  role: 'tv' | 'player';   // <-- добавить
  team?: string;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}
```

### 2. Сервер: `room:create` принимает `role`

```ts
socket.on('room:create', (
  data: { playerId: string; nickname: string; role?: 'tv' | 'player' },
  callback
) => {
  // ...
  const player: Player = {
    id: data.playerId,
    socketId: socket.id,
    nickname: data.nickname,
    isHost: true,
    isConnected: true,
    isAway: false,
    role: data.role ?? 'player',   // <-- использовать переданную роль
  };
  // остальной код без изменений
```

### 3. Сервер: `room:join` принимает `role`

```ts
socket.on('room:join', (
  data: {
    code: string;
    playerId: string;
    nickname: string;
    isReconnect?: boolean;
    role?: 'tv' | 'player';   // <-- добавить в тип
  },
  callback
) => {
  // ...
  // В ветке создания нового игрока (else-ветка):
  const player: Player = {
    id: data.playerId,
    socketId: socket.id,
    nickname: data.nickname,
    isHost: false,
    isConnected: true,
    isAway: false,
    role: data.role ?? 'player',   // <-- добавить
  };
```

**Важно:** при reconnect (existingPlayer существует) — **не менять** `role`.
Роль присваивается один раз при первом join'е.

### 4. Сервер: `broadcastRoomState` — добавить `tvConnected`

`broadcastRoomState` уже рассылает `players` (с `role` внутри после наших изменений).
Дополнительно добавить удобный флаг в state:

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
    tvConnected: players.some(p => p.role === 'tv' && p.isConnected),   // <-- добавить
  };
  io.to(`room:${room.code}`).emit('room:state', state);
}
```

### 5. Клиент: `Lobby.tsx` — читать `mode`, передавать `role`

В начале функции `Lobby` (или рядом с существующими hooks) добавить:

```ts
import { usePlayMode } from "@/lib/use-play-mode";

// внутри компонента:
const { mode } = usePlayMode();
const myRole: 'tv' | 'player' = mode === 'desktop' ? 'tv' : 'player';
```

При `room:create` передавать `role`:
```ts
// найти emit room:create и добавить role в data:
socket.emit('room:create', { playerId, nickname, role: myRole }, (res) => { ... });
```

При `room:join` передавать `role`:
```ts
// найти emit room:join и добавить role в data:
socket.emit('room:join', { code, playerId, nickname, isReconnect, role: myRole }, (res) => { ... });
```

### 6. Клиент: `Lobby.tsx` — фильтровать TV из видимого списка игроков

Найти место где строится список видимых игроков (`connectedPlayers` или аналог).
Добавить фильтр:

```ts
// Только role==='player' показываем в списке игроков комнаты.
// TV-экран — не игрок, он не должен отображаться в списке участников.
const visiblePlayers = roomState.players.filter(p => p.role !== 'tv');
```

Использовать `visiblePlayers` везде где сейчас используется `roomState.players`
для **отображения** (аватары в room-popup, счётчик игроков, список участников).
Игровую логику (hostId, startGame и т.п.) — не трогать, там нужны все игроки.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` чисто
- [ ] `interface Player` в `socket-handlers.mts` имеет `role: 'tv' | 'player'`
- [ ] `room:create` и `room:join` принимают опциональный `role` в payload
- [ ] `room:state` broadcast включает `tvConnected: boolean` и `role` в каждом player
- [ ] Десктоп создаёт комнату с `role: 'tv'` — его нет в списке игроков в popup'е
- [ ] Мобильный join'ится с `role: 'player'` — виден в списке игроков
- [ ] Существующая игровая логика (start game, hostId, reconnect) — не сломана
- [ ] `role` при reconnect не сбрасывается

---

## Ограничения и подводные камни

- **Не ломать reconnect.** В ветке `existingPlayer` в `room:join` `role` уже
  задан — не перезаписывать из новых данных.
- **`room:create` — только `role`, не `isHost`.** `isHost` по-прежнему
  определяется сервером (кто создал комнату).
- **Обратная совместимость.** Старые клиенты без `role` в payload → `??'player'`
  fallback. Не делать `role` обязательным полем.
- **`tvSocketId` в Room — не трогать.** Это другой механизм (для `/tv/[roomId]/game`
  страницы). Наш `role: 'tv'` — про десктопный лобби-экран, который join'ится
  через `room:join`, а не `tv:join`.
- **Фильтровать только для UI** — для логики (game:start, hostId) фильтр не нужен.
- **`usePlayMode` в Lobby.tsx** — добавить импорт. Hook уже существует
  в `src/lib/use-play-mode.ts`, экспортирует `{ mode, setMode, reset }`.
  `mode` может быть `null` (до splash) — в этом случае считай `'player'`.

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только `src/server/socket-handlers.mts`
   и `src/components/lobby/Lobby.tsx`.
2. `npm run lint` зелёный.
3. `npx tsc --noEmit` чисто.
4. Поискать `room:create` и `room:join` в `Lobby.tsx` — в обоих emit'ах
   должен быть `role: myRole`.
5. Убедиться что `existingPlayer` ветка в `room:join` на сервере
   не перезаписывает `role`.
6. Заполнить отчёт `codex-reports/134-player-role-tv-player.md`.
7. **Не коммитить.**

---

## Открытые вопросы для Codex

- Нет.
