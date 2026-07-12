# REPORT TASK-336: Мафия — full-state resync для телефонов и TV

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-12 00:05 PDT
> - **Финиш:** 2026-07-12 00:20 PDT
> - **Длительность:** 15 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен full-state resync для Мафии по тому же паттерну, что в TASK-333 для «Кто я?»: телефон/TV отправляют `request-state`, а отвечает только `isGameHost` через полный `sync-state`. TV при ресинке сохраняет только узкое публичное `mafiaState` и не копирует приватные поля ролей/голосов.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/mafia/page.tsx` — добавлен action `{ type: 'request-state' }`, `gsRef` для свежего состояния, host-only ответ `sync-state`, запрос ресинка при mount/live-state и при `visibilitychange`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — в `tv:join` callback добавлен mafia-запрос `{ type: 'request-state' }`; входящий `sync-state` переводится из полного `MafiaGameState` в локальный `mafiaState`.

### Новые файлы

- `codex-reports/336-mafia-mobile-tv-freeze-fix.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

В worktree уже были незакоммиченные изменения TASK-331/332/333/334/335, включая большой diff в TV-файле. TASK-336 менял только whitelist-файлы; stat по этим двум файлам сейчас:

```
 src/app/game/[roomId]/mafia/page.tsx    |  34 +-
 src/app/tv/[roomId]/[gameType]/page.tsx | 584 +++++++++++++++++++++++++++++++-
 2 files changed, 615 insertions(+), 3 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | первый запуск до build падал на отсутствующих `.next/types/*`; после `next build --webpack` прошёл без ошибок |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` / `Operation not permitted`; похоже на sandbox, как в TASK-333 |
| `npx next build --webpack` | ✅ | production build прошёл; остался старый runtime warning `ReferenceError: location is not defined` для `/profile`, exit code 0 |
| Acceptance: host-only response | ✅ | `request-state` отвечает только при `isGameHost === true` |
| Acceptance: phone background resync | ✅ | `visibilitychange` при `!document.hidden` отправляет `request-state`, если `gsRef.current.phase !== 'lobby'` |
| Acceptance: TV mid-game resync | ✅ | после `tv:join` TV отправляет mafia payload `{ type: 'request-state' }` |
| Acceptance: TV без приватных полей | ✅ | `sync-state` копирует только `phase`, `alive`, `eliminated.id`, `winner`, `round`, `lastEvent: ''` |
| Acceptance: остальные игры не затронуты | ✅ | изменения логики других игр не делал |

---

## Отклонения от ТЗ

`npm run build` не прошёл из-за внутреннего Turbopack/sandbox сбоя окружения. Для проверки сборки дополнительно запущен `npx next build --webpack`, он завершился успешно.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- `src/app/game/[roomId]/mafia/page.tsx:166` — `requestState` не шумит в lobby.
- `src/app/game/[roomId]/mafia/page.tsx:225` — ответ на `request-state` строго host-only и берёт состояние из `gsRef.current`.
- `src/app/tv/[roomId]/[gameType]/page.tsx:381` — TV не добавлен в `TV_STATE_REQUEST`, потому что Mafia использует единый action channel `'mafia'`.
- `src/app/tv/[roomId]/[gameType]/page.tsx:550` — TV `sync-state` намеренно не восстанавливает `lastEvent` и не копирует приватные поля.
