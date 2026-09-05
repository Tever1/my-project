# TASK-240 — Spy live-QA fixes (волна 4)

## Контекст
Live-QA Шпиона на телефонах + TV. 5 правок. Только клиент.

## Whitelist (трогать ТОЛЬКО эти файлы)
- `src/app/game/[roomId]/spy/page.tsx`  — правки #1, #2, #4, #5
- `src/app/tv/[roomId]/[gameType]/page.tsx` — правка #3

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код (`server.mts`, `src/server/**`)
- любые файлы кроме whitelist

## Правила
- Минимальный diff. НЕ переформатировать файлы, не менять несвязанные строки.
- НЕ запускать `npm run build` (падает в sandbox). Валидация: `npm run lint` + `npx tsc --noEmit`.
- Двуязычность ru/en (хелпер `l(ru, en)`).
- Отчёт оставить в выводе (codex-reports не трогать).

---

## #1 — peek-bar «твоё слово»: высота как у карточки «Раунд» (оба режима)
Файл `spy/page.tsx`, функция `renderPeekBar()` (~строки 789-825).
Внутри есть `<div className="min-h-[68px]">` — именно он делает карточку выше, чем
карточка раунда. Убрать `min-h-[68px]`:
```
<div className="min-h-[68px]">
```
→
```
<div>
```
Остальное в peek-bar не трогать (внешний контейнер уже `glass-card w-full p-4`).
Карточка peek работает и показывается в обоих режимах (вызов `renderPeekBar()` в
фазе playing не зависит от mode) — отдельно для draw ничего добавлять не надо.

---

## #2 — Подтверждение host-действий БЕЗ новых кнопок: ✓/✗ внутри той же кнопки
Файл `spy/page.tsx`, фаза `playing`. Сейчас (после TASK-239) есть:
- draw-mode host-кнопка «Начать голосование» (`onClick={() => setConfirmPlay('voting')}`)
- guess-mode host-блок с двумя кнопками «Заменить слово» / «Начать голосование»
- отдельная карточка-подтверждение `{confirmPlay && (<GlassCard>...)}`

Нужно: убрать отдельную карточку подтверждения. Вместо неё — при «взводе» действия
**внутри той же кнопки справа** появляются две маленькие круглые кнопки: зелёная с
галочкой (подтвердить) и красная с крестиком (отмена). Текст действия остаётся слева.

1. Стейт `confirmPlay` (`useState<null | 'replace' | 'voting'>`) уже есть — оставить.

2. Добавить локальный хелпер-рендер рядом с другими функциями компонента (например
   около `renderPeekBar`), типизируй иконку как `ReactNode` (добавь импорт
   `ReactNode` из `react`, если ещё не импортирован):
```tsx
const renderHostAction = (
  type: 'replace' | 'voting',
  label: string,
  icon: ReactNode,
  accent?: string,
) => {
  const armed = confirmPlay === type;
  return (
    <div className={`glass-card flex w-full items-center justify-between gap-3 px-4 py-3 ${accent ?? 'border-white/10'}`}>
      <button
        type="button"
        disabled={armed}
        onClick={() => setConfirmPlay(type)}
        className="flex flex-1 items-center gap-2 text-left text-lg font-medium disabled:cursor-default"
      >
        {icon}
        <span>{label}</span>
      </button>
      {armed && (
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="confirm"
            onClick={() => {
              if (type === 'replace') replaceWord();
              else startVoting();
              setConfirmPlay(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-green-400/50 bg-green-500/25 text-green-300"
          >
            <SpyIcon name="check" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="cancel"
            onClick={() => setConfirmPlay(null)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-red-400/50 bg-red-500/25 text-red-300"
          >
            <SpyIcon name="cross" className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
```
   (`SpyIcon` с именами `check` / `cross` уже используется в roundResult — типы есть.)

3. Заменить draw-mode host «Начать голосование» (блок `s.mode === 'draw' && isGameHost`
   с кнопкой startVoting) на:
```tsx
{s.mode === 'draw' && isGameHost && renderHostAction(
  'voting',
  l('Начать голосование', 'Start voting'),
  <SpyIcon name="ballot" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />,
  'border-amber-400/30 bg-amber-500/15 text-amber-200',
)}
```

4. Заменить guess-mode host-блок на:
```tsx
{s.mode === 'guess' && isGameHost && (
  <div className="space-y-2">
    {renderHostAction(
      'replace',
      l('Заменить слово', 'Replace word'),
      <SpyIcon name="refresh" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />,
    )}
    {renderHostAction(
      'voting',
      l('Начать голосование', 'Start voting'),
      <SpyIcon name="ballot" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />,
      'border-amber-400/30 bg-amber-500/15 text-amber-200',
    )}
  </div>
)}
```

