# REPORT TASK-113: fix-single-player-grace-period

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-20 20:35
> - **Финиш:** 2026-05-20 20:37
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `handleDisconnect` убрано немедленное удаление последнего игрока при unexpected disconnect. Теперь immediate delete остаётся только для explicit leave, а одиночный игрок тоже проходит через grace period.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — условие `if (explicit || room.players.size === 1)` заменено на `if (explicit)`.

### Новые файлы

- `codex-reports/113-fix-single-player-grace-period.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Before/After Diff

Before:

```ts
if (explicit || room.players.size === 1) {
```

After:

```ts
if (explicit) {
```

---

## Diff stat

```
src/server/socket-handlers.mts | 10 ++++++++--
1 file changed, 8 insertions(+), 2 deletions(-)
```

Примечание: stat по файлу также включает незакоммиченные изменения TASK-112 и TASK-111 в этом же файле. Изменение TASK-113 — одна строка: условие на `src/server/socket-handlers.mts:386`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | TypeScript прошёл без ошибок |
| Acceptance: no `room.players.size === 1` condition | ✅ | `rg` показывает только `if (explicit)` и `300000` timeout |

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

- Проверить `src/server/socket-handlers.mts:386`: immediate delete path теперь только `if (explicit)`.
- Timeout `300000` не менялся.
