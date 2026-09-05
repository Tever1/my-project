# REPORT TASK-320: Alias mobile waiting-экран — убрать карточки команд/игроков

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-01 22:05
> - **Финиш:** 2026-07-01 22:10
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Удалён верхний ряд карточек команд/игроков из mobile waiting-экрана Alias.
Кнопка "Начать ход!" и текст ожидания активного объясняющего оставлены без изменений.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/alias/page.tsx` — удалён блок `Team cards` внутри `gameState?.phase === 'waiting'`.

### Новые файлы

- `codex-reports/320-alias-mobile-waiting-remove-team-cards.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

TASK-320 source diff:

```
 src/app/game/[roomId]/alias/page.tsx | 79 ++++++++++++---------------------
 1 file changed, 29 insertions(+), 50 deletions(-)
```

Полный `git diff --stat` до создания отчёта также показывал ранее существующее изменение в `src/app/tv/[roomId]/[gameType]/page.tsx`, не относящееся к TASK-320:

```
 src/app/game/[roomId]/alias/page.tsx    | 79 ++++++++++++---------------------
 src/app/tv/[roomId]/[gameType]/page.tsx | 12 ++---
 2 files changed, 33 insertions(+), 58 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run lint` | ✅ | чисто |
| `git diff --stat -- 'src/app/game/[roomId]/alias/page.tsx'` | ✅ | TASK-320 source diff только в whitelist-файле |
| Acceptance: карточки команд убраны из mobile waiting | ✅ | стартовая кнопка и ожидание остались |

---

## Отклонения от ТЗ

Нет отклонений по коду TASK-320.

В рабочем дереве до начала задачи уже были незакоммиченные изменения в `src/app/game/[roomId]/alias/page.tsx`, `src/app/tv/[roomId]/[gameType]/page.tsx`, а также untracked task/report файлы TASK-314...320. Я их не откатывал и не редактировал, кроме указанного whitelist-файла и этого отчёта.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить участок `src/app/game/[roomId]/alias/page.tsx` в блоке `WAITING FOR EXPLAINER TO START`: внутри `waiting` должен остаться только тернарник `isExplainer ? button : GlassCard`.
