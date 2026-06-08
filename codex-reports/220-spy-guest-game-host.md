# REPORT TASK-220: Шпион — гость как game-host + гостевая идентичность

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-07 22:20
> - **Финиш:** 2026-06-07 22:30
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Экран Шпиона переведён с `useAuth`/`user?.id` на `useGameIdentity(roomId)`.
Управляющие права ведущего, таймер, активный игрок и роль шпиона теперь
считаются через `isGameHost` и `effectivePlayerId`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — заменён импорт `useAuth` на
  `useGameIdentity`, добавлен `useRouter`; все client identity-гейты переведены
  на `effectivePlayerId` / `isGameHost`; `endGame` после `game:end` навигирует
  в lobby/join по типу пользователя.

### Новые файлы

- `codex-reports/220-spy-guest-game-host.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/spy/page.tsx | 43 ++++++++++++++++++++------------------
 1 file changed, 23 insertions(+), 20 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| Acceptance #1 | ✅ | lint без ошибок |
| Acceptance #2 | ✅ | typecheck без ошибок |
| Acceptance #3 | ✅ | `grep` не нашёл `user?.id`, `useAuth` или управляющих `isHost`; остался только тип `GamePlayer.isHost` |
| Acceptance #4 | ✅ | таймерный effect gated by `isGameHost` |
| Acceptance #5 | ✅ | `confirm()`, i18n-строки и raw `<button>` не рефакторились |

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

- Обрати внимание на `src/app/game/[roomId]/spy/page.tsx`: `endGame` теперь
  делает `emit('game:end', { code: roomId })`, затем локально переводит game-host
  в `/lobby/[roomId]` или `/join/[roomId]`.
- В рабочей копии до TASK-220 уже были изменения в `.codex/STATUS.md`, других
  game-файлах и отчётах TASK-217/218/219; этот таск их не трогал.
