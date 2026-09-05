# TASK-020: Socket.io flow в /lobby-preview

> **Сложность:** complex
> **Запуск:** manual by user (Codex Desktop)

## Цель

Подключить кнопки «Создать комнату», «Присоединиться» (icon submit) и
«Начать партию» в `/lobby-preview` к реальным socket-событиям.

## Файлы (whitelist)

- `src/app/lobby-preview/page.tsx` — клиентская логика
- `src/server/socket-handlers.mts` — только если нужен новый event для presence
- (опционально) `src/lib/auth-context.tsx` — чтение playerId/nickname

**НЕ ТРОГАТЬ:** `server.mts`, существующие хэндлеры `room:create` /
`room:join` / `tv:join` — они работают.

## Что делать

1. **«Создать комнату»** (`RoomButton`):
   - `useSocket()` + `useAuth()` (playerId, nickname).
   - `onCreate` теперь: `socket.emit('room:create', {playerId, nickname}, (res) => { if (res.success) setRoomCode(res.code); })`.
   - Сейчас RoomButton показывает code когда установлен — оставить.

2. **«Присоединиться»** (icon button `data-lobby-cta="join-submit"`):
   - `onClick`: `socket.emit('room:join', {code: joinCode, playerId, nickname}, (res) => { if (res.success) router.push(\`/lobby/${res.roomId}\`); else setJoinError(res.error); })`.
   - При ошибке показать toast (sonner) или inline message.

3. **«Начать партию»** (start CTA):
   - Если roomCode уже есть (хост создал комнату) → navigate
     `/lobby/[roomId]` с заранее выбранным `activeGame` через query
     param `?game=<id>`.
   - Если roomCode нет — сначала создать комнату (re-use логику п.1),
     потом navigate.

4. **«Друзей онлайн» counter** (FriendsOnlinePill):
   - Простая реализация: общее количество подключённых сокетов в io.
   - Добавить в server-handlers новый event `presence:subscribe`:
     при connect эмитить `presence:count` с `io.engine.clientsCount`,
     подписать клиента на updates на connect/disconnect.
   - Клиент в LobbyPreview подписывается, обновляет state.

## Acceptance

- [ ] Клик «Создать комнату» → реальный код с сервера, RoomButton
      показывает `КОМНАТА · ABC123`.
- [ ] Ввод 6-char кода + клик icon submit → переход на `/lobby/[roomId]`
      ИЛИ inline error «Room not found».
- [ ] Клик «Начать партию» → переход на `/lobby/[roomId]?game=<active>`.
- [ ] FriendsOnlinePill показывает реальное число (можно проверить
      открытием второй вкладки).
- [ ] `npm run lint` без новых ошибок, `npm run build` ОК.

## Не делать в этом таске

- НЕ переносить дизайн в production `/lobby/[roomId]/page.tsx` — это
  отдельный таск (Phase D pt 3).
- НЕ менять существующие game/socket events.

## Контрольные точки

1. Не коммитить.
2. Заполнить отчёт `codex-reports/020-lobby-preview-socket-flow.md`.
