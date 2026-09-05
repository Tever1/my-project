# TASK-363: TV «100 к 1» — заменить QR-код в центральной панели на этапе captainSelect

## Контекст

В файле `src/app/tv/[roomId]/[gameType]/page.tsx`, в блоке `(h.phase === 'roleSelect' || h.phase === 'captainSelect' || h.phase === 'teamNames')`
(примерно строки 1280-1405), центральная панель (третья колонка в
grid `1fr_460px_1fr`) сейчас рендерится так:

```tsx
{h.phase === 'roleSelect' ? (
  <>
    {/* Ещё выбирают роль / Все выбрали роль ✓ + ведущий */}
  </>
) : (
  <>
    {/* QR-код + номер комнаты + ведущий */}
  </>
)}
```

То есть и на фазе `captainSelect`, и на фазе `teamNames` центральная панель
показывает QR-код для подключения к комнате — хотя все игроки уже
подключены и идёт выбор капитанов. Это не нужно и вводит в заблуждение.

## Что сделать

Для фазы `captainSelect` заменить QR-блок на текстовое сообщение,
СТИЛИСТИЧЕСКИ ИДЕНТИЧНОЕ существующему блоку «Все выбрали роль ✓» (тот же
className `${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`),
с текстом:

```
{l('Команды выбирают капитанов...', 'Teams are choosing captains...')}
```

(это тот же текст, что уже используется на мобильном экране для не-командных
зрителей — см. `src/app/game/[roomId]/hundred-to-one/page.tsx`, строка ~1004:
`{l('Команды выбирают капитанов...', 'Teams are choosing captains...')}`).

Фазу `teamNames` НЕ трогать — там оставить QR-код как есть (эта правка
касается только `captainSelect`).

Изменить тернарник на трёхветочный:

```tsx
{h.phase === 'roleSelect' ? (
  <>
    {/* без изменений — блок "ещё выбирают роль" */}
  </>
) : h.phase === 'captainSelect' ? (
  <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
    {l('Команды выбирают капитанов...', 'Teams are choosing captains...')}
  </div>
) : (
  <>
    {/* без изменений — QR-код блок (для teamNames) */}
  </>
)}
```

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

Не трогать ничего другого: ни мобильный файл, ни `server.mts`, ни другие игры.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- Визуально: центральная панель на фазе `captainSelect` показывает текст
  «Команды выбирают капитанов...» вместо QR-кода. На фазе `teamNames`
  QR-код остаётся как был (регрессии нет).
- Боковые панели команд (капитан/список игроков) не изменились.

## Отчёт

Записать в `codex-reports/363-h2o-tv-captainselect-center-message.md`:
что изменено, diff по строкам, результат tsc/lint.
