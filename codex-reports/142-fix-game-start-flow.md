# REPORT TASK-142: fix game start flow

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-25 19:55
> - **Финиш:** 2026-05-25 19:57
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлены два пути запуска игры без изменения серверной логики: кнопка старта на TV QR waiting screen и fixed-баннер старта для игрока, назначенного `gameHostPlayerId`. Оба пути эмитят `game:start` с текущим `roomCode`.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `gameHostPlayerId` в локальный `RoomState`, общий `handleEmitStartGame`, кнопка `НАЧАТЬ ИГРУ` на QR waiting screen и fixed-баннер для game-host в player режиме.

### Новые файлы

- `codex-reports/142-fix-game-start-flow.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 124 +++++++++++++++++++++++++++++++++++++++++
 1 file changed, 124 insertions(+)
```

Примечание: stat включает незакоммиченные изменения TASK-141 в том же файле.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npm run build` | ⚪ | Не запускался: в acceptance указан lint |
| Acceptance #1 | ✅ | TV waiting screen показывает кнопку только при `gamePlayers.length > 0`; клик эмитит `game:start` |
| Acceptance #2 | ✅ | Player game-host видит fixed-баннер при `currentGame` и `gameHostPlayerId`; клик эмитит `game:start` |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверь условие `shouldShowGameHostStartBanner`: баннер намеренно скрыт при `isWaitingForPlayers`, как требовало ТЗ.
- Проверь, что `handleStartGame` по-прежнему делает только `game:select` и переводит TV в waiting screen; новый `game:start` вынесен в отдельный обработчик.
