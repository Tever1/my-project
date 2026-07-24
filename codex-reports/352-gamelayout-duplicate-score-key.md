# REPORT TASK-352: GameLayout duplicate score key

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-14 22:06
> - **Финиш:** 2026-07-14 22:08
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлен дубликат React key в скорборде `GameLayout`: ключ теперь включает индекс записи и имя. Порядок и визуал скорборда не менялись.

---

## Что сделано

### Изменённые файлы

- `src/components/games/GameLayout.tsx` — в `scores.map()` добавлен параметр `idx`, ключ элемента заменён с `entry.name` на `${idx}-${entry.name}`.

### Новые файлы

- `codex-reports/352-gamelayout-duplicate-score-key.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/games/GameLayout.tsx | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без вывода |
| `npm run lint` | ✅ | eslint clean |
| Acceptance #1 | ✅ | ключ уникален при одинаковых `entry.name`, так как включает `idx` |
| Acceptance #2 | ✅ | порядок и визуал скорборда не изменялись |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить [GameLayout.tsx](/Users/anastasiaivanova/my-project/src/components/games/GameLayout.tsx:91): изменение ровно в `scores.map()` и `key`.
