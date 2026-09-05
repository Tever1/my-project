# TASK-204 — TV-лобби: разгейтить выбор игры (баг «Ожидание хоста» после игры)

## Контекст / баг

После завершения игры (квиз) и возврата на экран лобби (десктоп/TV) кнопка
выбора игры дизейблится и показывает **«Ожидание хоста»** — выбрать новую игру
нельзя.

**Корень:** экран лобби на десктопе — это `myRole === "tv"`. По новой ролевой
модели (TASK-202) TV **никогда не хост** (`roomState.hostId` = телефон-игрок,
а не `user.id` TV). Поэтому:

```ts
// Lobby.tsx:644
const isCurrentUserHost =
  !roomCode ||
  roomState?.hostId === user?.id ||
  (!isRoomRoute && roomState == null);
```

…для TV становится `false`, как только телефон стал хостом. Первая игра проходит
только потому, что `!roomCode` ещё `true` (комната не создана). После `game:end`
сервер сохраняет `hostId`/`gameHostPlayerId` (правильно), `roomCode` остаётся →
`isCurrentUserHost === false` → кнопка дизейблится.

**Кнопка `HeroLeft` рендерится ТОЛЬКО для TV** (`Lobby.tsx:1083-1095`), а ей
прокидывается `isCurrentUserHost` — это и есть ошибочный гейт.

## Целевое поведение (подтверждено пользователем)

Двухшаговый флоу остаётся как есть:
- **TV выбирает игру** на лобби → `game:select` (этот путь и нужно разгейтить).
- **Телефон-хост запускает** → `game:start` (`/join`, не трогаем).

TV должен **всегда** мочь выбрать игру. «Ожидание хоста» для TV не показывать.

## Что сделать

Файл: `src/components/lobby/Lobby.tsx`. **Минимальная правка, 3 точки:**

1. **Сразу после определения `isCurrentUserHost`** (после строки ~647, перед
   `const gameHostPlayerId = ...`) добавить производный флаг:

   ```ts
   // TV/creator screen always controls game selection; the phone host only
   // launches (game:start). Without this, isCurrentUserHost is false on the TV
   // once a phone becomes host, disabling the "select game" button after a game ends.
   const canSelectGame = myRole === "tv" || isCurrentUserHost;
   ```

2. **В `handleStartGame`** (строка ~657) заменить гейт:

   ```ts
   // было:
   if (!isCurrentUserHost) return;
   // стало:
   if (!canSelectGame) return;
   ```

   (Не забудь обновить массив зависимостей `useCallback`: `isCurrentUserHost`
   → `canSelectGame`, строка ~668.)

3. **В рендере `HeroLeft`** (строка ~1092) передавать `canSelectGame` вместо
   `isCurrentUserHost`:

   ```ts
   // было:
   isCurrentUserHost={isCurrentUserHost}
   // стало:
   isCurrentUserHost={canSelectGame}
   ```

   Имя пропа в `HeroLeft` оставить как есть (`isCurrentUserHost`) — семантически
   он теперь «можно выбрать игру». Переименование пропа НЕ делать (лишний шум в
   диффе).

## Чего НЕ трогать

- `isCurrentUserHost` сам по себе — он используется и в других местах
  (`canAddPlayer`, createRoom-логика и т.п.). НЕ менять его определение.
- Серверный код (`socket-handlers.mts`), `/join`, `/tv`, quiz-страницы.
- Логику `game:start` (запуск с телефона).
- Прочие гейты по `isCurrentUserHost`.

## Whitelist файлов (трогать ТОЛЬКО эти)

- `src/components/lobby/Lobby.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
любые другие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика: на TV-лобби кнопка «Выбрать квиз»/«Начать партию» активна всегда
  (для `myRole === "tv"`), независимо от того, есть ли телефон-хост. Текст
  «Ожидание хоста» на TV больше не появляется.

## Отчёт

`codex-reports/204-tv-lobby-game-select-ungate.md`. Не коммить.
