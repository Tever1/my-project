# TASK-216 — Фон комнаты на телефоне в цвете выбранной игры (как в лобби)

## Контекст / требование (от пользователя)

Экран комнаты на телефоне (`src/app/join/[code]/page.tsx`) сейчас использует
статичный сине-розовый градиент (около строк 186-188):
```ts
background:
  "radial-gradient(700px 520px at 60% 15%, rgba(10,132,255,0.24), transparent 62%), radial-gradient(620px 500px at 20% 85%, rgba(255,59,107,0.22), transparent 64%), #08080d",
```
Нужно, чтобы фон был такого же цвета, как фон в лобби выбранной игры —
per-game градиент на основе цвета игры.

## Эталон — градиент лобби

`src/components/lobby/Lobby.tsx` (около строки 1050) использует:
```ts
`radial-gradient(1200px 800px at 70% 30%, ${accent}55, transparent 60%), radial-gradient(1000px 700px at 20% 70%, ${deep}66, transparent 60%), #06060c`
```
где `accent`/`deep` берутся из `gameColors[gameId]` (`@/lib/design/tokens`,
`Record<GameId, { accent: string; deep: string }>`).

## Что сделать

Файл: `src/app/join/[code]/page.tsx`. Менять ТОЛЬКО его.

1. Импортировать палитру и тип:
   ```ts
   import { gameColors, type GameId } from "@/lib/design/tokens";
   ```
2. Вычислить цвет по `roomState.currentGame`:
   ```ts
   const currentGame = roomState?.currentGame;
   const gamePalette =
     currentGame && currentGame in gameColors
       ? gameColors[currentGame as GameId]
       : null;
   ```
3. Собрать фон `<main>`:
   - Если `gamePalette` есть — использовать градиент лобби с его `accent`/`deep`:
     ```ts
     const mainBackground = gamePalette
       ? `radial-gradient(1200px 800px at 70% 30%, ${gamePalette.accent}55, transparent 60%), radial-gradient(1000px 700px at 20% 70%, ${gamePalette.deep}66, transparent 60%), #06060c`
       : "radial-gradient(700px 520px at 60% 15%, rgba(10,132,255,0.24), transparent 62%), radial-gradient(620px 500px at 20% 85%, rgba(255,59,107,0.22), transparent 64%), #08080d";
     ```
     (т.е. при отсутствии выбранной игры — оставить текущий нейтральный фон как
     fallback).
   - Подставить `mainBackground` в `style={{ background: ... }}` у `<main>`
     (строки ~186-188).

## Чего НЕ трогать

- Внутреннюю glass-карточку (`rgba(255,255,255,0.035)` и т.п.) — только фон `<main>`.
- Логику, роутинг, прочие стили.
- Серверный код, Lobby.tsx, /tv.

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/app/join/[code]/page.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика: когда выбрана игра (`roomState.currentGame` — валидный id), фон
  телефонной комнаты совпадает по цвету с лобби этой игры; без выбранной игры —
  прежний нейтральный фон.

## Отчёт

`codex-reports/216-join-room-bg-per-game-color.md`. Не коммить.
