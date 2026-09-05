# TASK-306 — Join-лобби: корона ведущего жёлтая (как на игровом поле)

## Контекст
В TASK-305 в строке игрока на `/join/[code]` добавлена корона ведущего через
`CrocIcon name="crown"` с цветом `rgba(255,255,255,0.6)` (белёсая). Нужно сделать
её жёлтой — как корона на игровом поле (TV использует золотую 👑).

## Whitelist файлов
- `src/app/join/[code]/page.tsx`
- `codex-reports/306-join-crown-yellow.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, другие файлы.

## Изменение
В рендере короны (компонент `<CrocIcon name="crown" … />`, добавлен в TASK-305,
~строка 405) изменить значение `color` в инлайн-`style` с
`"rgba(255,255,255,0.6)"` на `"#facc15"` (канонный жёлтый палитры проекта,
`--color-game-quiz`). Размеры width/height не трогать.

Больше ничего не менять.

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- Корона ведущего на мобильном лобби жёлтая `#facc15`.
- diff — строго одна строка (значение color) в пределах whitelist.

## Отчёт
`codex-reports/306-join-crown-yellow.md`.
