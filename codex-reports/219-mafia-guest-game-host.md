# REPORT TASK-219: Мафия — гость как game-host + гостевая идентичность

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-07 22:15
> - **Финиш:** 2026-06-07 22:27
> - **Длительность:** 12 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Экран Mafia переведён с `useAuth`/`user.id` на `useGameIdentity(roomId)`.
Гостевой игрок теперь использует `effectivePlayerId` для роли, живого статуса,
ночных действий и дневного голосования, а host-контролы завязаны на `isGameHost`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/mafia/page.tsx` — импортирован `useGameIdentity`, удалён локальный `isHost`; все игровые проверки идентичности и action payload'ы переведены на `effectivePlayerId`; deps слушателя `game:action` обновлены на `[on, isGameHost, effectivePlayerId]`; `handleEndGame` добавляет явную навигацию.

### Новые файлы

- `codex-reports/219-mafia-guest-game-host.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/game/[roomId]/mafia/page.tsx | 71 ++++++++++++++++++------------------
1 file changed, 36 insertions(+), 35 deletions(-)
```

Полный `git diff --stat` сейчас также показывает уже существующие незакоммиченные изменения TASK-217/218 (`.codex/STATUS.md`, Crocodile, Who Am I). Я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| Acceptance: нет игровых `user?.id`/`user.id` | ✅ | grep оставляет только `{p.isHost && ' ⭐'}` |
| Acceptance: нет `!user` guard в action handlers | ✅ | guards заменены на `!effectivePlayerId` |
| Acceptance: deps listener | ✅ | `[on, isGameHost, effectivePlayerId]` |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/mafia/page.tsx`: listener `game:action`, handlers `handleMafiaVote`/`handleDetectiveCheck`/`handleDoctorSave`/`handleDayVote`, и `onEnd` в `GameLayout`.
- `user` сохранён только для выбора направления навигации (`lobby` vs `phone`/`join`), как указано в ТЗ.
