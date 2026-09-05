# REPORT TASK-179: Quiz — фриз при выходе в лобби, фон при выборе, плашка, плавный таймер

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 21:40
> - **Финиш:** 2026-05-30 21:46
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделаны все 4 точечных фикса из TASK-179: выход из setup квиза теперь идёт через `confirmEndGame`, фон special theme больше не подставляется до выбора конкретного квиза, карточки выбора квиза корректно переносят длинное название, мобильный таймер переведён на CSS transition.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — заменён `onClick` кнопки «В лобби» на `confirmEndGame`, убран fallback `specialThemeInfo.backgroundUrl`, добавлены `min-w-0`/`break-words` для плашки выбора квиза, timer bar заменён с `motion.div` на обычный `div` с CSS transition.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — убран fallback `specialThemeInfo.backgroundUrl` из quiz TV background chain.

### Новые файлы

- `codex-reports/179-quiz-setup-bg-timer-fixes.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 15 +++++++--------
 src/app/tv/[roomId]/[gameType]/page.tsx |  2 +-
 2 files changed, 8 insertions(+), 9 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted` |
| Acceptance #1 | ✅ | setup-кнопка «В лобби» вызывает `confirmEndGame` |
| Acceptance #2 | ✅ | `specialThemeInfo.backgroundUrl` удалён из обеих цепочек `backgroundUrl` |
| Acceptance #3 | ✅ | Добавлены `min-w-0`, `flex-shrink-0`, `break-words` |
| Acceptance #4 | ✅ | Мобильная полоса таймера использует `transition-all duration-1000 ease-linear` |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` дополнительно запускался по проектному workflow, но не прошёл из-за ограничения окружения/Turbopack, не из-за TypeScript или lint.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- В рабочем дереве до старта уже были изменения в запрещённых для Codex файлах `.codex/STATUS.md` и `CLAUDE.md`; я их не редактировал и не откатывал.
