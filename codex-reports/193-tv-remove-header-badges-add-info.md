# REPORT TASK-193: Игровое поле (TV) — убрать дубль плашек в шапке + добавить инфо вопросов/игроков

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 22:36
> - **Финиш:** 2026-05-31 22:38
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Удалил дублирующие quiz-бейджи из top bar TV-экрана. Добавил в waiting-фазу TV информацию о количестве вопросов и игроков, как на мобильном экране.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — убран блок header-бейджей после `gameTitle`; добавлен waiting-блок с `quizState.totalQuestions` и `totalPlayers`.

### Новые файлы

- `codex-reports/193-tv-remove-header-badges-add-info.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/app/tv/[roomId]/[gameType]/page.tsx | 38 ++++++++------------------------------
 1 file changed, 12 insertions(+), 26 deletions(-)
```

Примечание: до начала работы в дереве уже были чужие изменения в `.claude/launch.json`, `.codex/STATUS.md`, `CLAUDE.md` и наборе `codex-tasks`/`codex-reports`; я их не трогал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл чисто |
| `npm run build` | ❌ | Turbopack упал из-за ограничения sandbox: `creating new process` / `binding to a port` / `Operation not permitted` |
| Acceptance #1 | ✅ | В шапке TV больше нет бейджей сложности/темы |
| Acceptance #2 | ✅ | В waiting-фазе добавлены строки про вопросы и игроков |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` был запущен по workflow проекта, но не прошёл из-за ограничения окружения, не из-за TypeScript/React ошибки.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx`: header теперь содержит только иконку игры и `gameTitle`, а центральные бейджи не изменены.
