# REPORT TASK-156: Вынести post-game навигацию в общий хук

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 20:05 PDT
> - **Финиш:** 2026-05-27 20:19 PDT
> - **Длительность:** 14 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан общий хук `useNavigateOnGameEnd(roomId)` для телефонной навигации после завершения игры. Все 7 игровых страниц теперь используют этот хук, inline-подписки на `game:ended` из игровых страниц удалены.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — добавлен импорт и вызов `useNavigateOnGameEnd(roomId)` на строках 9/94; удалена inline-подписка `unsub3` и cleanup `unsub3()`. `useRouter` оставлен, потому что используется для `router.push('/')` при failed reconnect и для кнопки возврата в lobby.
- `src/app/game/[roomId]/spy/page.tsx` — добавлен импорт и вызов хука на строках 7/164; удалены `useRouter`, `router`, `u3` и cleanup `u3()`.
- `src/app/game/[roomId]/alias/page.tsx` — добавлен импорт и вызов хука на строках 9/84; удалены `useRouter`, `router`, `unsub2` и cleanup `unsub2()`.
- `src/app/game/[roomId]/crocodile/page.tsx` — добавлен импорт и вызов хука на строках 9/64; удалены `useRouter`, `router`, `unsub2` и cleanup `unsub2()`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — добавлен импорт и вызов хука на строках 7/97; удалены `useRouter`, `router`, `u3` и cleanup `u3()`.
- `src/app/game/[roomId]/mafia/page.tsx` — добавлен импорт и вызов хука на строках 6/133; удалены `useRouter`, `router`, `unsubEnded`, комбинированный cleanup; cleanup возвращён к `return cleanup`. Комментарий у `emit('game:end')` переформулирован без literal `game:ended`, чтобы acceptance-греп по `src/app/game/` был нулевым.
- `src/app/game/[roomId]/who-am-i/page.tsx` — добавлен импорт и вызов хука на строках 6/87; удалены `useRouter`, `router`, `unsubEnded`, комбинированный cleanup; cleanup возвращён к `return cleanup`. Комментарий у `emit('game:end')` переформулирован без literal `game:ended`.

### Новые файлы

- `src/lib/use-navigate-on-game-end.ts` — единая подписка на `game:ended`, телефонный клиент уходит на `/join/${roomId}`.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/alias/page.tsx          | 10 +++++-----
src/app/game/[roomId]/crocodile/page.tsx      | 10 +++++-----
src/app/game/[roomId]/hundred-to-one/page.tsx | 10 +++++-----
src/app/game/[roomId]/mafia/page.tsx          | 17 ++++++-----------
src/app/game/[roomId]/quiz/page.tsx           |  9 +++------
src/app/game/[roomId]/spy/page.tsx            | 10 +++++-----
src/app/game/[roomId]/who-am-i/page.tsx       | 17 ++++++-----------
src/lib/use-navigate-on-game-end.ts           | 22 ++++++++++++++++++++++
8 files changed, 57 insertions(+), 48 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -rn "game:ended" src/app/game/` | ✅ | 0 совпадений |
| `grep -n "game:ended" src/lib/use-navigate-on-game-end.ts` | ✅ | 1 совпадение |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ⚠️ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted (os error 1)` при обработке `geist/dist/geistsans...module.css`; не похоже на ошибку изменений TASK-156 |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Дополнительно запускался `npm run build` по общему workflow проекта; он упал на sandbox/Turbopack issue, при этом обязательные для TASK-156 `lint` и `tsc` прошли.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь, что TV-страница не изменилась: `src/app/tv/**` не трогался.
- Единственный оставленный `useRouter` среди 7 игровых страниц — в `quiz/page.tsx`, потому что там есть другие `router.push(...)`.
