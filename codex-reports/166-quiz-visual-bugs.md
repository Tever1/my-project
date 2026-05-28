# REPORT TASK-166: Квиз — фон / отсчёт / дизайн ответов

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 21:45
> - **Финиш:** 2026-05-27 21:55
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлены три визуальных бага квиза: фон теперь грузится через приоритетный `<img>`, мобильный countdown использует `AnimatePresence mode="popLayout"`, TV countdown переведён на тот же Framer Motion паттерн. TV-буквы ответов увеличены с `text-lg` до `text-xl`.

---

## Что сделано

### Изменённые файлы

- `src/components/games/GameLayout.tsx` — убран inline `backgroundImage` с root div; добавлен абсолютный `<img fetchPriority="high">` для фоновой картинки.
- `src/app/game/[roomId]/quiz/page.tsx` — countdown переключён с `mode="wait"` на `mode="popLayout"`, убран `y: -20`, duration сокращён до `0.3`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — quiz TV фон переведён на `<img fetchPriority="high">`; countdown переведён на `motion.div` + `AnimatePresence mode="popLayout"`; буква ответа увеличена до `text-xl`.

### Новые файлы

- `codex-reports/166-quiz-visual-bugs.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Только файлы из whitelist TASK-166:

```text
 src/app/game/[roomId]/quiz/page.tsx     | 28 +++++++++++++++++++++++++---
 src/app/tv/[roomId]/[gameType]/page.tsx | 33 ++++++++++++++++++++++++++++-----
 src/components/games/GameLayout.tsx     | 11 ++++++++++-
 3 files changed, 63 insertions(+), 9 deletions(-)
```

В рабочем дереве до старта уже были unrelated изменения в `src/app/game/[roomId]/quiz/page.tsx`, `src/server/socket-handlers.mts` и файлы TASK-167/166 в `codex-tasks/`. Их не откатывал и не редактировал вне нужных строк.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -n "backgroundImage" src/components/games/GameLayout.tsx` | ✅ | Нет совпадений |
| `grep -n "backgroundImage" src/app/tv/[roomId]/[gameType]/page.tsx` | ✅ | Нет совпадений |
| `grep -n "mode.*popLayout\|popLayout" src/app/game/[roomId]/quiz/page.tsx` | ✅ | `1028:<AnimatePresence mode="popLayout">` |
| `grep -n "motion\.div\|AnimatePresence" src/app/tv/[roomId]/[gameType]/page.tsx` | ✅ | import + countdown block lines `588-603` |
| `npm run lint` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process - binding to a port - Operation not permitted (os error 1)` |

---

## Отклонения от ТЗ

Нет отклонений по acceptance. Дополнительно запускал `npm run build` по project workflow; он упал из-за ограничения sandbox/Turbopack, не из-за TypeScript или lint.

---

## Открытые вопросы для Claude

- В `.codex/STATUS.md` есть старый активный TASK-107, который тоже лочит `GameLayout.tsx` и `quiz/page.tsx`. Текущий TASK-166 был выдан пользователем напрямую, поэтому я продолжил, но это стоит учесть при ревью.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Ничего по TASK-166.

---

## Подсказки для ревью

- Посмотреть, что фоновые `<img>` в `GameLayout.tsx` и TV-quiz стоят сразу внутри relative root div и имеют `fetchPriority="high"`.
- В `quiz/page.tsx` уже были unrelated изменения TASK-167; мой смысловой change в этом файле только в countdown-блоке.
