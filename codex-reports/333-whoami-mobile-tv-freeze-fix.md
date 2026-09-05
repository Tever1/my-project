# REPORT TASK-333: «Кто я?» — full-state resync для телефонов и TV

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-11 23:45 PDT
> - **Финиш:** 2026-07-11 23:59 PDT
> - **Длительность:** 14 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен full-state resync для «Кто я?»: клиенты могут отправлять `request-state`, а отвечает только `isGameHost` через уже существующий `sync-state`. Телефон запрашивает ресинк при возврате вкладки из фона, TV запрашивает состояние после подтверждённого `tv:join`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/who-am-i/page.tsx` — добавлен action `{ type: 'request-state' }`, `gsRef` для свежего состояния, host-only ответ `sync-state`, запрос ресинка при mount/live-state и `visibilitychange`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен who-am-i payload type `request-state`; в callback `tv:join` добавлен спецкейс `sendAction('who-am-i', { type: 'request-state' })`.

### Новые файлы

- `codex-reports/333-whoami-mobile-tv-freeze-fix.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Текущий worktree уже содержал незакоммиченные изменения TASK-331/332/334 в этих же файлах, поэтому общий stat по whitelist включает не только TASK-333:

```
 src/app/game/[roomId]/who-am-i/page.tsx | 755 +++++++++++++++++++++++++-------
 src/app/tv/[roomId]/[gameType]/page.tsx | 562 +++++++++++++++++++++++-
 2 files changed, 1160 insertions(+), 157 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` / `Operation not permitted`; похоже на ограничение sandbox, не на ошибку TypeScript/кода |
| `npx next build --webpack` | ✅ | production build прошёл; в логе есть старый runtime warning `ReferenceError: location is not defined` для `/profile`, но exit code 0 |
| Acceptance: host-only response | ✅ | `request-state` отвечает только при `isGameHost === true` |
| Acceptance: phone background resync | ✅ | `visibilitychange` при `!document.hidden` отправляет `request-state`, если `gsRef.current.phase !== 'lobby'` |
| Acceptance: TV mid-game resync | ✅ | после `tv:join` TV отправляет `who-am-i` payload `{ type: 'request-state' }` |
| Acceptance: остальные игры не тронуты | ✅ | изменений логики других игр не делал |

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

- `src/app/game/[roomId]/who-am-i/page.tsx:188` — guard не отправляет `request-state` из lobby, чтобы не шуметь до старта игры.
- `src/app/game/[roomId]/who-am-i/page.tsx:257` — ответ на `request-state` строго host-only.
- `src/app/tv/[roomId]/[gameType]/page.tsx:379` — TV не добавлен в `TV_STATE_REQUEST`, потому что у «Кто я?» единый action channel `who-am-i`.
