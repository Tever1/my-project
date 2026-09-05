# TASK-142: Игра не запускается после нажатия "Начать партию"

## Проблема

`handleStartGame` в `Lobby.tsx` эмитит только `game:select` (сохраняет выбор игры).
Реальный старт (`game:start`) умеет эмитить только страница `/join/[code]` — первый игрок с `role:'player'`.

**Зависание:** Если игроки уже в лобби (зашли не через QR-экран `/join/`), им некуда нажать,
и `game:start` не эмитится никогда — игра висит.

## Whitelist файлов
- `src/components/lobby/Lobby.tsx` — единственный файл

## Два фикса в одном таске

### Фикс 1 — QR waiting screen (TV режим)

Экран ожидания показывается когда `myRole === "tv" && isWaitingForPlayers && roomCode` (строка ~580).

Добавить кнопку **"Начать игру →"** на этом экране:
- Видна ТОЛЬКО когда `gamePlayers.length > 0` (хотя бы один игрок подключился)
- При клике эмитит: `emit('game:start', { code: roomCode })`
- Стиль: белая кнопка (как на `/join/[code]` кнопка "НАЧАТЬ ИГРУ"), padding "16px 32px", border-radius 16, fontWeight 900
- Текст: "НАЧАТЬ ИГРУ" (ru) / "START GAME" (en)

Кнопка "← Назад к лобби" остаётся, ставить новую кнопку ВЫШЕ неё.

### Фикс 2 — Lobby для игроков (player режим)

В компоненте `Lobby` есть `roomState` с полями `currentGame` и `gameHostPlayerId`.

Добавить: если `myRole === 'player'` AND `user?.id === roomState?.gameHostPlayerId` AND `roomState?.currentGame` не null — показывать внизу экрана (fixed bottom) баннер/кнопку:

```
[Название игры из roomState.currentGame]
[НАЧАТЬ ИГРУ] → emit('game:start', { code: roomCode })
```

Стиль баннера: position fixed, bottom: 24px, left 50%, transform translateX(-50%),
background: "rgba(255,255,255,0.97)", color: "#08080d", borderRadius 20,
padding "16px 28px", display flex gap 16 alignItems center, boxShadow "0 8px 40px rgba(0,0,0,0.45)".

Кнопка внутри: fontWeight 900, fontSize 16, cursor pointer, border none, background transparent.

Баннер не показывать если `isWaitingForPlayers === true` (чтобы не дублировать с waiting screen).

### Нужно передать `emit` в нужные места

`emit` уже доступен в компоненте `Lobby` через `useSocket()`. Для QR waiting screen (рендерится внутри Lobby) — использовать тот же `emit` из scope.

Для баннера (Фикс 2) — `emit` тоже из scope Lobby, `roomCode` из `useState`.

## Acceptance
1. TV режим: на QR waiting screen кнопка "НАЧАТЬ ИГРУ" появляется когда ≥1 игрок подключился → клик запускает игру (все переходят на `/game/` и `/tv/`)
2. Player режим: если этот игрок = gameHostPlayerId и currentGame задана → внизу экрана баннер с кнопкой "НАЧАТЬ ИГРУ" → клик запускает игру
3. `npm run lint` без новых ошибок

## Не трогать
- `server.mts`, `socket-handlers.mts`
- Логику `game:select`, `game:started`, роутинг после старта
- `/join/[code]/page.tsx`
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
