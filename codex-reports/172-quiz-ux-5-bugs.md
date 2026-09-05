# REPORT TASK-172: Quiz — 5 UX багов (TV + мобилка)

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 19:00
> - **Финиш:** 2026-05-30 19:07
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлены 5 UX-багов квиза: TV теперь рендерит промежуточную таблицу, мобильный экран завершения возвращает в lobby, а экран вопроса на телефоне стал компактнее. `npm run lint` прошёл, `npm run build` заблокирован sandbox-ограничением Turbopack (`Operation not permitted` при binding to a port).

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен render-блок `mid-leaderboard` между вопросом и финальной таблицей, используется существующий `scoreboard`.
- `src/app/game/[roomId]/quiz/page.tsx` — навигация после `game:end` и hook `useNavigateOnGameEnd` переведены на lobby; удалены ring-таймер и карточка текста вопроса; добавлена горизонтальная timer bar сверху экрана вопроса.

### Новые файлы

- `codex-reports/172-quiz-ux-5-bugs.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 32 ++++++++++++---------------
 src/app/tv/[roomId]/[gameType]/page.tsx | 38 +++++++++++++++++++++++++++++++++
 2 files changed, 52 insertions(+), 18 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npm run build` | ❌ | Turbopack panic: `creating new process` / `binding to a port` / `Operation not permitted (os error 1)` |
| `git diff --check` | ✅ | — |
| Acceptance #1 | ✅ | TV показывает `mid-leaderboard` |
| Acceptance #2 | ✅ | Завершение квиза ведёт в `/lobby/[roomId]` |
| Acceptance #3 | ✅ | Ring-таймер удалён |
| Acceptance #4 | ✅ | Текст вопроса на мобильном экране удалён |
| Acceptance #5 | ✅ | Добавлена горизонтальная timer bar |

---

## Отклонения от ТЗ

Нет отклонений по коду. Проверка `npm run build` не завершилась из-за ограничения окружения, а не из-за диагностированной ошибки TypeScript/Next в изменённых файлах.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Посмотреть `src/app/tv/[roomId]/[gameType]/page.tsx`: блок `mid-leaderboard` вставлен сразу после `QUESTION`, перед `FINAL`.
- Посмотреть `src/app/game/[roomId]/quiz/page.tsx`: мобильный экран вопроса теперь не показывает сам текст вопроса, только прогресс и варианты.
