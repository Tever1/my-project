# TASK-212 — Единый фон спец-квиза (плашка = ожидание = игра)

## Контекст / баг (от пользователя)

При выборе спец-квиза: в лобби «Выбрать квиз» → плашки квизов, у спец-квиза уже
есть фон. Но после выбора фон **меняется на другой**. Фон должен оставаться
таким же, как на экране выбора квизов.

## Корень

Два разных файла фонов на одну и ту же тему:
- Плашка выбора (`QuizSelectionScreen` в `src/components/lobby/Lobby.tsx`,
  около строк 2850-2859) хардкодит **тему**: `/backgrounds/harry-potter.png`,
  `/backgrounds/marvel.png`.
- Реестр `SPECIAL_QUIZZES` (`src/lib/quiz/index.ts`, строки 35-38) хранит
  **альт-картинку квиза**: `/backgrounds/harry-potter1.webp`,
  `/backgrounds/marvel1.webp`. Именно её показывают экран ожидания
  (`Lobby.tsx:871-872`) и игровой/TV-экран.

Отсюда смена фона после выбора. Также плашка ссылается на `.png` — нарушение
правила №8 (в реестрах и UI ссылаться только на `.webp`).

## Решение (выбор пользователя): везде использовать фон ТЕМЫ (базовый `.webp`)

Свести всё к `harry-potter.webp` / `marvel.webp` (как на плашке). Альт-файлы
`…1.webp` останутся неиспользуемыми — это ОК.

## Что сделать

### 1. Реестр `SPECIAL_QUIZZES` — `src/lib/quiz/index.ts` (строки 35-38)

Заменить `backgroundUrl` на базовый webp темы:
- `harry-potter-1`: `backgroundUrl: '/backgrounds/harry-potter1.webp'`
  → `'/backgrounds/harry-potter.webp'`
- `marvel-1`: `backgroundUrl: '/backgrounds/marvel1.webp'`
  → `'/backgrounds/marvel.webp'`

(Только эти два поля. `iconUrl` и прочее не трогать.)

### 2. Плашки выбора — `src/components/lobby/Lobby.tsx` (`QuizSelectionScreen`, ~2850-2859)

Заменить `.png` → `.webp` (правило №8) в обоих местах каждой плашки —
и в `backgroundUrl=`, и в аргументе `onSelectSpecial(...)`:
- Harry Potter: `/backgrounds/harry-potter.png` → `/backgrounds/harry-potter.webp`
  (в `backgroundUrl="..."` и во втором аргументе `onSelectSpecial("harry-potter-1", "...")`).
- Marvel: `/backgrounds/marvel.png` → `/backgrounds/marvel.webp`
  (аналогично).

После правок: плашка, экран ожидания (`pendingQuizConfig.specialQuizId` →
`SPECIAL_QUIZZES…backgroundUrl`) и игровой/TV-экран
(`specialQuizInfo?.backgroundUrl`) — все указывают на один и тот же
`harry-potter.webp` / `marvel.webp`.

## Чего НЕ трогать

- `SPECIAL_QUIZ_THEMES` (у них уже базовый webp — оставить).
- Логику `getSpecialQuizQuestions`, банки вопросов, `pendingQuizConfig`.
- Серверный код, `/join`, `/tv` (фон там резолвится из реестра — после правки
  реестра подхватится сам).
- Существующие файлы картинок (ничего не удалять/не генерировать).

## Whitelist файлов (трогать ТОЛЬКО эти два)

- `src/lib/quiz/index.ts`
- `src/components/lobby/Lobby.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- В коде нет ссылок на `harry-potter1.webp` / `marvel1.webp` / `*.png`-фоны
  спец-квизов (grep чистый в затронутых местах).
- Логика: фон на плашке выбора, на экране ожидания и в игре — один и тот же
  (`harry-potter.webp` / `marvel.webp`).

## Отчёт

`codex-reports/212-special-quiz-bg-consistent.md`. Не коммить.
