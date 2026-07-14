# REPORT TASK-344: use-socket cleanup listener leak

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-13 21:18
> - **Финиш:** 2026-07-13 21:24
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлена утечка обработчиков в `useSocket().on()`: cleanup теперь снимает слушатель с того же socket-инстанса, на который была сделана подписка. Это закрывает StrictMode-сценарий, где `socketRef.current` успевал стать `null` до cleanup зависимых эффектов.

---

## Что сделано

### Изменённые файлы

- `src/lib/use-socket.ts` — `on()` теперь захватывает socket при подписке, возвращает noop cleanup если socket отсутствует, и снимает обработчик с захваченного инстанса.

### Новые файлы

- `codex-reports/344-use-socket-on-cleanup-leak.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/lib/use-socket.ts | 8 ++++++--
 1 file changed, 6 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | ❌ | Turbopack упал на известном ограничении среды: `Operation not permitted` при создании процесса/биндинге порта. |
| `npx next build --webpack` | ✅ | Exit code 0. В выводе есть `ReferenceError: location is not defined` для `/profile/page.js`, но сборка завершилась успешно. |
| Acceptance: cleanup `on()` снимает handler с подписанного socket | ✅ | Инстанс захватывается до `socket.on(...)`; cleanup вызывает `socket.off(...)`. |

---

## Отклонения от ТЗ

Нет отклонений по production-коду. `off()` оставлен с чтением `socketRef.current`, как разрешено в ТЗ.

---

## Открытые вопросы для Claude

- `.codex/STATUS.md` на момент старта показывал активным TASK-343, не TASK-344; файл также уже был modified в git status. Я его не редактировал.
- В рабочем дереве до моей правки уже были изменения/новые файлы по TASK-342/343 и `src/app/game/[roomId]/who-am-i/page.tsx`; я их не трогал.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Live-проверка клика «Да» в dev не выполнялась; по ТЗ её проверит Claude/пользователь.

---

## Подсказки для ревью

- Проверь `src/lib/use-socket.ts`: `on()` теперь не читает `socketRef.current` в cleanup, поэтому StrictMode cleanup ordering больше не пропускает `off()` на singleton socket.
