# TASK-154: «Добавить игрока» в меню комнаты — переключает TV на экран QR

> **Метаданные**
> - **Дата создания:** 2026-05-26
> - **Сложность:** simple
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~7 минут
> - **Зависит от тасков:** TASK-151, TASK-153

---

## Цель

Кнопка «+ Добавить игрока» в RoomMenu доступна и для **game-host (первого телефона)**, не только для десктопа-создателя. По нажатию кнопки **TV (десктоп)** переключается на экран QR-кода для подключения новых игроков. Телефоны остаются в waiting-экране без изменений.

---

## Контекст

Сейчас в `src/components/lobby/Lobby.tsx`:
- `RoomMenu` рендерит кнопку «+ Добавить игрока» (line ~2638) только если `isCurrentUserHost`.
- `isCurrentUserHost = roomState?.hostId === user?.id` — у десктопа true, у телефонов false.
- `handleAddPlayer` (line 466) делает локальный `setIsWaitingForPlayers(true)` — работает только когда нажимает сам десктоп.

В TV-pivot архитектуре `gameHostPlayerId` (первый телефон) — это «капитан» игры. Логично разрешить ему приглашать новых игроков. При этом QR-экран должен появиться на TV (десктопе), а не на телефоне.

Решение через socket-broadcast: телефон emit'ит новый event `room:show-qr`, сервер ретранслирует всем в комнате, десктоп ловит и ставит `isWaitingForPlayers=true`.

---

## Файлы к изменению (whitelist)

- `src/server/socket-handlers.mts` — добавить handler `room:show-qr` который broadcast'ит событие всем в комнате.
- `src/components/lobby/Lobby.tsx`:
  - Добавить listener `room:show-qr` который на десктопе (`myRole==='tv'`) делает `setIsWaitingForPlayers(true)`.
  - Унифицировать `handleAddPlayer`: emit `room:show-qr` (для всех ролей), плюс на десктопе доп. локальная логика выбора игры.
  - Прокинуть `canAddPlayer` флаг в RoomMenu (= `isCurrentUserHost || isGameHostPhone`).
- НИКАКИХ других файлов.

### НЕ ТРОГАТЬ

- TV game-страницы (`src/app/tv/...`) — TV-в-игре не должен слушать `room:show-qr`, это только для desktop lobby.
- Серверная логика комнат (room:create/join/leave) — не трогать.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

### Шаг 1: `src/server/socket-handlers.mts`

Добавить новый handler рядом с другими room-events (например, после `room:transfer-host`):

```ts
// Show QR (game-host or host requests new players)
socket.on('room:show-qr', (data: { code: string }) => {
  const room = getRoomByCode(data.code);
  if (!room) return;
  io.to(`room:${room.code}`).emit('room:show-qr');
});
```

Никаких изменений в типах `Room`/`Player`, никакого состояния на сервере — просто прокидывает event.

### Шаг 2: `src/components/lobby/Lobby.tsx`

#### 2a. Добавить listener `room:show-qr`

