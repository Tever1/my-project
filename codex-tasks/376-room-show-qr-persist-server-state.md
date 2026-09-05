# TASK-376: `room:show-qr` — сохранить состояние на сервере, инициализировать по нему всех клиентов

## Контекст

TASK-375 провёл явный `show: boolean` через событие `room:show-qr`, но это
состояние **чисто эфемерное** — сервер только ретранслирует событие
подписчикам комнаты в момент клика, ничего не сохраняя в объекте `Room`.
Локальные React-state (`qrShown` в `/join/[code]/page.tsx`, `isWaitingForPlayers`
в `Lobby.tsx`, `showQrOverlay` в TV-роуте) все инициализируются `useState(false)`.

**Проблема:** если клиент подключается/переподключается/обновляет страницу
ПОСЛЕ того как QR уже был показан (например, второй телефон открывает
`/join/[code]` пока QR уже висит на TV, или TV перезагрузил страницу), этот
клиент не узнает о текущем реальном состоянии — увидит дефолтное `false`
(«Добавить игрока» вместо «Вернуться в лобби», или QR не покажется на TV,
хотя должен).

**Требуемое поведение (формулировка пользователя):** если на игровом поле
(TV) НЕ показывается QR-код подключения — на мобильном экране (`/join/[code]`)
должна быть активна кнопка «+ Добавить игрока»; если на TV QR-код
ПОКАЗЫВАЕТСЯ — на мобильном должна быть активна кнопка «Вернуться в лобби».
Это должно быть верно не только для live-события, но и при (пере)подключении.

## Что сделать

Добавить `showQrCode: boolean` в объект `Room` на сервере (persist), обновлять
его в хендлере `room:show-qr`, включить в оба места, где строится snapshot
комнаты (`broadcastRoomState()` и хендлер `room:get-state`), и на клиентах
инициализировать локальный `qrShown`/`isWaitingForPlayers`/`showQrOverlay`
из этого поля при получении `room:state`, а не только через listener
`room:show-qr` (тот остаётся для live-обновлений, ничего не убирать).

### 1. `src/server/socket-handlers.mts`

- В `interface Room` (~строка 16-36) добавить поле:
  ```ts
  showQrCode: boolean;
  ```
- В месте создания комнаты (~строка 225, рядом с `kickedPlayerIds: new Set<string>()`)
  добавить:
  ```ts
  showQrCode: false,
  ```
- В `broadcastRoomState()` (~строка 75-98), в объекте `state`, добавить:
  ```ts
  showQrCode: room.showQrCode,
  ```
- В хендлере `room:get-state` (~строка 337-365), в объекте `state`, добавить
  то же самое:
  ```ts
  showQrCode: room.showQrCode,
  ```
- В хендлере `room:show-qr` (~строка 495-499) — сохранять значение перед
  ретрансляцией:
  ```ts
  socket.on('room:show-qr', (data: { code: string; show?: boolean }) => {
    const room = getRoomByCode(data.code);
    if (!room) return;
    room.showQrCode = data.show !== false;
    io.to(`room:${room.code}`).emit('room:show-qr', { show: room.showQrCode });
  });
  ```

### 2. `src/components/lobby/Lobby.tsx`

Там, где обрабатывается входящий `room:state` (`on('room:state', ...)`) —
найти этот handler и добавить синхронизацию `isWaitingForPlayers` из
`payload.showQrCode`, ТОЛЬКО когда роль клиента — TV (это состояние
относится к TV-виду до старта игры). Не убирать существующий listener
`room:show-qr` (~строка 547) — он остаётся для live-обновлений между уже
подключёнными клиентами. Добавляется только доп. инициализация из
`room:state`, чтобы TV, подключившийся/перезагрузившийся ПОСЛЕ того как QR
уже был показан, сразу видел правильное состояние.

Если в текущем коде `room:state`-обработчик уже парсит нужные поля в типизированный
объект — добавь `showQrCode?: boolean` в этот тип и синхронизируй
`isWaitingForPlayers` через `useEffect` на изменение этого поля (по аналогии
с тем, как остальные поля `roomState` синхронизируются). Не трогай логику,
не относящуюся к QR.

### 3. `src/app/tv/[roomId]/[gameType]/page.tsx`

Аналогично — найти обработку входящего `room:state`, добавить `showQrCode`
в парсинг payload'а, и синхронизировать `showQrOverlay` из этого поля (через
`useEffect`), не убирая существующий listener `room:show-qr` (~строка 460)
для live-обновлений.

### 4. `src/app/join/[code]/page.tsx`

В `JoinRoomState` (~строка 18-23) добавить поле:
```ts
showQrCode: boolean;
```
В обработчике `on("room:state", ...)` (~строка 100-110) — распарсить это поле
из payload:
```ts
showQrCode: typeof payload.showQrCode === "boolean" ? payload.showQrCode : false,
```
И синхронизировать `qrShown` из `roomState.showQrCode` через `useEffect`
(добавь новый эффект, не трогая существующий listener `room:show-qr`
~строка 119-124, который остаётся для live-обновлений):
```ts
useEffect(() => {
  if (roomState) setQrShown(roomState.showQrCode);
}, [roomState?.showQrCode]);
```
(поправь синтаксис под существующий стиль файла, если используется другой
паттерн для похожих полей).

## Whitelist файлов

- `src/server/socket-handlers.mts`
- `src/components/lobby/Lobby.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/app/join/[code]/page.tsx`

Больше никаких файлов не трогать. Не убирать существующие listener'ы
`room:show-qr` — только добавить инициализацию из `room:state`/`room:get-state`.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- Сценарий: телефон A на `/join/[code]` жмёт «+ Добавить игрока» → на TV
  (что в Lobby.tsx до старта игры, что в `/tv/.../page.tsx` во время игры)
  появляется QR. Телефон B открывает `/join/[code]` (или обновляет страницу)
  ПОКА QR уже показан → сразу видит кнопку «Вернуться в лобби», а не
  «+ Добавить игрока».
- Обратный сценарий: QR закрыт (никто не жал «Добавить игрока», либо кто-то
  явно закрыл) → любой телефон, открывающий/обновляющий `/join/[code]`,
  видит «+ Добавить игрока».
- TV, обновивший страницу пока QR уже показан кем-то другим, сразу
  отображает QR-оверлей (не ждёт следующего live-события).

## Отчёт

Записать в `codex-reports/376-room-show-qr-persist-server-state.md`:
что изменено по каждому файлу, diff по строкам, результат tsc/lint.
