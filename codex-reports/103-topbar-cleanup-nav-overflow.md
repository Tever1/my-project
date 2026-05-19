# REPORT TASK-103: TopBar cleanup nav overflow

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-18 20:10 PDT
> - **Финиш:** 2026-05-18 20:15 PDT
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TopBar очищен от элементов Friends/FriendsOnline, а nav получил `overflow: "clip"` для hover-scale кнопки "Играть". Keyboard order обновлён под фактические элементы TopBar.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлен `overflow: "clip"` на `<nav>`, удалены `friends-nav` и `friends-online` из keyboard order, удалены кнопка "Друзья", FriendsOnline pill и связанный presence state/subscription.

### Новые файлы

- `codex-reports/103-topbar-cleanup-nav-overflow.md` — отчёт по TASK-103.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 79 ++----------------------------------------
1 file changed, 3 insertions(+), 76 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | exit 0 |
| Acceptance: только разрешённые рабочие файлы | ✅ | изменены `src/components/lobby/Lobby.tsx` и отчёт |
| Acceptance: protected files untouched | ✅ | `CLAUDE.md`, `AGENTS.md`, `.codex/**` не изменялись |

---

## Отклонения от ТЗ

Нет отклонений. Дополнительно удалены ставшие неиспользуемыми `presenceCount` state/effect/prop и локальный компонент `FriendsOnlinePill` в том же файле.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить `src/components/lobby/Lobby.tsx`: TopBar теперь содержит только `play`, `tv`, `room`, `avatar` в keyboard order.
