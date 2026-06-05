# TASK-213 — Кнопка «Добавить игрока» в меню комнаты, когда игроков нет

## Контекст / баг (от пользователя)

Когда все игроки вышли и в лобби открываешь выпадающее меню комнаты (пустая
комната), там должна быть кнопка «+ Добавить игрока». Сейчас её нет.

## Корень

Файл: `src/components/lobby/Lobby.tsx`.
- Кнопка в `RoomMenu` гейтится `canAddPlayer` (около строки 2751:
  `{canAddPlayer && (...)}`).
- `canAddPlayer = isCurrentUserHost || isGameHostPhone` (строка 658).
- Когда все игроки вышли: `gameHostPlayerId` сброшен (`reassignHostOnLeave` →
  `null`), значит `isGameHostPhone = false`; `roomState.hostId` стал `''`,
  значит `isCurrentUserHost = false`. Итог — `canAddPlayer = false`, кнопка
  скрыта, хотя именно ТВ/создатель должен иметь возможность позвать игроков.

Сравни с `canSelectGame = myRole === "tv" || isCurrentUserHost` (строка 651) —
для TV там уже сделано исключение по той же причине.

## Что сделать

Файл: `src/components/lobby/Lobby.tsx`. Менять ТОЛЬКО его.

Строка 658 — добавить TV в предикат:
```ts
const canAddPlayer = myRole === "tv" || isCurrentUserHost || isGameHostPhone;
```

Этого достаточно: ТВ/десктоп-создатель всегда может добавить игрока (показать
QR), в т.ч. в пустой комнате. `handleAddPlayer` уже корректно обрабатывает
случай TV без выбранной игры (эмитит `game:select` при необходимости +
`room:show-qr`).

## Чего НЕ трогать

- `isCurrentUserHost`, `isGameHostPhone`, `canSelectGame`, `handleAddPlayer` —
  не менять (только `canAddPlayer`).
- Серверный код, `/join`, `/tv`, игровые страницы.
- Логику RoomMenu кроме гейта кнопки (он уже на `canAddPlayer`).

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/components/lobby/Lobby.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика: на ТВ/десктопе кнопка «+ Добавить игрока» в меню комнаты видна всегда
  (включая пустую комнату без игроков и без хоста).

## Отчёт

`codex-reports/213-room-menu-add-player-empty-room.md`. Не коммить.
