# TASK-265 — TV Крокодил: одинаковые плитки игроков на waiting-экране

## Контекст

Игровое поле (TV), фаза `waiting` Крокодила. Плитки игроков сейчас разного
размера: у хоста корона добавляется через `ml-2` справа и раздвигает плитку —
она шире остальных. Нужно: все плитки одинакового размера (по самой большой —
той, что с короной), имя по центру.

Файл: `src/app/tv/[roomId]/[gameType]/page.tsx`, блок `crocState.phase === 'waiting'`
(≈ строки 1522–1529).

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — только блок waiting Крокодила
- `codex-reports/265-tv-croc-waiting-equal-tiles.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** другие фазы/игры, CrocIcon, моб-файл, socket-логику, server.mts.

---

## Изменение

Сейчас:

```tsx
<div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
  {players.map(p => (
    <div key={p.id} className="glass-card px-6 py-3">
      <span className="text-xl">{p.nickname}</span>
      {p.isHost && <CrocIcon name="crown" className="ml-2 inline-block h-5 w-5 align-middle" />}
    </div>
  ))}
</div>
```

Стало — каждая плитка резервирует слот короны симметрично с обеих сторон
(`h-5 w-5` слева невидимый + справа корона/пусто), имя по центру. Так все плитки
одинаковой ширины при равной длине имени, а корона больше не раздвигает плитку
хоста:

```tsx
<div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
  {players.map(p => (
    <div key={p.id} className="glass-card flex items-center justify-center gap-2 px-6 py-3">
      <span aria-hidden className="h-5 w-5 flex-shrink-0" />
      <span className="text-xl">{p.nickname}</span>
      <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {p.isHost && <CrocIcon name="crown" className="h-5 w-5" />}
      </span>
    </div>
  ))}
</div>
```

## Acceptance

- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- На waiting-экране TV Крокодила плитки с короной и без визуально одинаковой
  ширины (при равной длине имени), корона не раздвигает плитку хоста.
- Другие фазы/игры не затронуты.
- НЕ коммитить. Отчёт → `codex-reports/265-tv-croc-waiting-equal-tiles.md`.