5. УДАЛИТЬ отдельную карточку подтверждения `{confirmPlay && (<GlassCard ...>...</GlassCard>)}`,
   добавленную в TASK-239 (она больше не нужна — подтверждение теперь внутри кнопок).

---

## #4 — host: кнопка «Назад» к выбору режима (Угадай слово / Нарисуй)
Файл `spy/page.tsx`. У host должна быть возможность вернуться на экран `modeSelect`
(выбор «Угадай слово» / «Нарисуй») из идущего раунда.

1. Добавить функцию рядом с другими хендлерами:
```tsx
const backToModeSelect = () => {
  if (!isGameHost) return;
  setConfirmPlay(null);
  update({ phase: 'modeSelect' });
};
```

2. Показать кнопку «← К выбору режима» для host в фазах `dealing` и `playing`.
   В фазе `playing` — в самом верху блока, перед карточкой раунда (`<GlassCard className="p-4 flex items-center justify-between">`).
   В фазе `dealing` — в самом верху блока, перед центральным контентом.
   Вид кнопки (ghost, компактная):
```tsx
{isGameHost && (
  <button
    type="button"
    onClick={backToModeSelect}
    className="self-start text-sm text-white/50 hover:text-white/80"
  >
    {l('← К выбору режима', '← Back to mode select')}
  </button>
)}
```
   (Контейнеры этих фаз — `flex flex-col ... space-y-4`, кнопка встанет сверху.)

---

## #5 — draw mode: у шпиона кнопка «Угадать слово», как в обычном режиме
Файл `spy/page.tsx`, фаза `playing`. Сейчас кнопка показывается только в guess:
```tsx
{s.mode === 'guess' && isSpy && (
  <GlassButton size="lg" className="w-full" onClick={() => sendAction('spy:guess-start')}>
    {l('Угадать слово', 'Guess the word')}
  </GlassButton>
)}
```
Показывать её и в draw-режиме тоже. Заменить условие `s.mode === 'guess' && isSpy`
на просто `isSpy`:
```tsx
{isSpy && (
  <GlassButton size="lg" className="w-full" onClick={() => sendAction('spy:guess-start')}>
    {l('Угадать слово', 'Guess the word')}
  </GlassButton>
)}
```
Логика `spy:guess-start` → фаза `spyGuess` от режима не зависит, доп. правок не нужно.

---

## #3 — TV roundResult: две карточки не на всю высоту (~1/3)
Файл `tv/[roomId]/[gameType]/page.tsx`, блок spy `roundResult` (~строки 1348-1381).
Сейчас карточки в контейнере `<div className="flex gap-6 flex-1 min-h-0">` тянутся на
всю высоту игрового поля. Нужно: карточки по высоте контента, центрированы по
вертикали в оставшемся пространстве (визуально ~1/3, не во всю высоту).

Заменить обёртку строки карточек. Было:
```tsx
<div className="flex gap-6 flex-1 min-h-0">
  <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
    ... (карточка «Шпионом был(а)»)
  </div>
  <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
    ... (карточка «Загаданное слово»)
  </div>
</div>
```
Стало (обернуть в центрирующий flex-1, у самих карточек убрать вертикальное
растяжение — оставить `flex-1` для равной ШИРИНЫ, высота по контенту):
```tsx
<div className="flex-1 min-h-0 flex items-center justify-center">
  <div className="flex w-full gap-6">
    <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
      ... (карточка «Шпионом был(а)» — содержимое НЕ менять)
    </div>
    <div className="glass-card flex-1 flex flex-col items-center justify-center gap-4 p-8">
      ... (карточка «Загаданное слово» — содержимое НЕ менять)
    </div>
  </div>
</div>
```
Внутреннее содержимое обеих карточек оставить как есть. Меняется только обёртка:
строка карточек больше не `flex-1 min-h-0` сама по себе, а вложена в центрирующий
контейнер `flex-1 min-h-0 flex items-center justify-center`, поэтому карточки
сжимаются до высоты контента.

---

## Acceptance
- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- diff только в двух whitelisted-файлах.
- #1 peek-bar по высоте = карточка раунда. #2 подтверждение ✓/✗ внутри кнопок, без
  отдельной карточки. #3 TV-карточки итогов не на всю высоту, центрированы.
  #4 у host есть «← К выбору режима» в dealing/playing. #5 шпион видит «Угадать
  слово» и в draw-режиме.
