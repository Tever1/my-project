# TASK-241 — Spy live-QA fixes (волна 5)

## Контекст
Live-QA Шпиона. 4 правки по фидбеку. Только клиент.

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код (`server.mts`, `src/server/**`)
- любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать файл.
- НЕ запускать `npm run build`. Валидация: `npm run lint` + `npx tsc --noEmit`.
- Двуязычность ru/en (`l(ru, en)`).
- codex-reports не трогать (отчёт оставь в выводе).

---

## #1 — Вернуть прежний вид/ширину кнопок «Заменить слово» / «Голосование»
В TASK-240 эти кнопки превратили в `glass-card px-4 py-3` — из-за этого изменился вид
(раньше был `GlassButton size="lg"` → класс `glass-button px-8 py-3.5 text-lg`).
Вернуть прежний стиль, СОХРАНИВ inline-подтверждение ✓/✗ внутри кнопки.

Функция `renderHostAction` (~строки 831-875). Изменить ТОЛЬКО классы обёртки и
лейбл-кнопки, чтобы визуально совпадало с прежним `GlassButton size="lg" w-full`:

- Внешний `<div>`: заменить className
```
className={`glass-card flex w-full items-center justify-between gap-3 px-4 py-3 ${accent ?? 'border-white/10'}`}
```
→
```
className={`glass-button flex w-full items-center justify-between gap-3 px-8 py-3.5 text-lg ${accent ?? ''}`}
```

- Внутренняя лейбл-`<button>`: центрировать содержимое как раньше (текст по центру):
```
className="flex flex-1 items-center gap-2 text-left text-lg font-medium disabled:cursor-default"
```
→
```
className="flex flex-1 items-center justify-center gap-2 font-medium disabled:cursor-default"
```

Блоки ✓/✗ (зелёная/красная круглые кнопки) — НЕ трогать.

---

## #2 — «Начать голосование» → «Голосование» (в кнопке)
В вызовах `renderHostAction` (draw-mode ~строка 1147 и guess-mode блок) поменять
лейбл голосования:
```
l('Начать голосование', 'Start voting')
```
→
```
l('Голосование', 'Voting')
```
Поменять во ВСЕХ вызовах `renderHostAction(... 'voting' ...)` (их два — draw и guess).
Лейбл «Заменить слово» НЕ трогать.

---

## #3 — Кнопка «← К выбору режима» у host в фазе подведения итогов (roundResult)
Сейчас кнопка есть в `dealing` и `playing`. Добавить такую же в фазе `roundResult`.
Блок `{!s.gameOver && s.phase === 'roundResult' && s.roundResult && (` — его контейнер
`<div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">`.
В самом верху этого контейнера (перед карточкой результата) добавить:
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
(Функция `backToModeSelect` уже существует.)

---

## #4 — Draw mode: перенести инфо «чей ход / кто рисует» в карточку «Раунд», отдельное поле убрать
Касается ТОЛЬКО режима рисования (`s.mode === 'draw'`). Фаза `playing`.

1. Карточка раунда (~строки 1068-1073). Сейчас:
```tsx
<GlassCard className="p-4 flex items-center justify-between">
  <div>
    <p className="text-xs text-white/40">{l('Раунд', 'Round')} {s.currentRound}</p>
    <p className="text-sm text-white/70">{s.category}</p>
  </div>
</GlassCard>
```
Добавить справа (в draw-режиме) статус хода рисующего:
```tsx
<GlassCard className="p-4 flex items-center justify-between gap-3">
  <div>
    <p className="text-xs text-white/40">{l('Раунд', 'Round')} {s.currentRound}</p>
    {s.category && <p className="text-sm text-white/70">{s.category}</p>}
  </div>
  {s.mode === 'draw' && (
    <div className="text-right text-sm">
      {isActivePlayer ? (
        <span className="font-bold text-purple-300">
          <SpyIcon name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />
          {l('Твой ход — рисуй!', 'Your turn — draw!')}
        </span>
      ) : (
        <span className="text-white/60">
          {l('Рисует: ', 'Drawing: ')}
          <span className="font-bold text-white">{activePlayerName}</span>
        </span>
      )}
    </div>
  )}
</GlassCard>
```
(Категорию обернул в `{s.category && ...}` т.к. в draw-режиме она пустая.)

2. УДАЛИТЬ отдельный блок статуса рисования (~строки 1103-1123):
```tsx
{s.mode === 'draw' && (
  <div className={`rounded-xl border px-4 py-3 text-center text-sm transition-all ${
    isActivePlayer ? 'border-purple-400/60 bg-purple-500/15 text-purple-300'
      : 'border-white/10 bg-white/5 text-white/50'
  }`}>
    ... (Твой ход — рисуй! / Рисует: X)
  </div>
)}
```
Полностью убрать этот блок (инфо переехало в карточку раунда). Блок с `<DrawCanvas>`
(`{s.mode === 'draw' && (<DrawCanvas .../>)}`) НЕ трогать.

Guess-режим (карточки «Твой ход» / «Сейчас отвечает») НЕ трогать.

---

## Acceptance
- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- #1 кнопки замены/голосования снова в стиле `glass-button` (как было), ✓/✗ сохранены.
  #2 надпись «Голосование». #3 «← К выбору режима» есть и в roundResult у host.
  #4 в draw-режиме статус рисующего в карточке раунда, отдельного поля нет; guess не тронут.
