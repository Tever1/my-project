# REPORT TASK-145: fix start and quiz tiles

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-25 20:32
> - **Финиш:** 2026-05-25 20:36
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На QR waiting screen кнопка «НАЧАТЬ ИГРУ» теперь видна сразу, без ожидания игроков. Flow выбора квиза заменён на полноэкранный плиточный экран: общие квизы открывают настройку сложности/темы, спецквизы сразу сохраняют config и запускают QR flow.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — убрано условие `gamePlayers.length > 0` вокруг start-кнопки, добавлены `quizSelectionOpen`/`quizGeneralConfigOpen`, `QuizSelectionScreen`, плитки спецквизов и общий overlay с кнопкой «ВЫБРАТЬ».

### Новые файлы

- `codex-reports/145-fix-start-and-quiz-tiles.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx |  67 ++++
 src/components/lobby/Lobby.tsx      | 639 ++++++++++++++++++++++++++++++++++--
 2 files changed, 680 insertions(+), 26 deletions(-)
```

Примечание: общий stat включает незакоммиченный `quiz/page.tsx` от TASK-144. В рамках TASK-145 редактировался только `src/components/lobby/Lobby.tsx`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npx tsc --noEmit` | ✅ | TypeScript без ошибок |
| `npm run build` | ⚪ | Не запускался: в acceptance указан lint |
| Acceptance #1 | ✅ | Start-кнопка на QR waiting screen больше не зависит от игроков |
| Acceptance #2 | ✅ | «Выбрать квиз» открывает full-screen плиточную сетку |
| Acceptance #3 | ✅ | «Общие квизы» открывает настройку, «ВЫБРАТЬ» запускает QR flow |
| Acceptance #4 | ✅ | Special tiles сразу сохраняют config и запускают QR flow |
| Acceptance #5 | ✅ | «← Назад» закрывает плиточный экран |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверь, что `QuizConfigOverlay` теперь используется только для общих квизов и его confirm-кнопка называется «ВЫБРАТЬ».
- Проверь, что `QuizSelectionScreen` находится выше основного лобби через `position: fixed; inset: 0; zIndex: 20`.
