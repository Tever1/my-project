# TASK-365: TV «100 к 1» — подсветить рамку выигравшей команды на фазе buzzer

## Контекст

В файле `src/app/tv/[roomId]/[gameType]/page.tsx`, блок `h.phase === 'buzzer'`
(строки ~1400-1445) — это экран между раундами, где капитаны команд жмут
кнопку-буззер на телефонах, чтобы определить, какая команда атакует
следующий раунд. Победитель хранится в `h.buzzerWinner` (0 = ещё не нажали,
1 = команда 1 нажала первой, 2 = команда 2).

Сейчас две карточки капитанов (team1 слева, team2 справа) рендерятся со
статичными классами рамки, которые НЕ реагируют на `h.buzzerWinner`:

```tsx
{/* Team 1 card, строка ~1410 */}
<div className={`${H2O_TV_GLASS_STRONG} flex flex-col items-center gap-[18px] rounded-[var(--radius-2xl)] border-yellow-200/25 bg-yellow-300/[.10] p-[40px_30px]`}>
  ...
</div>

{/* Team 2 card, строка ~1427 */}
<div className={`${H2O_TV_GLASS_STRONG} flex flex-col items-center gap-[18px] rounded-[var(--radius-2xl)] border-red-300/25 bg-red-400/[.10] p-[40px_30px]`}>
  ...
</div>
```

Единственная реакция на `buzzerWinner` сейчас — текст "нажал первым" внутри
карточки и цвет центрального круга-таймера. Рамки самих карточек не
выделяются.

## Что сделать

Сделать рамку выигравшей команды заметно выделяющейся (ярче/толще/с
свечением), когда `h.buzzerWinner` определён, а рамку проигравшей — слегка
притушить. Пока `h.buzzerWinner === 0` (никто ещё не нажал) — обе карточки
остаются как сейчас (статус-кво).

Для карточки team1 (строка ~1410) заменить фиксированные `border-yellow-200/25 bg-yellow-300/[.10]`
на условные классы:

```tsx
<div className={`${H2O_TV_GLASS_STRONG} flex flex-col items-center gap-[18px] rounded-[var(--radius-2xl)] p-[40px_30px] transition-all duration-500 ${
  h.buzzerWinner === 1
    ? 'border-2 border-yellow-300 bg-yellow-300/[.18] shadow-[0_0_50px_rgba(250,204,21,.4)]'
    : h.buzzerWinner === 2
      ? 'border-yellow-200/10 bg-yellow-300/[.04] opacity-50'
      : 'border-yellow-200/25 bg-yellow-300/[.10]'
}`}>
```

Для карточки team2 (строка ~1427) аналогично, красная палитра:

```tsx
<div className={`${H2O_TV_GLASS_STRONG} flex flex-col items-center gap-[18px] rounded-[var(--radius-2xl)] p-[40px_30px] transition-all duration-500 ${
  h.buzzerWinner === 2
    ? 'border-2 border-red-300 bg-red-400/[.18] shadow-[0_0_50px_rgba(248,113,113,.4)]'
    : h.buzzerWinner === 1
      ? 'border-red-300/10 bg-red-400/[.04] opacity-50'
      : 'border-red-300/25 bg-red-400/[.10]'
}`}>
```

Обрати внимание: у обеих карточек изначально в className уже есть `border-*`
классы (border-yellow-200/25 / border-red-300/25) БЕЗ явного `border` (ширины
рамки) — Tailwind, скорее всего, полагается на border-width, заданный где-то
в `H2O_TV_GLASS_STRONG` или по умолчанию через global reset. Проверь итоговую
рамку визуально/по классам: важно, чтобы у выигравшей команды рамка была
СУЩЕСТВЕННО заметнее (толще и/или ярче и/или со свечением через shadow),
а не просто на волосок отличалась.

Больше ничего в этом блоке не менять (текст, avatar, круг-таймер, hint внизу
— всё остаётся как есть).

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- Визуально: пока `buzzerWinner === 0` — обе карточки выглядят как раньше.
  Как только кто-то нажал буззер — рамка его команды заметно подсвечивается
  (ярче, с свечением), рамка другой команды слегка тускнеет.
- Ничего в фазах `roleSelect`/`captainSelect`/`teamNames`/`playing` не задето.

## Отчёт

Записать в `codex-reports/365-h2o-tv-buzzer-winner-highlight.md`:
что изменено, diff по строкам, результат tsc/lint.
