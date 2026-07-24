# TASK-357: «100 к 1» TV — во время выбора роли показывать неопределившихся игроков вместо QR

**Тип:** simple (1 файл, JSX-правка одного блока)
**Whitelist:** `src/app/tv/[roomId]/[gameType]/page.tsx` (только блок `gameType === 'hundred-to-one'`)

## Контекст

TV-экран подготовки (`h.phase === 'roleSelect' || 'captainSelect' ||
'teamNames'`) — грид из 3 колонок: команда 1 | центр | команда 2. Центральная
колонка (около строки 1319-1332) сейчас ВСЕГДА показывает QR-код + код
комнаты + строку ведущего:
```tsx
<div className={`${H2O_TV_GLASS_STRONG} flex flex-col items-center gap-[22px] rounded-[var(--radius-2xl)] px-[30px] py-[34px]`}>
  <div className="text-center font-mono text-[14px] uppercase tracking-[3px] text-white/40">Сканируй, чтобы присоединиться</div>
  <div className="h-[220px] w-[220px] rounded-[var(--radius-lg)] bg-[#fffbeb] p-[14px] shadow-[...]">
    <QRCodeCanvas value={joinUrl} size={192} />
  </div>
  <div className="font-mono text-[42px] font-bold tracking-[12px] text-amber-200">{roomId}</div>
  <div className={`${H2O_TV_GLASS} mt-auto flex items-center gap-3 rounded-full py-[10px] pl-[10px] pr-[22px]`}>
    <PlayerAvatar nickname={h2oHost?.nickname || '—'} sizePx={44} />
    ...Ведущий...
  </div>
</div>
```

## Что сделать

**Только для `h.phase === 'roleSelect'`** (выбор роли/команды) заменить
содержимое этой центральной карточки: вместо QR-кода/кода комнаты показать
список игроков, которые уже в комнате, но ЕЩЁ НЕ выбрали себе роль
(`h.roles[p.id]` отсутствует/falsy). Список считать так:
```ts
const unassigned = h2oPlayers.filter((p) => !h.roles[p.id]);
```
Заголовок карточки — что-то вроде «Ещё выбирают роль» (по аналогии со
стилем заголовка «Сканируй, чтобы присоединиться» — тот же `font-mono
text-[14px] uppercase tracking-[3px] text-white/40`). Ниже — список игроков
в том же визуальном стиле, что уже используется для игроков команд (строка
~1312: `${H2O_TV_GLASS} flex items-center gap-3 rounded-full py-[9px] pl-[9px]
pr-4`, `<PlayerAvatar>` + никнейм), без короны/капитанской подсветки. Если
список пуст (все выбрали роли) — покажи короткое «Все выбрали роль ✓» вместо
пустой карточки. Если игроков много и список не влезает — оберни в
проскроллируемый/гибкий контейнер (`flex-1 overflow-y-auto` или похожий
паттерн, уже используемый в файле для длинных списков игроков) — не дай
списку вылезти за пределы карточки/экрана.

**Для `captainSelect` и `teamNames`** оставить текущее поведение (QR + код
комнаты + ведущий) без изменений — на этих этапах все, кто хотел, уже
присоединились.

Локализация: заголовок и «Все выбрали роль» — через `l(ru, en)`.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` — чисто.
- В фазе `roleSelect` центр TV-экрана показывает список игроков без роли (по
  никнейму, с аватаром), не QR.
- В фазах `captainSelect`/`teamNames` центр без изменений — QR-код как был.
- НЕ коммитить. Отчёт в
  `codex-reports/357-h2o-roleselect-unassigned-players-instead-qr.md`.
