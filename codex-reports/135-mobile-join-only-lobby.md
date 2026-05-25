# REPORT TASK-135: mobile-join-only-lobby

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-24 21:39
> - **Финиш:** 2026-05-24 21:55
> - **Длительность:** ~16 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Для `myRole === "player"` лобби теперь показывает join-only экран: ввод кода до входа и ожидание хоста со списком игроков после входа. Desktop/TV flow оставлен за `myRole === "tv"`: создание комнаты, выбор игры, TiltedPreview и tile-strip скрыты для player.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен inline `PlayerJoinView`, ветвление hero по `myRole`, скрытие `RoomButton`, `TiltedPreview` и `TileStrip` для `player`; `RoomState` читает `currentGame` для экрана ожидания.

### Новые файлы

- `codex-reports/135-mobile-join-only-lobby.md` — отчёт по TASK-135.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/components/lobby/Lobby.tsx | 299 +++++++++++++++++++++++++++++++++++------
 1 file changed, 257 insertions(+), 42 deletions(-)
```

Примечание: stat выше по whitelist-файлу `Lobby.tsx` включает незакоммиченные изменения TASK-134, потому TASK-135 выполнялся поверх него. Полный worktree также содержит pre-existing `.codex/STATUS.md`, `src/server/socket-handlers.mts` и task/report файлы TASK-133/134; я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox |
| Acceptance: create hidden for player | ✅ | `RoomButton` рендерится только при `myRole === "tv"` |
| Acceptance: tile-strip hidden for player | ✅ | `TileStrip` рендерится только при `myRole === "tv"` |
| Acceptance: join screen for player without room | ✅ | `PlayerJoinView` показывает «Введи код комнаты» |
| Acceptance: wait screen for player in room | ✅ | `PlayerJoinView` показывает «Ожидание хоста...» и список игроков |
| Acceptance: desktop flow preserved | ✅ | существующий `HeroLeft`, `TiltedPreview`, `TileStrip` остаются в `myRole === "tv"` ветке |
| Acceptance: gated by role, not viewport | ✅ | проверки используют `myRole`, не `isMobile` |

Примечание по build: внутри sandbox Turbopack снова упал на `binding to a port / Operation not permitted`; вне sandbox сборка прошла. Во время успешной сборки Next по-прежнему выводит `ReferenceError: location is not defined`, но команда завершается с кодом 0.

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить `PlayerJoinView` на 375px: input и кнопка должны переноситься и оставаться кликабельными.
- Проверить desktop mode: `myRole === "tv"` должен показывать прежний hero/game-selection flow.
- Проверить mobile/player mode после join: список участников фильтрует `role !== "tv"`.
