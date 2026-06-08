# REPORT TASK-217: useGameIdentity + Crocodile guest game-host

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-07 22:05
> - **Финиш:** 2026-06-07 22:15
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан общий хук `useGameIdentity(roomId)` с гибридной идентичностью аккаунта/гостя, reconnect-логикой и чтением `gameHostPlayerId` из `room:state`. Экран Крокодила переведён на `isGameHost` и `effectivePlayerId`, поэтому guest game-host получает игровые кнопки и остаётся source of truth на клиенте.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/crocodile/page.tsx` — удалён старый room-host gate через `user?.id === hostId`; игровые действия, таймер, request-state, start/end и JSX теперь используют `isGameHost`; explainer определяется через `effectivePlayerId`.

### Новые файлы

- `src/lib/use-game-identity.ts` — новый переиспользуемый хук для user/guest identity, reconnect и `gameHostPlayerId`.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/crocodile/page.tsx | 60 ++++++++++++++++----------------
1 file changed, 30 insertions(+), 30 deletions(-)

/dev/null => src/lib/use-game-identity.ts | 88 +++++++++++++++++++++++++++++++
1 file changed, 88 insertions(+)
```

Примечание: в рабочем дереве до/во время задачи также видны `.codex/STATUS.md` и untracked `codex-tasks/217-crocodile-guest-game-host.md`. Я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance #1 | ✅ | lint чистый |
| Acceptance #2 | ✅ | tsc чистый |
| Acceptance #3 | ✅ | `src/lib/use-game-identity.ts` создан с требуемой сигнатурой |
| Acceptance #4 | ✅ | в `crocodile/page.tsx` нет `user?.id === hostId`, `hostId`, `myId`, `isHost` для игровых гейтов |
| Acceptance #5 | ✅ | `isExplainer = effectivePlayerId === gameState?.explainerId` |
| Acceptance #6 | ✅ | для залогиненного ведущего identity остаётся `user.id`, поведение не меняется |

---

## Отклонения от ТЗ

Нет отклонений по production-коду. Сервер и квиз не трогал.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Посмотреть `src/lib/use-game-identity.ts`: reconnect-эффекты и guest nickname recovery перенесены из квиза без серверных изменений.
- Посмотреть `src/app/game/[roomId]/crocodile/page.tsx`: `gameHostPlayerId` сохраняется в ref вместе с `isGameHost`, чтобы контракт хука был явно использован, а stale host ref для `croc:request-state` обновлялся на каждом рендере.
