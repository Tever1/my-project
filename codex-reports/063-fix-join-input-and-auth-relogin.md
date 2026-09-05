# REPORT TASK-063: Fix join input + auth re-login

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 15:59 PDT
> - **Финиш:** 2026-05-10 16:00 PDT
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделаны два хирургических изменения в `src/components/lobby/Lobby.tsx`: показ join input теперь зависит от реактивного `roomCode`, а повторный вход пользователя с уже сохранённым nickname закрывает auth dropdown без шага ввода имени.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — `showJoinRoom` заменён с `!isRoomRoute` на `!roomCode`; в `handleVerifyCode` добавлена проверка `party-hub-user-${digits}` на существующий nickname.

### Новые файлы

- `codex-reports/063-fix-join-input-and-auth-relogin.md` — отчёт по TASK-063.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 12 ++++++++++--
 1 file changed, 10 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Join input после logout/not-found | ✅ | `showJoinRoom` теперь зависит от `roomCode` |
| Re-login с nickname | ✅ | при nickname длиной ≥2 вызывается `onClose()` |
| Новый пользователь | ✅ | без nickname остаётся переход на шаг `nickname` |

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

- Проверить, что изменение `showJoinRoom={!roomCode}` корректно работает после `setRoomCode(null)` на `/lobby/CODE`.
- Проверить re-login с сохранённым `party-hub-user-${digits}` и nickname длиной ≥2.