Рядом с другими socket listeners (например, после `on('game:started', ...)` listener'а), добавить:

```ts
useEffect(() => {
  return on('room:show-qr', () => {
    if (myRole !== 'tv') return; // только TV открывает QR-экран
    setIsWaitingForPlayers(true);
  });
}, [myRole, on]);
```

#### 2b. Обновить `handleAddPlayer`

Текущая реализация:
```ts
const handleAddPlayer = useCallback(() => {
  if (!roomCode) return;
  if (!roomState?.currentGame) {
    emit('game:select', { code: roomCode, gameType: activeGame });
  }
  setIsWaitingForPlayers(true);
}, [activeGame, emit, roomCode, roomState?.currentGame]);
```

Новая:
```ts
const handleAddPlayer = useCallback(() => {
  if (!roomCode) return;
  // Desktop: also seed currentGame if missing (so QR screen has game context).
  if (myRole === 'tv' && !roomState?.currentGame) {
    emit('game:select', { code: roomCode, gameType: activeGame });
  }
  // Broadcast — desktop's listener will flip isWaitingForPlayers=true.
  // Phone presses → desktop sees the broadcast and shows QR.
  emit('room:show-qr', { code: roomCode });
}, [activeGame, emit, myRole, roomCode, roomState?.currentGame]);
```

Заметка: десктоп тоже шлёт `room:show-qr` сам себе (через сервер) — listener обработает через 1 round-trip. Альтернативно можно оставить `setIsWaitingForPlayers(true)` оптимистично для десктопа, но через сокет проще и единообразно.

#### 2c. Прокинуть `canAddPlayer` флаг в RoomMenu

Сейчас в RoomMenu кнопка отрисовывается под `isCurrentUserHost` (это пропс компонента — посмотри, как он передаётся, на line ~870-940 и 2290-2310).

Найти place в коде где RoomMenu рендерится с пропсами (около line 870 и 924) и где компонент принимает пропсы (около line 2297-2310).

1. Вычислить новый флаг в Lobby:
   ```ts
   const isGameHostPhone = Boolean(
     user?.id && roomState?.gameHostPlayerId && user.id === roomState.gameHostPlayerId
   );
   const canAddPlayer = isCurrentUserHost || isGameHostPhone;
   ```

2. Передать `canAddPlayer` в RoomMenu вместо `isCurrentUserHost` для определения видимости кнопки. Тут есть варианты:
   - Если у RoomMenu уже есть `currentUserId`, добавить новый пропс `canAddPlayer: boolean`.
   - В RoomMenu компоненте (около line 2638) заменить условие `{isCurrentUserHost && (...кнопка...)}` на `{canAddPlayer && (...кнопка...)}`.
   - Само вычисление `isCurrentUserHost` в RoomMenu (если оно там делается) оставить как есть — для других целей (kick, transfer-host) оно ещё может использоваться. Но если оно нигде больше не нужно — заменить.

   Проверь grep внутри функции `RoomMenu` (около line 2297-2664) на использования `isCurrentUserHost` — если только для кнопки «Добавить игрока», просто переименуй пропс. Если для других целей (kick/transfer), сохрани оба пропса.

#### 2d. **Не** трогать guest fallback

Не нужно использовать `guestPlayerId` в Lobby — лобби требует `user` (см. существующую гарду в Lobby), и `isGameHostPhone` будет true только для залогиненных пользователей. Гость не может быть game-host если не имеет user.id, но это edge case, который не блокирует фичу. Если в TV-pivot game-host оказался гостем — кнопка просто не появится у него. Ограничение приемлемое.

### Шаг 3: проверки

- `npm run lint` без новых ошибок.
- `npx tsc --noEmit` успешен.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` успешен
- [ ] На сервере есть handler `room:show-qr` который broadcast'ит событие
- [ ] В RoomMenu кнопка «+ Добавить игрока» видна game-host телефону (через `canAddPlayer = isCurrentUserHost || isGameHostPhone`)
- [ ] По нажатию кнопки на телефоне — десктоп (TV) переключается на QR-экран
- [ ] По нажатию кнопки на десктопе — поведение прежнее (плюс broadcast, который десктоп получает обратно через сервер — это OK, listener идемпотентен)
- [ ] Никаких изменений вне whitelist

---

## Открытые вопросы

Если в RoomMenu обнаружится, что `isCurrentUserHost` используется для нескольких разных гейтов (kick / transfer-host / add-player), не объединяй их в один `canAddPlayer`. Создай отдельный пропс или вычислитель.

---

## Отчёт

Codex пишет отчёт в `codex-reports/154-add-player-from-room-menu-shows-qr-on-tv.md`:
- diff-сводка
- результаты lint/tsc
- описание flow тестирования (как воспроизвести с телефона)
