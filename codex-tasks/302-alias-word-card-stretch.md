# TASK-302 — Alias: розовая карточка слова растягивается на всю высоту (место под кнопки)

## Контекст
В explaining-фазе мобильного Alias розовая карточка (`alias-card`) сейчас
фиксированной высоты, под ней пустое тёмное пространство. Нужно растянуть её на
всю доступную высоту (как карточка слова у Крокодила: `flex-1` + центрирование
содержимого), оставив место под кнопками «Угадали»/«Пропустить» (они и так идут
последним flex-элементом в колонке, отступ сохранится за счёт `gap-4`).

## Что сделать — файл `src/app/game/[roomId]/alias/page.tsx`
В explaining-фазе ТРИ карточки слова имеют одинаковый className (стр. 907, 927, 949):
```
<GlassCard className="alias-card w-full max-w-md p-8 text-center">
```
Заменить ВСЕ ТРИ на:
```
<GlassCard className="alias-card w-full max-w-md flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center">
```
(`flex-1 min-h-0` — растягивает карточку; `flex flex-col items-center justify-center`
— центрирует содержимое по вертикали и горизонтали.)

Больше ничего не менять. Контейнер explaining-фазы (`flex-1 flex flex-col
items-center gap-4`) и кнопки не трогать — карточка вырастет и оставит место под
кнопки автоматически.

## Whitelist (только эти файлы)
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: globals.css, TV, другие карточки/фазы, `CLAUDE.md`, `AGENTS.md`,
`.codex/**`, `codex-tasks/**`. **`npm run build` НЕ запускать** — tsc + lint достаточно.

## Acceptance
- Розовая карточка слова в explaining занимает всю высоту между плитками счёта и
  кнопками; содержимое (буква/слово/иконка) по центру.
- Кнопки «Угадали»/«Пропустить» остаются внизу с отступом.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/302-alias-word-card-stretch.md`. Не коммитить.
