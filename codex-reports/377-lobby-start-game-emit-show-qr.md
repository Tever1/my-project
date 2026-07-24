# REPORT TASK-377: `handleStartGame` emits `room:show-qr`

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-21 20:46 PDT
> - **Финиш:** 2026-07-21 20:47 PDT
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Синхронизировал локальный переход TV в waiting/QR screen с серверным `room.showQrCode`: теперь `handleStartGame` эмитит `show: true`. При финальном запуске игры `handleEmitStartGame` сбрасывает серверный флаг через `show: false`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `emit('room:show-qr', { code, show: true })` после `setIsWaitingForPlayers(true)` в `handleStartGame`.
- `src/components/lobby/Lobby.tsx` — добавлен `emit('room:show-qr', { code: roomCode, show: false })` перед `emit('game:start', { code: roomCode })` в `handleEmitStartGame`.

### Новые файлы

- `codex-reports/377-lobby-start-game-emit-show-qr.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 18 +++++++++++++++---
1 file changed, 15 insertions(+), 3 deletions(-)
```

Примечание: общий diff по `Lobby.tsx` включает уже существовавшие до TASK-377 изменения TASK-376. Новые строки TASK-377:

```diff
+    emit('room:show-qr', { code, show: true });
+    emit('room:show-qr', { code: roomCode, show: false });
```

Актуальные позиции после изменения:

- `src/components/lobby/Lobby.tsx:681`
- `src/components/lobby/Lobby.tsx:727`

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| Acceptance: QR после `handleStartGame` | ✅ | код эмитит `room:show-qr` с `show: true` |
| Acceptance: сброс при `game:start` | ✅ | код эмитит `room:show-qr` с `show: false` |

---

## Отклонения от ТЗ

Нет отклонений по production-коду. Отчёт создан в `codex-reports/` по явному требованию секции «Отчёт».

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Ручной браузерный сценарий не прогонялся, так как acceptance покрывается точечным socket emit изменением и прошли `tsc`/`lint`.

---

## Подсказки для ревью

- Проверь `src/components/lobby/Lobby.tsx:681` и `src/components/lobby/Lobby.tsx:727`.
- В рабочем дереве были предварительные изменения в `Lobby.tsx` до старта TASK-377; я их не менял и не откатывал.
