# REPORT TASK-349: TV «100 к 1» — Большая игра использует не ту тему вопросов

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-14 21:43
> - **Финиш:** 2026-07-14 21:45
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TV-экран «100 к 1» теперь резолвит вопросы Большой игры по выбранной теме комнаты через `h.topicId`. Big Game больше не мапит жёстко общий `H2O_BIG_Q`, но импорт оставлен как fallback.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен `activeBigQ` по тому же паттерну, что `activeRounds`; Big Game `.map(...)` переключён на `activeBigQ`.

### Новые файлы

- `codex-reports/349-h2o-tv-biggame-topic-aware-questions.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/design-tokens/page.tsx          | 125 ++++++++++++++++++++++++++++++++
 src/app/tv/[roomId]/[gameType]/page.tsx | 101 ++++++++++++++++----------
 2 files changed, 188 insertions(+), 38 deletions(-)
```

Примечание: `src/app/design-tokens/page.tsx` и большая часть diff в TV-файле уже были в рабочем дереве до TASK-349. В рамках этой задачи добавлены только `activeBigQ` и замена `H2O_BIG_Q.map(...)` на `activeBigQ.map(...)`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Прошёл |
| `npx tsc --noEmit` | ✅ | Прошёл |
| Acceptance #1 | ✅ | `activeBigQ` резолвится через `H2O_TOPICS.find(t => t.id === h.topicId)?.bigQ ?? H2O_BIG_Q` |
| Acceptance #2 | ✅ | Big Game использует `activeBigQ.map(...)` |
| Acceptance #3 | ✅ | Мобильный экран `hundred-to-one/page.tsx` не трогал |

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

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx` в блоке `gameType === 'hundred-to-one'`: рядом с `activeRounds` теперь есть `activeBigQ`, а Big Game questions list использует именно его.
