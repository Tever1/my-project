# TASK-368: TV «100 к 1» Большая игра — не показывать все вопросы во время выбора игроков и ответов

## Контекст

В файле `src/app/tv/[roomId]/[gameType]/page.tsx`, блок `h.phase === 'bigGame'`
(строки ~1582-1636). Фаза "Большая игра" на мобильном имеет под-фазы `bgPhase`:
`0`=капитан выбирает 2 игроков (интро), `1`=игрок 1 отвечает (30 сек),
`2`=проверка ответов игрока 1, `3`=игрок 2 отвечает (40 сек), `4`=проверка
ответов игрока 2, `5`=результат.

Сейчас TV-рендер ВСЕГДА показывает весь список из 5 вопросов
(`activeBigQ.map(...)`, строка ~1596) с чипами ответов — независимо от того,
идёт ли ещё выбор игроков (`bgPhase === 0`) или конкретный игрок только
отвечает на один вопрос (`bgPhase === 1` или `3`, где `h.bgCurQ` — индекс
текущего вопроса). Это раскрывает все вопросы заранее — не нужно.

Заголовок сверху сейчас:

```tsx
<b className="text-[26px] font-extrabold uppercase tracking-[2px] text-amber-200">
  БОЛЬШАЯ ИГРА · {h.bgPhase <= 2 ? 'ИГРОК 1 — 30 СЕК' : 'ИГРОК 2 — 40 СЕК'}
</b>
```

## Что сделать

### 1. Фаза `bgPhase === 0` (капитан выбирает игроков)

Полностью заменить содержимое (и заголовочную плашку, и основной grid с
вопросами/таймером/фондом) на центрированный экран ожидания в стиле уже
существующего `topicSelect` (строки ~1217-1240 того же файла, для образца
стилей `H2O_TV_GLASS_STRONG`, иконки, текста). Пример структуры:

```tsx
{h.bgPhase === 0 ? (
  <>
    <div className="flex items-center justify-between">
      <H2OTVBrand />
      {h2oLivePill}
    </div>
    <div className="flex flex-1 flex-col items-center justify-center gap-9 text-center">
      <div className={`${H2O_TV_ACCENT} flex h-[148px] w-[148px] items-center justify-center rounded-[40px] text-[#341f02]`}>
        <HundredToOneIcon name="shuffle" className="h-[78px] w-[78px]" strokeWidth={1.7} />
      </div>
      <div className={`${H2O_TV_GLASS_STRONG} flex max-w-[720px] flex-col items-center gap-4 rounded-[var(--radius-2xl)] px-12 py-10`}>
        <div className="font-mono text-[15px] font-bold uppercase tracking-[4px] text-amber-200/75">
          {l('Большая игра', 'Big game')}
        </div>
        <h2 className="text-balance text-[54px] font-extrabold leading-[1.02] tracking-[-1.5px] text-white">
          {l('Капитан выбирает игроков…', 'Captain is choosing players…')}
        </h2>
      </div>
    </div>
  </>
) : (
  /* существующая разметка заголовка + grid для bgPhase 1-4, см. ниже */
)}
```

Обёртка `h.phase === 'bigGame' && ( ... )` остаётся, внутри добавляется
условие на `h.bgPhase === 0` vs остальные под-фазы.

### 2. Фазы `bgPhase === 1` и `bgPhase === 3` (игрок отвечает)

В списке вопросов (`activeBigQ.map((qq, i) => { ... })`, строка ~1596)
рендерить ТОЛЬКО текущий вопрос — с индексом `i === h.bgCurQ`. Остальные
вопросы (индекс ≠ `bgCurQ`) не рендерить вообще (`return null` в начале
колбэка). Пример:

```tsx
{activeBigQ.map((qq, i) => {
  if ((h.bgPhase === 1 || h.bgPhase === 3) && i !== h.bgCurQ) return null;
  const ans1 = h.bgP1Ans[i];
  // ... остальной код блока БЕЗ ИЗМЕНЕНИЙ ...
})}
```

Ничего внутри самого рендера строки вопроса (чипы, стили, `current`-подсветка)
не менять — просто пропускать чужие индексы через `return null`.

### 3. Фазы `bgPhase === 2` и `bgPhase === 4` (проверка ответов) — НЕ ТРОГАТЬ

В этих под-фазах список должен остаться полным (все 5 вопросов видны) — это
нужно ведущему для сверки. Условие `return null` из пункта 2 намеренно
ограничено только `bgPhase === 1 || bgPhase === 3`.

### 4. Заголовочная плашка для bgPhase 1-4

Оставить как есть (`БОЛЬШАЯ ИГРА · {h.bgPhase <= 2 ? ... : ...}`), не менять.

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

**Мобильный экран не трогать** (`src/app/game/[roomId]/hundred-to-one/page.tsx`
вне whitelist для этой задачи — там уже всё работает как нужно, менять
ничего не нужно).

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- `bgPhase === 0`: TV показывает центрированное сообщение «Капитан выбирает
  игроков…» вместо списка вопросов и сайдбара с таймером/фондом.
- `bgPhase === 1` или `3`: TV показывает только ОДИН вопрос (текущий,
  `i === h.bgCurQ`), сайдбар с таймером/фондом остаётся как был.
- `bgPhase === 2` или `4`: список всех 5 вопросов остаётся видимым, без
  изменений (регрессии нет).
- `bgPhase === 5` (переход в `final` phase) не затронут.

## Отчёт

Записать в `codex-reports/368-h2o-tv-biggame-hide-all-questions.md`:
что изменено, diff по строкам, результат tsc/lint.
