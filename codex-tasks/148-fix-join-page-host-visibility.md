# TASK-148: Показывать хоста на экране подключения /join/[code]

## Whitelist файлов
- `src/app/join/[code]/page.tsx`

---

## Проблема

В компоненте `JoinPage` фильтр `visiblePlayers` скрывает хоста (role='tv'):

```tsx
// БЫЛО (строка 113):
const visiblePlayers = roomState?.players.filter((player) => player.role !== "tv") ?? [];
```

Хост должен отображаться в списке игроков.

## Изменение

Убрать условие `player.role !== "tv"`:

```tsx
// СТАЛО:
const visiblePlayers = roomState?.players ?? [];
```

Строка `gameHostPlayer` (114) использует `visiblePlayers.find(...)` — она продолжит работать корректно, т.к. хост теперь есть в `visiblePlayers`.

---

## Acceptance
1. Хост (TV-роль) отображается в списке игроков на странице `/join/[code]`
2. У хоста виден значок "ведущий" (логика уже есть: `roomState?.gameHostPlayerId === player.id`)
3. `npm run lint` без ошибок

## Не трогать
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
- Всё остальное вне `JoinPage`
