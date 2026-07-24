# REPORT TASK-370: TV «100 к 1» Большая игра — не растягивать карточку вопроса, когда виден только один

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 22:05
> - **Финиш:** 2026-07-20 22:11
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлено растягивание единственной карточки вопроса в TV Большой игре «100 к 1». На фазах ввода одного игрока список центрируется по вертикали, а `flex-1` у карточки применяется только на фазах проверки, где видны все вопросы.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — в блоке Big Game TV:
  - строка 1616: родительский список получает `justify-center` только при `bgPhase === 1 || bgPhase === 3`;
  - строка 1630: `flex-1` у карточки вопроса теперь включается только не на `bgPhase === 1 || bgPhase === 3`.

### Новые файлы

- `codex-reports/370-h2o-tv-biggame-single-question-size-fix.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/tv/[roomId]/[gameType]/page.tsx | 666 +++++++++++++++++++++++---------
1 file changed, 494 insertions(+), 172 deletions(-)
```

Важно: этот stat включает уже существующие незакоммиченные изменения в `src/app/tv/[roomId]/[gameType]/page.tsx` до TASK-370. Фактический diff TASK-370 — две правки className на строках 1616 и 1630.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| Acceptance: `bgPhase === 1 || bgPhase === 3` | ✅ | карточка без `flex-1`, родитель с `justify-center` |
| Acceptance: `bgPhase === 2 || bgPhase === 4` | ✅ | `flex-1` остаётся, список делит высоту как прежде |

---

## Отклонения от ТЗ

Нет отклонений по production-коду. Отчёт создан по прямому требованию TASK-370, хотя whitelist для правки production-файлов указан как один файл.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить [src/app/tv/[roomId]/[gameType]/page.tsx](/Users/anastasiaivanova/my-project/src/app/tv/[roomId]/[gameType]/page.tsx:1616): условный `justify-center`.
- Проверить [src/app/tv/[roomId]/[gameType]/page.tsx](/Users/anastasiaivanova/my-project/src/app/tv/[roomId]/[gameType]/page.tsx:1630): условный `flex-1`.
