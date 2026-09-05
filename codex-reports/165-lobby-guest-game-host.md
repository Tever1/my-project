# REPORT TASK-165: Кнопка «+ Добавить игрока» для гостя-game-host в Lobby

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 21:10
> - **Финиш:** 2026-05-27 21:15
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Гость-game-host в Lobby теперь определяется через `effectivePlayerId = user?.id ?? guestPlayerId`. `guestPlayerId` инициализируется из того же localStorage-ключа, что используется в `/join/[code]`, поэтому кнопка «+ Добавить игрока» доступна гостевому game-host.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `GUEST_ID_KEY` и `getGuestPlayerId()` на строках 34-43.
- `src/components/lobby/Lobby.tsx` — добавлен state `guestPlayerId` на строке 197.
- `src/components/lobby/Lobby.tsx` — добавлен init `useEffect` для guest id на строках 224-226.
- `src/components/lobby/Lobby.tsx` — `canAddPlayer` и game-host banner переведены на `effectivePlayerId` на строках 443-448 и 656-661.

### Новые файлы

- `codex-reports/165-lobby-guest-game-host.md` — отчёт по TASK-165.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 24 +++++++++++++++++++++---
1 file changed, 21 insertions(+), 3 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -n "effectivePlayerId" src/components/lobby/Lobby.tsx` | ✅ | 5 строк: 443, 445, 446, 660, 661 |
| `grep -n "party-hub-join-guest-id" src/components/lobby/Lobby.tsx` | ✅ | 1 строка: 34 |
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ничего.

---

## Подсказки для ревью

- Обратить внимание на `src/components/lobby/Lobby.tsx:656`: баннер game-host тоже использует `effectivePlayerId`, чтобы гостевой game-host видел продолжение стартового флоу.
