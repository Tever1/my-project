# REPORT TASK-176: После завершения игры — гость в /join, хост в /lobby

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 20:08
> - **Финиш:** 2026-05-30 20:14
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Готово: гостевые клиенты после окончания игры теперь получают target `phone` и уходят на `/join/[code]`, а авторизованные пользователи остаются на `/lobby/[code]`. `/join/[code]` запрашивает snapshot комнаты при connect и автоматически rejoin-ится через `room:join` с `isReconnect: true`, если текущий playerId уже есть в комнате.

---

## Что сделано

### Изменённые файлы

- `src/app/join/[code]/page.tsx` — добавлен `room:get-state` на connect/reconnect; auto-rejoin теперь повторно подписывает новый socket на комнату через `room:join` с `isReconnect: true`.
- `src/app/game/[roomId]/quiz/page.tsx` — `useNavigateOnGameEnd` и прямые `router.push` теперь выбирают `/lobby` для `user` и `/join` для гостя.
- `src/app/game/[roomId]/spy/page.tsx` — `useNavigateOnGameEnd` перенесён после `useAuth()` и использует user-aware target.
- `src/app/game/[roomId]/alias/page.tsx` — `useNavigateOnGameEnd` перенесён после `useAuth()` и использует user-aware target.
- `src/app/game/[roomId]/who-am-i/page.tsx` — `useNavigateOnGameEnd` перенесён после `useAuth()` и использует user-aware target.
- `src/app/game/[roomId]/mafia/page.tsx` — `useNavigateOnGameEnd` перенесён после `useAuth()` и использует user-aware target.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — `useNavigateOnGameEnd` перенесён после `useAuth()` и использует user-aware target.
- `src/app/game/[roomId]/crocodile/page.tsx` — `useNavigateOnGameEnd` перенесён после `useAuth()` и использует user-aware target.

### Новые файлы

- `codex-reports/176-game-end-routing-guests.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/alias/page.tsx          |  2 +-
 src/app/game/[roomId]/crocodile/page.tsx      |  2 +-
 src/app/game/[roomId]/hundred-to-one/page.tsx |  2 +-
 src/app/game/[roomId]/mafia/page.tsx          |  2 +-
 src/app/game/[roomId]/quiz/page.tsx           |  6 +++---
 src/app/game/[roomId]/spy/page.tsx            |  2 +-
 src/app/game/[roomId]/who-am-i/page.tsx       |  2 +-
 src/app/join/[code]/page.tsx                  | 18 +++++++++++++++++-
 8 files changed, 26 insertions(+), 10 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `src/app/globals.css`. |
| Acceptance #1 | ✅ | Гость получает target `phone`, `/join` auto-rejoin делает snapshot + reconnect. |
| Acceptance #2 | ✅ | Авторизованный пользователь получает target `lobby`. |
| Acceptance #3 | ✅ | Добавлен `room:get-state` → existing player lookup → `room:join` с `isReconnect: true`. |
| Acceptance #4 | ✅ | `npm run lint` и `npx tsc --noEmit` прошли. |

---

## Отклонения от ТЗ

Нет отклонений по коду. Дополнительно запускался `npm run build` по общему workflow; он упал из-за sandbox/Turbopack internal error, не из-за TypeScript или lint.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `src/app/join/[code]/page.tsx`: auto-rejoin срабатывает только если `playerId` уже найден в `roomState.players`, поэтому новый гость без имени не создаётся через snapshot.
- В рабочем дереве до TASK-176 уже были изменения в `CLAUDE.md`, `.codex/STATUS.md` и `src/app/tv/[roomId]/[gameType]/page.tsx`; я их не трогал и не откатывал.
