# TASK-361: «100 к 1» mobile — переименовать кнопку «сменить атаку» → «сменить команду»

**Тип:** simple (1 файл, 1 строка, текст)
**Whitelist:** `src/app/game/[roomId]/hundred-to-one/page.tsx`

## Что сделать

Строка ~1271 (кнопка ручного выбора атакующей команды, вид ведущего в
`playing`-фазе):
```tsx
{l('сменить атаку', 'change attack')}
```
Заменить текст на `l('сменить команду', 'change team')`. Саму механику
(`setTeamChooser(true)`/`chooseTeam`/модалка выбора команды) НЕ трогать —
только текст кнопки.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` — чисто.
- Кнопка называется «сменить команду» / «change team», функциональность не
  изменилась.
- НЕ коммитить. Отчёт в
  `codex-reports/361-h2o-rename-change-attack-button.md`.
