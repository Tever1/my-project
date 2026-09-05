# TASK-209 — Сброс выбранной игры при возврате в лобби («← Назад к лобби»)

## Контекст / баг (от пользователя)

На телефоне кнопка «НАЧАТЬ ИГРУ» появляется только когда игра выбрана
(`roomState.currentGame != null`) — это правильно (TASK-207). НО: если на ТВ
выбрать игру (квиз), а затем нажать «← Назад к лобби» — кнопка «НАЧАТЬ ИГРУ»
на телефоне **остаётся**, хотя игра уже не выбрана.

**Корень:** «← Назад к лобби» (`handleCancelWaiting`,
`src/components/lobby/Lobby.tsx` около строки 699) делает только
`setIsWaitingForPlayers(false)` — на сервере `room.currentGame` остаётся
выставленным с момента `game:select`. Телефон видит `currentGame` и держит
кнопку. Сбрасывается `currentGame` сейчас только в `game:end` (после окончания
игры), а при возврате в лобби из QR-экрана — нет.

## Требование

При возврате в лобби (отмена ожидания) выбранная игра должна сбрасываться:
`room.currentGame = null`, `room.pendingQuizConfig = null`, и состояние
рассылается всем — тогда кнопка «НАЧАТЬ ИГРУ» на телефоне пропадает.

## Что сделать

### 1. Сервер — новый хендлер `game:deselect`

Файл: `src/server/socket-handlers.mts`. Рядом с хендлером `game:select`
(около строк 343-357) добавить новый хендлер:

```ts
// Deselect game (TV returns to lobby before starting)
socket.on('game:deselect', (data: { code: string }) => {
  const room = getRoomByCode(data.code);
  if (!room) return;
  // Only meaningful in lobby; never wipe an in-progress game.
  if (room.status !== 'lobby') return;
  room.currentGame = null;
  room.pendingQuizConfig = null;
  broadcastRoomState(io, room);
});
```

Проверь имя поля статуса лобби: в `game:end` используется `room.status = 'lobby'`,
значит lobby-статус — строка `'lobby'`. Если в коде иначе — используй то же
значение, что в `game:end`.

### 2. Клиент — вызвать сброс из `handleCancelWaiting`

Файл: `src/components/lobby/Lobby.tsx`. В `handleCancelWaiting`
(около строки 699) дополнительно эмитить `game:deselect`:

```ts
const handleCancelWaiting = useCallback(() => {
  if (roomCode) {
    emit('game:deselect', { code: roomCode });
  }
  setIsWaitingForPlayers(false);
}, [emit, roomCode]);
```

(добавить `emit` и `roomCode` в deps).

## Чего НЕ трогать

- `game:select`, `game:start`, `game:end` — не менять (только использовать как
  образец).
- Логику ожидания/QR, `pendingQuizConfig` на клиенте, навигацию.
- `/join`, `/tv`, игровые страницы.

## Whitelist файлов (трогать ТОЛЬКО эти два)

- `src/server/socket-handlers.mts`
- `src/components/lobby/Lobby.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика: ТВ выбрал игру → телефон видит «НАЧАТЬ ИГРУ»; ТВ нажал «← Назад к
  лобби» → `game:deselect` → `currentGame=null` → кнопка на телефоне пропала,
  показана подсказка «Выберите игру на большом экране…». Сброс не срабатывает
  во время идущей игры (`status !== 'lobby'`).

## Отчёт

`codex-reports/209-deselect-game-on-back-to-lobby.md`. Не коммить.
