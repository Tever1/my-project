# TASK-186: Quiz — удалить setup-экраны, включить фоны для спец-квизов

## Контекст
После TASK-185 конфиг квиза приходит через `game:started` payload, и game-host сразу
попадает в фазу `waiting`. Setup-экраны (setup-mode, setup-difficulty, setup-topic,
setup-special-theme, setup-special-quiz) в мобильном quiz/page.tsx больше не нужны —
их можно удалить.

Вторая проблема: строка 728 в quiz/page.tsx жёстко задаёт `backgroundUrl = undefined`,
из-за чего фон не показывается ни на мобилке ни на ТВ даже когда выбран специальный квиз.

## Что делать

### 1. Удалить все setup-фазы из `src/app/game/[roomId]/quiz/page.tsx`

**Удалить из типа Phase** (строка 23):
```ts
// До:
type Phase = 'setup-mode' | 'setup-difficulty' | 'setup-topic' | 'setup-special-theme' | 'setup-special-quiz' | 'waiting' | ...
// После:
type Phase = 'waiting' | 'countdown' | 'question' | 'results' | 'mid-leaderboard' | 'final';
```

**Удалить весь JSX** для фаз (найди блоки `{gameState.phase === 'setup-mode' && ...}` и т.д. до `setup-special-quiz`):
- блок setup-mode (строки ~742–808)
- блок setup-difficulty (~809–861)
- блок setup-special-theme (~862–918)
- блок setup-special-quiz (~919–966)
- блок setup-topic (~967–1020)

**Удалить хендлеры** которые переключают между setup-фазами:
- `handleSelectMode` (переключает в setup-difficulty / setup-special-theme)
- `handleBack` (возврат на предыдущую setup-фазу)
- `handleSelectSpecialTheme` (переключает в setup-special-quiz)
- `handleSelectSpecialQuiz` (применяет спец-квиз и идёт в waiting — эта логика УЖЕ перенесена в useEffect из game:started в TASK-185, поэтому хендлер больше не нужен)
- `handleSelectTopic` (переключает в waiting)
- `handleSelectDifficulty` (переключает в setup-topic)

**Инициальный phase** (строка ~71):
```ts
// До: phase: 'setup-mode'
// После: phase: 'waiting'
```

Убедиться что `prevPhase`-логика и весь связанный код тоже удалён (он только для setup-переходов).

### 2. Исправить backgroundUrl в `src/app/game/[roomId]/quiz/page.tsx`

Найди строку (около 728):
```ts
const backgroundUrl: string | undefined = undefined;
```

Замени на:
```ts
const backgroundUrl: string | undefined =
  specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl ?? undefined;
```

`specialQuizInfo` и `specialThemeInfo` уже вычислены выше (строки 726–727).

### 3. Исправить backgroundUrl в `src/app/tv/[roomId]/[gameType]/page.tsx`

Найди аналогичное место где вычисляется backgroundUrl для quiz TV (поищи `backgroundUrl` в файле).
Там тоже должна быть цепочка: `specialQuizInfo?.backgroundUrl ?? specialThemeInfo?.backgroundUrl ?? topicInfo?.backgroundUrl ?? undefined`.
Если уже правильно — не трогай.

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Важно
- Не трогать фазы `waiting`, `countdown`, `question`, `results`, `mid-leaderboard`, `final`
- Не трогать `quiz:config`, `quiz:action`, `sendAction`, socket-логику
- Не трогать другие игры
- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- В мобильном quiz/page.tsx нет JSX для setup-фаз
- `backgroundUrl` вычисляется из specialQuizInfo / specialThemeInfo, не `undefined`
- `npm run lint` — чистый (убраны неиспользуемые переменные от удалённых хендлеров)

## Отчёт
Сохрани в `codex-reports/186-quiz-cleanup-setup-screens.md`
