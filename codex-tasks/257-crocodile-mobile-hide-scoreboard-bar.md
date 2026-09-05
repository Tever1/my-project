# TASK-257 — Крокодил (мобильный): убрать верхнюю полосу игроков/очков на итогах

## Проблема
На экране итогов (`phase === 'finished'`) на мобильном GameLayout рендерит сверху
полосу-скорборд (игроки + очки) из-за пропа `showScoreboard`. Пользователь хочет
убрать эту полосу с мобильного. (Таблица очков есть на TV — игровом поле.)

## Whitelist (ТОЛЬКО это)
- `src/app/game/[roomId]/crocodile/page.tsx`

ЗАПРЕЩЕНО трогать `GameLayout.tsx`, TV-файл, прочее. Минимальный diff.

## Правка
В `<GameLayout ...>` (мобильный Крокодил) заменить:
```
showScoreboard={gameState?.phase === 'finished'}
```
на:
```
showScoreboard={false}
```
(полоса больше не показывается ни в одной фазе). Проп `scores={layoutScores}`
можно оставить как есть — без `showScoreboard` он не рендерится. Больше ничего не
менять.

## Acceptance
- `npm run lint` ✅, `npx tsc --noEmit` ✅. НЕ запускать build.
- Только crocodile/page.tsx.
- На мобильном на экране итогов нет верхней полосы с игроками/очками.

## Отчёт
`codex-reports/257-crocodile-mobile-hide-scoreboard-bar.md` (писать разрешено). Не коммитить.
