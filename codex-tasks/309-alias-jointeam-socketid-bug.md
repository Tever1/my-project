# TASK-309 — Alias classic: вступление в команду кладёт socket-id вместо playerId

## Контекст / корень бага
В classic teamSelect чипы команды показывают сырые строки вида
`Slhc1WiCAc0Hm01NAAAM` (это socket.io socket-id), а не ники игроков.

Причина: когда НЕ-host вступает в команду, клиент шлёт
`broadcast('alias:join-team', { teamIndex: ti })` (без id игрока). Host-обработчик
берёт отправителя из `from` и вызывает `handleJoinTeam(from, teamIndex)`. Но сервер
проставляет `from: socket.id` (см. `src/server/socket-handlers.mts:426`) — это
socket-id, а НЕ playerId. В `team.playerIds` попадает socket-id, а рендер ищет
`players.find((pl) => pl.id === id)` по playerId → не находит → фолбэк `?? id`
показывает socket-id.

(`handleJoinTeam(myId, …)` для host и `handleRandomizeTeams` через `players.map(p=>p.id)`
работают корректно — там реальные playerId. Ломается только ручное вступление
не-host через broadcast.)

## Whitelist файлов
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/309-alias-jointeam-socketid-bug.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, server.mts,
socket-handlers.mts, другие файлы.

## Изменения

### 1. Не-host: передавать свой playerId в payload
В onClick карточки команды (ветка `else`, ~стр.710):
- было: `broadcast('alias:join-team', { teamIndex: ti });`
- стало: `broadcast('alias:join-team', { teamIndex: ti, playerId: myId });`

### 2. Host-обработчик: использовать playerId из payload, а не socket-id `from`
В `on('game:action', …)` host-ветке (~стр.536-539):
- было:
  ```
  if (action === 'alias:join-team') {
    const teamIndex = payload.teamIndex as number;
    handleJoinTeam(from, teamIndex);
  }
  ```
- стало:
  ```
  if (action === 'alias:join-team') {
    const teamIndex = payload.teamIndex as number;
    const joiningPlayerId = (payload.playerId as string) ?? from;
    handleJoinTeam(joiningPlayerId, teamIndex);
  }
  ```
  (Фолбэк на `from` оставить на всякий случай; основной путь — `payload.playerId`.)

## Чего НЕ делать
- НЕ менять игровую логику команд/очков, фазы, прочие действия.
- НЕ трогать host-путь `handleJoinTeam(myId, ti)` (он уже верный).
- НЕ трогать сервер.

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- В classic teamSelect: при вступлении не-host игрока в команду чип показывает
  его НИК, а не socket-id.
- diff — ровно 2 правки в пределах whitelist.

## Отчёт
`codex-reports/309-alias-jointeam-socketid-bug.md`.
