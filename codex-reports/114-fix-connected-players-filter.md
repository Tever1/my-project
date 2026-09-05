# REPORT TASK-114: fix-connected-players-filter

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-20 20:46
> - **Финиш:** 2026-05-20 20:48
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `connectedPlayers` убран фильтр по `isConnected`. Теперь disconnected игроки остаются в списке и могут отображаться grayscale через уже существующий `away={!player.isConnected || player.isAway}`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — фильтр `connectedPlayers` оставляет только проверку `p.nickname`.

### Новые файлы

- `codex-reports/114-fix-connected-players-filter.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Before/After Diff

Before:

```tsx
const connectedPlayers = (roomState?.players ?? []).filter(
  (p) => p.isConnected !== false && p.nickname
);
```

After:

```tsx
const connectedPlayers = (roomState?.players ?? []).filter(
  (p) => p.nickname
);
```

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 7 +++++--
1 file changed, 5 insertions(+), 2 deletions(-)
```

Примечание: stat по `Lobby.tsx` также включает незакоммиченный TASK-112 effect в этом же файле. Изменение TASK-114 — строка фильтра `src/components/lobby/Lobby.tsx:1936`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | TypeScript прошёл без ошибок |
| Acceptance: no `isConnected` filter | ✅ | `rg` не находит `isConnected !== false` в `Lobby.tsx` |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx:1935-1937`.
