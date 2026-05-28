# REPORT TASK-167: Квиз — кнопка ЗАВЕРШИТЬ не работает

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 21:42
> - **Финиш:** 2026-05-27 21:47
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлены оба указанных бага: `game:end` теперь ищет комнату по upper-case коду, а guest game-host в квизе повторно join'ится в socket.io room после reconnect. В `confirmEndGame` добавлена прямая навигация на `/join/${roomId}` как fallback для самого game-host.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — строка 295: `game:end` теперь вызывает `getRoomByCode(data.code.toUpperCase())`.
- `src/app/game/[roomId]/quiz/page.tsx` — строки 101, 127-131, 149-161: добавлен `guestNickname`, запоминание nickname гостя из `gameState.players` и guest auto-reconnect через `room:join`.
- `src/app/game/[roomId]/quiz/page.tsx` — строки 649-653: `confirmEndGame` после `game:end` делает fallback `router.push(`/join/${roomId}`)`.

### Новые файлы

- `codex-reports/167-quiz-end-button-fix.md` — отчёт по TASK-167.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx | 22 ++++++++++++++++++++++
 src/server/socket-handlers.mts      |  2 +-
 2 files changed, 23 insertions(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -n "game:end\b\|getRoomByCode(data.code.toUpperCase())" src/server/socket-handlers.mts` | ✅ | `game:end` строка 294, lookup строка 295 |
| `grep -n "guestNickname\|guestPlayerId.*isConnected" src/app/game/\[roomId\]/quiz/page.tsx` | ✅ | строки 101, 128, 131, 150, 153, 161 |
| `grep -n "confirmEndGame\|router\.push.*join" src/app/game/\[roomId\]/quiz/page.tsx` | ✅ | `router.push` строка 653 внутри `confirmEndGame` |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |

---

## Отклонения от ТЗ

Минимальное техническое отклонение: `setGuestNickname` обёрнут в `queueMicrotask`, потому что локальный ESLint запрещает синхронный `setState` внутри effect (`react-hooks/set-state-in-effect`). Поведение соответствует ТЗ.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Посмотреть `src/app/game/[roomId]/quiz/page.tsx:127` — `queueMicrotask` добавлен только для прохождения существующего lint-правила, по аналогии с соседним init-effect.
