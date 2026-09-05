# REPORT TASK-108: lobby-game-start-flow

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-19 21:18
> - **Финиш:** 2026-05-19 21:23
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`handleStartGame` больше не делает локальный `router.push` обратно в lobby. Теперь host отправляет `game:select` и `game:start`, а все клиенты переходят в игру по server event `game:started`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен listener `game:started`; `handleStartGame` заменён на emit-flow `game:select` → `game:start`.

### Новые файлы

- `codex-reports/108-lobby-game-start-flow.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 12 ++++++++++--
1 file changed, 10 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ✅ | Запущен вне sandbox из-за Turbopack port-binding ограничения; exit code 0. В логе остался существующий `ReferenceError: location is not defined` во время static generation, но build завершился успешно |
| Acceptance: `game:select` emit | ✅ | `src/components/lobby/Lobby.tsx:419` |
| Acceptance: `game:start` emit | ✅ | `src/components/lobby/Lobby.tsx:420` |
| Acceptance: `game:started` listener navigates all clients | ✅ | `src/components/lobby/Lobby.tsx:299-304` |
| Acceptance: existing createRoom fallback kept | ✅ | `src/components/lobby/Lobby.tsx:414-415` |

---

## Отклонения от ТЗ

Listener callback принимает `payload: unknown` с локальным cast к `{ gameType: string; roomCode: string }`, потому что текущий `useSocket().on` типизирован как `(...args: unknown[]) => void`. Прямой тип из ТЗ не проходил TypeScript build.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь только два участка: `src/components/lobby/Lobby.tsx:299-304` и `src/components/lobby/Lobby.tsx:411-421`.
- В рабочем дереве уже есть изменения TASK-107 и `.codex/STATUS.md`; я их не редактировал в рамках TASK-108.
