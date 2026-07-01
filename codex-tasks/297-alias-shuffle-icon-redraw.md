# TASK-297 — Alias: перерисовать иконку «Случайно» (shuffle) ровными стрелками

## Контекст
Иконка shuffle («Случайно») в превью Alias выглядит криво — стрелки неровные.
Заменяем на канонический симметричный shuffle (стиль Lucide): две ровные
пересекающиеся линии + две стрелки справа на одной вертикали (x=22, y=6 и y=18),
обе смотрят вправо. Меняем ТОЛЬКО shuffle, в двух местах.

## Файл 1 — `src/components/games/AliasIcon.tsx`
В записи `shuffle:` заменить три `<path>` (сейчас):
```
      <path d="M3 8h3.4c1.3 0 2.5.6 3.3 1.7l4.6 5.6c.8 1.1 2 1.7 3.3 1.7H21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3 16h3.4c1.3 0 2.5-.6 3.3-1.7l.8-1M13.2 9.3l.8-1c.8-1.1 2-1.7 3.3-1.7H21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M18 5l3 3-3 3M18 13l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
```
на (пять path):
```
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 2l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
```

## Файл 2 — `src/app/design-tokens/page.tsx`
В рендерере `AlShuffle` заменить те же три `<path>` (отступ 4 пробела) на те же
пять `<path>` (отступ 4 пробела):
```
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 2l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 14l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
```

Больше ничего не менять — только эти два блока shuffle.

## Whitelist (только эти файлы)
- `src/components/games/AliasIcon.tsx`
- `src/app/design-tokens/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: `alias/page.tsx`, TV, globals.css, прочие иконки, `CLAUDE.md`,
`AGENTS.md`, `.codex/**`, `codex-tasks/**`. **`npm run build` НЕ запускать**
(Turbopack EPERM в sandbox — ложное падение). Достаточно tsc + lint.

## Acceptance
- Иконка «Случайно» на `/design-tokens` — ровный симметричный shuffle с двумя
  стрелками справа.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/297-alias-shuffle-icon-redraw.md`. Не коммитить.
