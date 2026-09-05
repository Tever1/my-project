# TASK-180: Передача роли хоста — не предлагать хосту, перемещать правильный бейдж

## Контекст
Бейдж «хост» в RoomMenu показывается у игрока с `gameHostPlayerId` (ведущий — первый
зашедший телефонный игрок). Но действие «Передать роль хоста» (`room:transfer-host`)
меняет `room.hostId` (владелец комнаты, обычно TV-создатель), а НЕ `gameHostPlayerId`.
Из-за этого:
- бейдж не перемещается при передаче;
- опция «Передать роль хоста» показывается даже на игроке, который УЖЕ хост (бессмыслица).

## Whitelist файлов
- `src/server/socket-handlers.mts`
- `src/components/lobby/Lobby.tsx`

---

## Fix 1: Сервер — передавать gameHostPlayerId (ведущего), не hostId

### Файл `src/server/socket-handlers.mts`, обработчик `room:transfer-host` (строки ~330-340)
```ts
// Было:
socket.on('room:transfer-host', (data: { code: string; newHostId: string }) => {
  const room = getRoomByCode(data.code);
  if (!room) return;
  const currentHost = room.players.get(room.hostId);
  const newHost = room.players.get(data.newHostId);
  if (!currentHost || !newHost) return;
  currentHost.isHost = false;
  newHost.isHost = true;
  room.hostId = data.newHostId;
  broadcastRoomState(io, room);
});
// Стало (передаём роль ВЕДУЩЕГО = gameHostPlayerId; владелец комнаты hostId не меняется):
socket.on('room:transfer-host', (data: { code: string; newHostId: string }) => {
  const room = getRoomByCode(data.code);
  if (!room) return;
  const newHost = room.players.get(data.newHostId);
  if (!newHost) return;
  room.gameHostPlayerId = data.newHostId;
  broadcastRoomState(io, room);
});
```
Теперь после передачи бейдж «хост» (gameHostPlayerId) корректно переезжает на нового игрока.

---

## Fix 2: Клиент — не показывать «Передать роль хоста» на текущем хосте

### Файл `src/components/lobby/Lobby.tsx`, меню действий игрока (строки ~2736-2744)
`isHost` (player.id === gameHostPlayerId) уже доступен в этом scope (объявлен на строке ~2658).
Обернуть кнопку «Передать роль хоста» условием `!isHost`:
```tsx
// Было:
<RoomMenuActionButton
  icon={<HostCrownIcon />}
  label="Передать роль хоста"
  hoverColor={accent}
  onClick={() => {
    onTransferHost(player.id);
    setSelectedPlayerId(null);
  }}
/>
// Стало:
{!isHost && (
  <RoomMenuActionButton
    icon={<HostCrownIcon />}
    label="Передать роль хоста"
    hoverColor={accent}
    onClick={() => {
      onTransferHost(player.id);
      setSelectedPlayerId(null);
    }}
  />
)}
```
(«Удалить из комнаты» оставить как есть — её можно применять к любому игроку.)

---

## Acceptance criteria
- [ ] На игроке с бейджем «хост» в меню НЕТ опции «Передать роль хоста» (есть только «Удалить из комнаты»)
- [ ] При передаче роли другому игроку бейдж «хост» переезжает на него (gameHostPlayerId обновляется)
- [ ] Владелец комнаты (hostId, TV-создатель) при передаче роли ведущего не меняется
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- Другие игры, логику kick
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/180-host-transfer-fix.md`
