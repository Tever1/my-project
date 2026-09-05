# TASK-190: Quiz — РЕАЛЬНЫЙ фикс фона (stacking context) + чистка бейджей ожидания

## КОРЕНЬ ПРОБЛЕМЫ ФОНА (наконец найден)

Фон спец-квиза НЕ показывался на мобилке последние 3-4 итерации НЕ из-за конфига
(конфиг доходит корректно), а из-за **stacking context**:

- `.bg-gradient-main` — НЕПРОЗРАЧНЫЙ градиент (`linear-gradient(...#0c0a15...)`).
- В `GameLayout` корневой div: `relative` БЕЗ `isolate` → не создаёт stacking context.
- `<img class="... -z-10">` с отрицательным z-index уходит ЗА непрозрачный градиент
  родителя → картинка невидима, юзер видит "нейтральный" градиент.
- На TV-странице фон работает, потому что там корневой div имеет `relative isolate`.

### ФИКС 1 — `src/components/games/GameLayout.tsx`

Найди корневой div (около строки 45):
```tsx
className={`bg-gradient-main min-h-[100dvh] text-white flex flex-col relative ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''}`}
```
Добавь `isolate` после `relative`:
```tsx
className={`bg-gradient-main min-h-[100dvh] text-white flex flex-col relative isolate ${backgroundUrl ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_80%)]' : ''}`}
```
Это единственное изменение в файле. `isolate` создаёт stacking context, и `-z-10`
картинка рисуется ПОВЕРХ градиента родителя (как на TV).

---

## ФИКС 2 — убрать иконки + скругление на экранах ожидания

На "загрузочных экранах" (waiting-фаза) бейдж с названием спец-квиза сейчас:
1. Показывает иконку Marvel/Harry Potter (`<QuizIcon>`) — её надо УБРАТЬ.
2. Использует `glass-badge` со скруглением `999px` (таблетка) — надо `rounded-md`
   как у вариантов ответа квиза.

Варианты ответа квиза используют: `rounded-md border bg-white/5 border-white/10 backdrop-blur-xl`.

### 2a — `src/app/game/[roomId]/quiz/page.tsx` (мобильный waiting)

Найди в waiting-фазе (около строки 681):
```tsx
{specialQuizInfo ? (
  <span className="glass-badge px-10 py-6 text-4xl inline-flex items-center gap-4">
    <QuizIcon iconUrl={specialQuizInfo.iconUrl} fallback={specialQuizInfo.icon} size={56} />
    {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
  </span>
) : (
```

Замени на (убрана иконка, glass-badge → rounded-md стиль ответов):
```tsx
{specialQuizInfo ? (
  <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-10 py-6 text-4xl font-semibold inline-flex items-center">
    {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
  </span>
) : (
```

### 2b — `src/app/tv/[roomId]/[gameType]/page.tsx` (TV waiting)

Найди в waiting-фазе (около строки 606):
```tsx
{specialQuizInfo ? (
  <div className="mt-6 flex items-center justify-center gap-4">
    <span className="glass-badge px-12 py-8 text-5xl inline-flex items-center gap-5">
      <QuizIcon iconUrl={specialQuizInfo.iconUrl} fallback={specialQuizInfo.icon} size={72} />
      {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
    </span>
  </div>
) : specialThemeInfo ? (
```

Замени на (убрана иконка, glass-badge → rounded-md):
```tsx
{specialQuizInfo ? (
  <div className="mt-6 flex items-center justify-center gap-4">
    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-12 py-8 text-5xl font-semibold inline-flex items-center">
      {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
    </span>
  </div>
) : specialThemeInfo ? (
```

ВАЖНО: в обоих файлах НЕ трогай ветки с `diffInfo`/`topicInfo`/`specialThemeInfo`
(general-квизы) — там остаётся как есть. Меняем ТОЛЬКО ветку `specialQuizInfo`.

После удаления `<QuizIcon>` из этих мест — проверь, не стал ли импорт `QuizIcon`
неиспользуемым. Если он используется в других местах файла (а он используется,
напр. в general badges) — оставь импорт. Не удаляй.

---

## Whitelist файлов
- `src/components/games/GameLayout.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Не трогать
- Логику конфига/сокетов — фон уже резолвится правильно, проблема была чисто CSS
- General-квиз бейджи (diff/topic)
- Другие игры
- CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый, без unused QuizIcon
- `GameLayout` корневой div содержит `isolate`
- В waiting-бейдже спец-квиза НЕТ `<QuizIcon>`, класс `rounded-md border border-white/10 bg-white/5 backdrop-blur-xl`

## Отчёт
Сохрани в `codex-reports/190-quiz-bg-stacking-and-badge-cleanup.md`
