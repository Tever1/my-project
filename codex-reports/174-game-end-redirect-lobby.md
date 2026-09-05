# REPORT TASK-174: После завершения игры → лобби

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 19:45
> - **Финиш:** 2026-05-30 19:46
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Во всех 6 указанных игровых страницах заменён редирект после `game:ended` на лобби: `useNavigateOnGameEnd(roomId, 'lobby')`. Изменение строго механическое, без правок вне whitelist.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — `useNavigateOnGameEnd(roomId)` заменён на `useNavigateOnGameEnd(roomId, 'lobby')`.
- `src/app/game/[roomId]/alias/page.tsx` — `useNavigateOnGameEnd(roomId)` заменён на `useNavigateOnGameEnd(roomId, 'lobby')`.
- `src/app/game/[roomId]/who-am-i/page.tsx` — `useNavigateOnGameEnd(roomId)` заменён на `useNavigateOnGameEnd(roomId, 'lobby')`.
- `src/app/game/[roomId]/mafia/page.tsx` — `useNavigateOnGameEnd(roomId)` заменён на `useNavigateOnGameEnd(roomId, 'lobby')`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx` — `useNavigateOnGameEnd(roomId)` заменён на `useNavigateOnGameEnd(roomId, 'lobby')`.
- `src/app/game/[roomId]/crocodile/page.tsx` — `useNavigateOnGameEnd(roomId)` заменён на `useNavigateOnGameEnd(roomId, 'lobby')`.

### Новые файлы

- `codex-reports/174-game-end-redirect-lobby.md` — отчёт по TASK-174.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/alias/page.tsx          | 2 +-
 src/app/game/[roomId]/crocodile/page.tsx      | 2 +-
 src/app/game/[roomId]/hundred-to-one/page.tsx | 2 +-
 src/app/game/[roomId]/mafia/page.tsx          | 2 +-
 src/app/game/[roomId]/spy/page.tsx            | 2 +-
 src/app/game/[roomId]/who-am-i/page.tsx       | 2 +-
 6 files changed, 6 insertions(+), 6 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| Acceptance #1 | ✅ | Все 6 файлов используют `useNavigateOnGameEnd(roomId, 'lobby')` |
| Acceptance #2 | ✅ | `npm run lint` прошёл |
| Acceptance #3 | ✅ | `npx tsc --noEmit` прошёл |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет. Примечание: до начала работы в дереве уже были изменения в `.codex/STATUS.md` и `CLAUDE.md`, я их не трогал.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить только механическую замену аргумента в 6 whitelist-файлах.
