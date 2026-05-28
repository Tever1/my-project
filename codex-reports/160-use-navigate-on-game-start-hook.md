# REPORT TASK-160: useNavigateOnGameStart hook

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 20:42
> - **Финиш:** 2026-05-27 20:47
> - **Длительность:** 5 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Создан общий хук `useNavigateOnGameStart`, и две целевые подписки в `join/[code]` и `Lobby` заменены на него. `npm run lint` и `npx tsc --noEmit` прошли успешно.

Статус partial из-за acceptance grep по `src/app/ src/components/`: в `src/app/tv/[roomId]/page.tsx` уже есть существующая подписка/комментарий с `game:started`, но этот файл не входит в whitelist TASK-160, поэтому он не изменялся.

---

## Что сделано

### Изменённые файлы

- `src/app/join/[code]/page.tsx` — удалена локальная подписка на `game:started`, добавлен вызов `useNavigateOnGameStart`.
- `src/components/lobby/Lobby.tsx` — удалена локальная подписка на `game:started`, добавлен вызов `useNavigateOnGameStart` с TV/player routing и `setIsWaitingForPlayers(false)`.

### Новые файлы

- `src/lib/use-navigate-on-game-start.ts` — общий client hook для стабильной подписки на `game:started` через ref-паттерн.
- `codex-reports/160-use-navigate-on-game-start-hook.md` — отчёт по TASK-160.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/join/[code]/page.tsx   | 13 +++++--------
src/components/lobby/Lobby.tsx | 20 ++++++++------------
2 files changed, 13 insertions(+), 20 deletions(-)
```

Примечание: это вывод `git diff --stat` для tracked-файлов; новые untracked-файлы (`src/lib/use-navigate-on-game-start.ts`, этот отчёт) в нём не отображаются до stage.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -rn "game:started" src/app/ src/components/` | ❌ | Остались существующие совпадения в `src/app/tv/[roomId]/page.tsx:47` и `:131`; файл вне whitelist |
| `grep -n "game:started" src/lib/use-navigate-on-game-start.ts` | ✅ | 1 совпадение: реальная подписка |
| `npm run lint` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |

---

## useRouter в join/[code]/page.tsx

Удалён: после замены прямой навигации на `useNavigateOnGameStart` `router` в `src/app/join/[code]/page.tsx` больше не используется.

---

## Отклонения от ТЗ

- Полный acceptance grep по `src/app/ src/components/` не стал нулевым из-за существующего `src/app/tv/[roomId]/page.tsx`, который не входит в whitelist.
- В комментарии нового hook не оставлено текстовое упоминание `game:started`, чтобы `grep -n "game:started" src/lib/use-navigate-on-game-start.ts` давал ровно 1 совпадение, как указано в acceptance.

---

## Открытые вопросы для Claude

- Нужно ли отдельным follow-up таском вынести существующую подписку из `src/app/tv/[roomId]/page.tsx` или изменить acceptance для TASK-160 под фактический whitelist?

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не изменялся `src/app/tv/[roomId]/page.tsx`, потому что файл вне whitelist TASK-160.

---

## Подсказки для ревью

- Проверь `src/lib/use-navigate-on-game-start.ts`: hook держит latest callbacks в refs и пересоздаёт socket subscription только при изменении `on` или `router`.
- Проверь `src/components/lobby/Lobby.tsx`: `router` сохранён, потому что используется в других местах файла.
