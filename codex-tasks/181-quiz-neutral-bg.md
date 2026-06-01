# TASK-181: Quiz — фон полностью нейтральный (пока что)

## Контекст
Единственный источник фона квиза — картинка спец-квиза (harry-potter/marvel),
т.к. у общих тем (QUIZ_TOPICS) backgroundUrl нет. Пользователь хочет, чтобы фон
был нейтральным ВЕЗДЕ пока что (позже подберём нужные картинки).

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Fix
Сделать `backgroundUrl` нейтральным (undefined) в обоих файлах.

`src/app/game/[roomId]/quiz/page.tsx`, строка ~669:
```tsx
// Было:
const backgroundUrl = specialQuizInfo?.backgroundUrl ?? topicInfo?.backgroundUrl;
// Стало (фон пока нейтральный — картинки подберём позже):
const backgroundUrl: string | undefined = undefined;
```

`src/app/tv/[roomId]/[gameType]/page.tsx`, строка ~476:
```tsx
// Было:
const backgroundUrl = specialQuizInfo?.backgroundUrl ?? topicInfo?.backgroundUrl;
// Стало:
const backgroundUrl: string | undefined = undefined;
```

ВАЖНО: переменные `specialQuizInfo`, `specialThemeInfo`, `topicInfo` НЕ удалять —
они используются для бейджей/заголовков. Меняется только строка `backgroundUrl`.
Если линтер ругнётся на «unused» для какой-то из них — оставь как есть только если
она реально нигде не используется; иначе не трогай.

## Acceptance criteria
- [ ] Фон квиза нейтральный (bg-gradient-main) на всех экранах — мобилка и TV
- [ ] Картинка harry-potter/marvel НЕ показывается как фон ни на каком шаге
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- Бейджи спец-квизов (они остаются)
- Другие игры, CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/181-quiz-neutral-bg.md`
