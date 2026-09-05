# REPORT TASK-204: TV-лобби — разгейтить выбор игры

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-03 21:02 PDT
> - **Финиш:** 2026-06-03 21:05 PDT
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TV-лобби теперь всегда может выбрать игру через `game:select`, даже когда телефон уже является host'ом комнаты. Гейт запуска с телефона и остальные проверки `isCurrentUserHost` не менялись.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен производный `canSelectGame = myRole === "tv" || isCurrentUserHost`; `handleStartGame` и проп `HeroLeft.isCurrentUserHost` теперь используют этот флаг.

### Новые файлы

- `codex-reports/204-tv-lobby-game-select-ungate.md` — отчёт по TASK-204.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 144 ++++++++++++-----------------------------
 1 file changed, 42 insertions(+), 102 deletions(-)
```

Примечание: `src/components/lobby/Lobby.tsx` уже был изменён до начала TASK-204. Моя правка в этом файле ограничена строками с `canSelectGame`, гейтом `handleStartGame` и передачей пропа в `HeroLeft`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | 0 ошибок |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `src/app/globals.css` |
| Acceptance #1 | ✅ | `npx tsc --noEmit` прошёл |
| Acceptance #2 | ✅ | `npm run lint` прошёл |
| Acceptance #3 | ✅ | Для `myRole === "tv"` `canSelectGame` всегда `true`, поэтому кнопка `HeroLeft` не показывает состояние ожидания host'а |

---

## Отклонения от ТЗ

Нет отклонений по коду. Дополнительно был запущен `npm run build` по workflow; он упал из-за ограничения окружения/Turbopack, не из-за TypeScript или lint.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь [src/components/lobby/Lobby.tsx](/Users/anastasiaivanova/my-project/src/components/lobby/Lobby.tsx:648): `isCurrentUserHost` оставлен без изменений, новый `canSelectGame` используется только для выбора игры на TV.
- Рабочее дерево до старта уже содержало изменения в запрещённых для Codex файлах (`CLAUDE.md`, `.codex/STATUS.md`) и ряде production-файлов; я их не редактировал и не откатывал.
