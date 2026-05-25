# REPORT TASK-136: tv-game-start-navigation

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-24 21:58
> - **Финиш:** 2026-05-24 22:02
> - **Длительность:** ~4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `game:started` listener добавлено разветвление навигации по `myRole`: TV-экран уходит на `/tv/{roomCode}/{gameType}`, player — на `/game/{roomCode}/{gameType}`. Кнопка `window.open('/tv/{roomCode}')` не изменялась.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — обновлён существующий `game:started` listener, добавлен `myRole` в dependency array.

### Новые файлы

- `codex-reports/136-tv-game-start-navigation.md` — отчёт по TASK-136.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/components/lobby/Lobby.tsx | 308 +++++++++++++++++++++++++++++++++++------
 1 file changed, 264 insertions(+), 44 deletions(-)
```

Примечание: stat выше по `Lobby.tsx` включает уже лежащие незакоммиченные изменения TASK-134/135. Собственная правка TASK-136 — только блок `game:started` listener.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox |
| Acceptance: `myRole` в deps | ✅ | `[myRole, on, router]` |
| Acceptance: TV route | ✅ | `router.push(\`/tv/${data.roomCode}/${data.gameType}\`)` |
| Acceptance: player route | ✅ | `router.push(\`/game/${data.roomCode}/${data.gameType}\`)` |
| Acceptance: `window.open('/tv/...')` untouched | ✅ | кнопка открытия TV не менялась |

Примечание по build: внутри sandbox Turbopack снова упал на `binding to a port / Operation not permitted`; вне sandbox сборка прошла. Во время успешной сборки Next по-прежнему выводит `ReferenceError: location is not defined`, но команда завершается с кодом 0.

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить только `game:started` listener: TV должен идти на `/tv/...`, player — на `/game/...`.
- Проверить, что вспомогательная кнопка `window.open(`/tv/${roomCode}`...)` осталась без изменений.
