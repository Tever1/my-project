# REPORT TASK-035: Phantom player and touch fix

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-08 21:53 PDT
> - **Финиш:** 2026-05-08 21:58 PDT
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `RoomMenu` игроки без `nickname` больше не попадают в список подключённых игроков. В `Tile` добавлен `touchAction: "pan-x"` на сам `motion.button`, чтобы мобильный свайп по тайлам не давал вертикального дрейфа.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — фильтр `connectedPlayers` теперь проверяет `p.nickname`; в style `motion.button` компонента `Tile` добавлен `touchAction: isMobile ? "pan-x" : undefined`.

### Новые файлы

- `codex-reports/035-phantom-player-and-touch-fix.md` — отчёт по TASK-035.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 5 ++++-
 1 file changed, 4 insertions(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: нет пустых овалов игроков | ✅ | `connectedPlayers` фильтрует пустой `nickname` |
| Acceptance: mobile swipe без vertical drift | ✅ | `touchAction: "pan-x"` добавлен на `motion.button` тайла |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Production diff должен касаться только фильтра `connectedPlayers` и style `motion.button` в `Tile`.
