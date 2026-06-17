# TASK-246 — Spy peek-bar уже на 20%

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, `globals.css`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать. НЕ запускать `npm run build`.
- Валидация: `npm run lint` + `npx tsc --noEmit`. codex-reports не трогать.

## Правка
Функция `renderPeekBar()`, внешний div (~строка 799). Сейчас:
```
className="glass-card w-full px-4 py-2 select-none border-teal-400/20"
```
Сделать на 80% ширины (уже на 20%), по центру:
```
className="glass-card mx-auto w-4/5 px-4 py-2 select-none border-teal-400/20"
```
(`w-full` → `mx-auto w-4/5`.) Проп `style={{ transform: 'none' }}` и внутренний
`min-h-[44px]` НЕ трогать — карточка не должна менять размер при нажатии.

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- peek-bar 80% ширины по центру, при нажатии размер не меняется.
