# REPORT TASK-138: desktop-qr-waiting-screen

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-24 22:55
> - **Финиш:** 2026-05-24 22:59
> - **Длительность:** ~4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

После нажатия «Начать партию» TV-role теперь создаёт комнату при необходимости, отправляет только `game:select` и остаётся на QR-экране ожидания игроков. `game:start` из `handleStartGame` удалён; при `game:started` флаг ожидания сбрасывается и TASK-136-навигация ведёт TV на `/tv/...`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `isWaitingForPlayers`, QR waiting screen с `/join/{roomCode}`, список подключившихся игроков, кнопка «← Назад к лобби», сброс ожидания на `game:started`.

### Новые файлы

- `codex-reports/138-desktop-qr-waiting-screen.md` — отчёт по TASK-138.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/components/lobby/Lobby.tsx | 568 ++++++++++++++++++++++++++++-------------
 1 file changed, 394 insertions(+), 174 deletions(-)
```

Примечание: stat по `Lobby.tsx` включает уже лежащие незакоммиченные изменения TASK-134..137. Собственная правка TASK-138 — QR waiting screen и удаление `game:start` из `handleStartGame`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox |
| Acceptance: no `game:start` in Lobby | ✅ | `rg "game:start" src/components/lobby/Lobby.tsx` не находит строк |
| Acceptance: QR URL `/join/{roomCode}` | ✅ | используется `NEXT_PUBLIC_SITE_URL ?? window.location.origin` |
| Acceptance: waiting reset on `game:started` | ✅ | `setIsWaitingForPlayers(false)` добавлен |
| Acceptance: player list live from `room:state` | ✅ | экран читает `roomState.players` и фильтрует `role !== "tv"` |
| Acceptance: cancel returns to lobby | ✅ | кнопка вызывает `handleCancelWaiting` |

Примечание по build: внутри sandbox Turbopack снова упал на `binding to a port / Operation not permitted`; вне sandbox сборка прошла. Во время успешной сборки Next по-прежнему выводит `ReferenceError: location is not defined`, но команда завершается с кодом 0.

---

## Отклонения от ТЗ

`.env.local.example` не обновлял, потому что пользователь в запуске TASK-138 явно ограничил whitelist: «Только `src/components/lobby/Lobby.tsx`». Код всё равно поддерживает `NEXT_PUBLIC_SITE_URL` с fallback на `window.location.origin`.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить `handleStartGame`: должен быть `game:select`, без `game:start`.
- Проверить QR screen: виден только при `myRole === "tv" && isWaitingForPlayers && roomCode`.
- Проверить URL QR: `/join/${roomCode}`.
