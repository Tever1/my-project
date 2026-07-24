# TASK-364: TV «100 к 1» — заменить QR-код в центральной панели на этапе teamNames

## Контекст

Продолжение TASK-363. В файле `src/app/tv/[roomId]/[gameType]/page.tsx`,
в блоке `(h.phase === 'roleSelect' || h.phase === 'captainSelect' || h.phase === 'teamNames')`,
центральная панель сейчас (после TASK-363) рендерится трёхветочным
тернарником:

```tsx
{h.phase === 'roleSelect' ? (
  <>
    {/* Ещё выбирают роль / Все выбрали роль ✓ + ведущий */}
  </>
) : h.phase === 'captainSelect' ? (
  <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
    {l('Команды выбирают капитанов...', 'Teams are choosing captains...')}
  </div>
) : (
  <>
    {/* QR-код + номер комнаты + ведущий — используется для teamNames */}
  </>
)}
```

Fallback-ветка (QR-код) сейчас относится только к `teamNames` (`roleSelect`
и `captainSelect` уже выделены отдельно). На фазе `teamNames` игроки уже
подключены и капитаны вводят название команды — QR-код не нужен и вводит в
заблуждение, как и было с captainSelect.

## Что сделать

Превратить тернарник в четырёхветочный: добавить отдельную ветку для
`h.phase === 'teamNames'`, стилистически идентичную ветке `captainSelect`
(тот же className), с текстом:

```
{l('Игроки выбирают название команды...', 'Players are choosing a team name...')}
```

QR-код при этом остаётся БЕЗ фактического применения в этом блоке (он
относился только к teamNames) — просто убрать его отсюда, заменив на
сообщение. Итоговая структура:

```tsx
{h.phase === 'roleSelect' ? (
  <>
    {/* без изменений */}
  </>
) : h.phase === 'captainSelect' ? (
  <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
    {l('Команды выбирают капитанов...', 'Teams are choosing captains...')}
  </div>
) : (
  <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
    {l('Игроки выбирают название команды...', 'Players are choosing a team name...')}
  </div>
)}
```

(Последняя ветка `else` теперь однозначно относится только к `teamNames`,
т.к. это единственная оставшаяся фаза из тройного условия блока.)

Убедиться, что переменные `joinUrl`, `QRCodeCanvas`, `roomId`, использованные
только в удаляемом QR-блоке, если стали неиспользуемыми где-то ещё в файле —
НЕ трогать (они наверняка используются в других фазах игры, типа
`topicSelect`/QR на других экранах — проверить перед сборкой, но, скорее
всего, всё ок, т.к. это тот же паттерн что và roleSelect/captainSelect уже
использует общий контекст).

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

## Acceptance

- `npx tsc --noEmit` без новых ошибок (включая проверку неиспользуемых импортов/переменных).
- `npm run lint` без новых warnings/errors.
- Визуально: центральная панель на фазе `teamNames` показывает текст
  «Игроки выбирают название команды...» вместо QR-кода.
- Фазы `roleSelect` и `captainSelect` не изменились (регрессии нет).
- Боковые панели команд (капитан/название/список игроков) не изменились.

## Отчёт

Записать в `codex-reports/364-h2o-tv-teamnames-center-message.md`:
что изменено, diff по строкам, результат tsc/lint.
