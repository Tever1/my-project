# TASK-358: «100 к 1» TV — список неопределившихся в 2 колонки + статус ведущего снизу

**Тип:** simple (1 файл, JSX-правка одного блока)
**Whitelist:** `src/app/tv/[roomId]/[gameType]/page.tsx` (только блок `gameType === 'hundred-to-one'`)

## Контекст

TASK-357 заменил QR-код в центральной карточке на список
`h2oUnassignedPlayers` (игроки без роли) во время `h.phase === 'roleSelect'`
(текущий код — около строки 1324-1342, JSX внутри `h.phase === 'roleSelect'
? (...)`). Два замечания от пользователя:

1. Максимум игроков в комнате «100 к 1» — 13 человек. Список
   неопределившихся нужно **разбить на 2 колонки** (а не один вертикальный
   список) — так все 13 помещаются без скролла: одна колонка ~6 человек,
   другая ~7 (примерно поровну, не хардкодить точное число 6/7 — просто
   раздели список пополам, например первая половина
   `Math.ceil(n/2)` в левую колонку, остаток — в правую).
2. **Ведущего убрали зря.** Раньше (до TASK-357) под QR-кодом всегда была
   строка с аватаром/именем ведущего (стиль — см. старый код в этом же
   файле в ветке `else` этого тернарника, строки ~1345-1355: `PlayerAvatar`
   + имя + подпись «Ведущий» + иконка микрофона). Нужно вернуть такую же
   строку **внизу** центральной карточки и для `roleSelect` тоже — показывай
   `h2oHost` (уже корректно `undefined`, если роль ещё не выбрана, без
   старого бага-фоллбэка на room-host, см. TASK-355 п.2). Если `h2oHost`
   пока не выбран — покажи ту же строку с приглушённым/дефолтным видом
   (например `nickname` → `l('не выбран', 'not chosen')` вместо пустого
   аватара, тем же стилем ряда, не отдельным новым компонентом).

## Что сделать

Внутри ветки `h.phase === 'roleSelect'` (текущий JSX):
```tsx
{h2oUnassignedPlayers.length > 0 ? (
  <div className="flex min-h-0 w-full flex-1 flex-col gap-[14px] overflow-y-auto pr-1">
    {h2oUnassignedPlayers.map((p) => (
      <div key={p.id} className={`${H2O_TV_GLASS} flex items-center gap-3 rounded-full py-[9px] pl-[9px] pr-4`}>
        <PlayerAvatar nickname={p.nickname} sizePx={46} />
        <span className="min-w-0 truncate text-[22px] font-bold tracking-[-.3px]">{p.nickname}</span>
      </div>
    ))}
  </div>
) : (
  ...
)}
```
Замени вертикальный список на 2-колоночный грид (например `grid grid-cols-2
gap-x-3 gap-y-[10px]`), разделив `h2oUnassignedPlayers` на две примерно
равные половины (`Math.ceil(h2oUnassignedPlayers.length / 2)` элементов в
первую колонку). Каждая карточка игрока — тот же стиль пилюли, что уже есть
(`PlayerAvatar` + никнейм), можно чуть уменьшить `sizePx`/шрифт при
необходимости, чтобы влезло в более узкую колонку — сохрани читаемость.

После списка (или блока «Все выбрали роль ✓», если список пуст) добавь
внизу карточки строку статуса ведущего — `mt-auto`, тот же визуальный стиль,
что в ветке `else`:
```tsx
<div className={`${H2O_TV_GLASS} mt-auto flex items-center gap-3 rounded-full py-[10px] pl-[10px] pr-[22px]`}>
  <PlayerAvatar nickname={h2oHost?.nickname || l('не выбран', 'not chosen')} sizePx={44} />
  <div className="flex flex-col gap-0.5">
    <span className="text-[21px] font-bold">{h2oHost?.nickname || l('не выбран', 'not chosen')}</span>
    <small className="font-mono text-[12px] uppercase tracking-[2px] text-white/40">{l('Ведущий', 'Host')}</small>
  </div>
  <HundredToOneIcon name="mic" className="h-[22px] w-[22px] text-amber-200" />
</div>
```
(адаптируй под реальные локализованные строки в файле, не дублируй
хардкод — используй тот же `l()`-паттерн, что и остальной файл).

## Заодно (мелочь)

В конце этого тернарника (после ветки `else`, строки ~1358-1360) есть 3
строки с случайно затесавшимися табами вместо пробелов (`</>`, `)}`,
`</div>`) — раз всё равно трогаешь этот блок, поправь отступы на пробельные,
консистентные с остальным файлом.

## Что НЕ трогать

- Ветку `else` (QR для `captainSelect`/`teamNames`) — без изменений.
- Логику `h2oUnassignedPlayers`/`h2oHost` — они уже верные с TASK-355/357.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` — чисто.
- В `roleSelect`: неопределившиеся показаны в 2 колонках.
- В `roleSelect`: внизу карточки всегда виден статус ведущего (имя, если
  выбран; плейсхолдер «не выбран», если нет).
- НЕ коммитить. Отчёт в
  `codex-reports/358-h2o-roleselect-two-columns-plus-host.md`.
