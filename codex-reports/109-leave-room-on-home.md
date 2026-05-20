# REPORT TASK-109: leave-room-on-home

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-19 21:44
> - **Финиш:** 2026-05-19 21:47
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `Lobby.tsx` добавлен auto-leave effect: при mount/reconnect на `/` компонент отправляет `room:leave`, а на `/lobby/[code]` ничего не отправляет. Auto-rejoin effect для `initialCode` оставлен без изменений.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — после auto-join effect добавлен `useEffect` с guard `isRoomRoute || !isConnected` и fire-and-forget `emit('room:leave', {})`.

### Новые файлы

- `codex-reports/109-leave-room-on-home.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 5 +++++
1 file changed, 5 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ✅ | Запущен вне sandbox из-за Turbopack port-binding ограничения; exit code 0. В логе остался существующий `ReferenceError: location is not defined` во время static generation, но build завершился успешно |
| Acceptance: emit on `/` after socket connects | ✅ | `src/components/lobby/Lobby.tsx:272-275` |
| Acceptance: no emit on `/lobby/[code]` | ✅ | Guard `if (isRoomRoute || !isConnected) return` |
| Acceptance: auto-rejoin untouched | ✅ | Existing `initialCode` effect above новой вставки не менялся |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/components/lobby/Lobby.tsx:272-275`; это единственная вставка TASK-109.
- В рабочем дереве уже был изменён `.codex/STATUS.md`; я его не редактировал.
