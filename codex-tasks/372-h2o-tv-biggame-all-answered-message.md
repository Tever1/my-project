# TASK-372: TV «100 к 1» Большая игра — сообщение, когда все 5 вопросов отвечены

## Контекст

TASK-368/370 сделали так, что на `bgPhase === 1 || bgPhase === 3` (игрок
отвечает) TV показывает только ТЕКУЩИЙ вопрос (`i === h.bgCurQ`) вместо
всего списка (`src/app/tv/[roomId]/[gameType]/page.tsx`, строка ~1616-1638):

```tsx
<div className={`flex min-h-0 flex-col gap-3 ${(h.bgPhase === 1 || h.bgPhase === 3) ? 'justify-center' : ''}`}>
  {activeBigQ.map((qq, i) => {
    if ((h.bgPhase === 1 || h.bgPhase === 3) && i !== h.bgCurQ) return null;
    ...
  })}
</div>
```

Проблема: когда игрок отвечает на ВСЕ 5 вопросов, `h.bgCurQ` становится
равным `5` (индексы вопросов — 0..4). Условие `i !== h.bgCurQ` в этом случае
не совпадает ни с одним элементом массива (`activeBigQ` содержит только 5
элементов, индексы 0-4) — весь `.map()` возвращает `null` для каждого
элемента, и левая колонка на TV становится ПУСТОЙ (белое/чёрное пятно,
никакого сообщения). Пользователь ждёт, пока ведущий на телефоне нажмёт
«ПЕРЕЙТИ К ПРОВЕРКЕ» — но TV в этот момент ничего не показывает вместо
последнего вопроса.

## Что сделать

Когда `(h.bgPhase === 1 || h.bgPhase === 3) && h.bgCurQ >= 5` — вместо
пустого `.map()` показать сообщение в стиле, аналогичном уже существующему
сообщению из TASK-363 (`captainSelect`, className
`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`):

```tsx
<div className={`flex min-h-0 flex-col gap-3 ${(h.bgPhase === 1 || h.bgPhase === 3) ? 'justify-center' : ''}`}>
  {(h.bgPhase === 1 || h.bgPhase === 3) && h.bgCurQ >= 5 ? (
    <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
      {l('Все вопросы отвечены — ждём ведущего…', 'All questions answered — waiting for the host…')}
    </div>
  ) : (
    activeBigQ.map((qq, i) => {
      if ((h.bgPhase === 1 || h.bgPhase === 3) && i !== h.bgCurQ) return null;
      const ans1 = h.bgP1Ans[i];
      // ... остальной код блока БЕЗ ИЗМЕНЕНИЙ ...
    })
  )}
</div>
```

Остальной код рендера карточки вопроса (чипы, стили, номер) НЕ менять —
просто обернуть существующий `.map()` в условие и добавить альтернативную
ветку с сообщением.

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- Пока `bgCurQ < 5` (идёт ответ) — поведение как было (TASK-370, компактная
  карточка текущего вопроса).
- Когда `bgCurQ >= 5` на `bgPhase === 1` или `3` — TV показывает сообщение
  «Все вопросы отвечены — ждём ведущего…» вместо пустой области.
- `bgPhase === 2 || 4` (проверка) не затронуты.

## Отчёт

Записать в `codex-reports/372-h2o-tv-biggame-all-answered-message.md`:
что изменено, diff по строкам, результат tsc/lint.
