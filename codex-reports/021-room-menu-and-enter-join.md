# REPORT TASK-021: Enter для join + popup меню комнаты с QR

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-04 21:05
> - **Финиш:** 2026-05-04 21:32
> - **Длительность:** 27 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Реализованы Enter-submit для join-code input и popup-меню комнаты на месте правой hero-колонки. Меню подписывается на `room:state`, показывает подключённых игроков с пометкой хоста и QR через `react-qrcode-logo`.

Статус partial только из-за проверки: `npm run build` падает в sandbox на Turbopack internal error `binding to a port / Operation not permitted`. Диагностический `npx next build --webpack` завершился с code 0, а `npx eslint src/app/lobby-preview/page.tsx` и `npx tsc --noEmit` прошли.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — добавлены `roomMenuOpen`, `roomState`, подписка на `room:state`, запрос `room:get-state`, закрытие меню по Escape/клику вне popup.
- `src/app/lobby-preview/page.tsx` — `RoomButton` теперь при наличии `roomCode` toggles popup, а без `roomCode` создаёт комнату как раньше.
- `src/app/lobby-preview/page.tsx` — input `data-lobby-cta="join-code-input"` вызывает `onJoinRoom()` по Enter при 6 символах.
- `src/app/lobby-preview/page.tsx` — добавлен inline-компонент `RoomMenu` с glass-look, списком игроков и QR на `${window.location.origin}/lobby/${roomCode}`.

### Новые файлы

- `codex-reports/021-room-menu-and-enter-join.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 .codex/STATUS.md               |   7 +-
 src/app/lobby-preview/page.tsx | 446 ++++++++++++++++++++++++++++++++++++++++-
 src/server/socket-handlers.mts |  16 ++
 3 files changed, 457 insertions(+), 12 deletions(-)
```

Примечание: `.codex/STATUS.md`, `src/server/socket-handlers.mts`, `codex-reports/020-lobby-preview-socket-flow.md`, `codex-tasks/020-lobby-preview-socket-flow.md` и сам task-файл уже были изменены/добавлены до моей правки TASK-021. В рамках TASK-021 я редактировал только `src/app/lobby-preview/page.tsx` и этот отчёт.

Task-file-only stat:

```text
 src/app/lobby-preview/page.tsx | 446 ++++++++++++++++++++++++++++++++++++++++-
 1 file changed, 435 insertions(+), 11 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox: `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npm run lint` | ❌ | Падает на существующих ошибках по всему repo/mobile/.agents; локальная новая ошибка в `lobby-preview` исправлена |
| `npx eslint src/app/lobby-preview/page.tsx` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack internal error: `binding to a port / Operation not permitted` |
| `npx next build --webpack` | ✅ | Exit code 0; в выводе есть существующий `ReferenceError: location is not defined` на `/profile`, но build завершился успешно |
| Acceptance #1 | ⚠️ | `npm run build` не подтвердился из-за sandbox/Turbopack, webpack build OK |
| Acceptance #2 | ✅ | Enter в input при 6 chars вызывает `onJoinRoom()` |
| Acceptance #3 | ✅ | Клик по `КОМНАТА · ABC123` toggles popup на месте `TiltedPreview` |
| Acceptance #4 | ✅ | Popup содержит заголовок, игроков с `хост`, QR код |
| Acceptance #5 | ✅ | Повторный клик / Escape / клик вне закрывают popup |

---

## Отклонения от ТЗ

- `npm run build` не удалось подтвердить из-за ограничения sandbox/Turbopack, не из-за TypeScript/React ошибок в task-файле.
- В `.codex/STATUS.md` активен TASK-020, который тоже лочит `src/app/lobby-preview/page.tsx`. Пользователь явно запустил TASK-021; я продолжил строго в whitelist и не трогал locked-файлы вне task.

---

## Открытые вопросы для Claude

- Нужно ли закрыть/перенести TASK-020 в `.codex/STATUS.md`, чтобы убрать формальную коллизию по `src/app/lobby-preview/page.tsx`?
- Нужно ли отдельно заводить cleanup-задачу для repo-wide `npm run lint`, который сейчас падает на существующих ошибках вне TASK-021?

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не подтверждён именно `npm run build`: Turbopack падает в текущем sandbox на попытке создать процесс/привязаться к порту.
- Не делал browser QA, так как в task acceptance указаны build/checkpoints, а не запуск dev-сервера.

---

## Подсказки для ревью

- Обрати внимание на `src/app/lobby-preview/page.tsx:206` — подписка на `room:state` берёт только `players` и `hostId`, как требует ТЗ.
- Обрати внимание на `src/app/lobby-preview/page.tsx:224` — Escape и outside-click закрывают popup, но клик по `RoomButton` исключён через `closest('[data-topbar="room"]')`, чтобы toggle не конфликтовал с outside handler.
- Обрати внимание на `src/app/lobby-preview/page.tsx:942` — Enter-submit добавлен в существующий input handler перед ArrowRight/Escape логикой.
- Обрати внимание на `src/app/lobby-preview/page.tsx:1270` — QR URL строится через `window.location.origin`, а сам `window` защищён от SSR через `typeof window`.
