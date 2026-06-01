# REPORT TASK-185: Quiz config via socket

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 19:40
> - **Финиш:** 2026-05-31 20:00
> - **Длительность:** 20 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Конфиг квиза теперь передаётся из лобби в сервер через `game:select`, хранится на room и приходит клиентам в `game:started`. Страница квиза применяет pre-config на host phone и сразу переводит игру в `waiting`; `localStorage` оставлен только как fallback для прямого открытия/старого сценария.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — добавлен `pendingQuizConfig` в room, сохранение из `game:select`, отправка в `game:started`; также конфиг включён в `room:state` как fallback для навигационного race.
- `src/components/lobby/Lobby.tsx` — убран основной путь через `localStorage`; quiz config сохраняется в state и отправляется в `game:select`.
- `src/app/game/[roomId]/quiz/page.tsx` — добавлен общий helper применения pre-config, listener `game:started` и fallback через `room:state`; host переводится в `waiting` и рассылает `quiz:config`.

### Новые файлы

- `codex-reports/185-quiz-config-via-socket.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx | 113 ++++++++++++++++++++++--------------
 src/components/lobby/Lobby.tsx      |  32 ++++++----
 src/server/socket-handlers.mts      |  22 ++++++-
 3 files changed, 113 insertions(+), 54 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл |
| `npm run build` | ❌ | Turbopack internal error: sandbox запрещает binding to a port при обработке `src/app/globals.css` |
| `npx next build --webpack` | ✅ | TypeScript/build прошли; есть существующий non-fatal `ReferenceError: location is not defined` в `/profile`, exit code 0 |
| `git diff --check` | ✅ | Без whitespace errors |
| Acceptance #1 | ✅ кодом | Host получает config через socket и фаза становится `waiting` |
| Acceptance #2 | ✅ кодом | Остальные игроки получают обычный `quiz:config` через `quiz:action` |

---

## Отклонения от ТЗ

Добавлен fallback через `room:state.pendingQuizConfig`: страница квиза часто монтируется уже после `game:started`, потому одного listener на странице недостаточно для стабильного сценария после router navigation. Это всё ещё socket-путь и не использует `localStorage`.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не проводился ручной браузерный QA, только статические проверки и production build через webpack fallback.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/quiz/page.tsx`: `appliedPreconfigRef` нужен, чтобы `game:started` и `room:state` fallback не применили один и тот же конфиг дважды.
- В рабочем дереве до старта уже были изменения в запрещённых файлах `.codex/STATUS.md` и `CLAUDE.md`; Codex их не редактировал.
