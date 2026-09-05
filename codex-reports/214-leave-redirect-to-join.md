# REPORT TASK-214: «ВЫЙТИ» ведёт на /join

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-04 21:27
> - **Финиш:** 2026-06-04 21:28
> - **Длительность:** 1 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Кнопка «Выйти» на экране комнаты телефона теперь после `room:leave` и закрытия модалки ведёт на `/join`, а не на `/`. Всё сделано по ТЗ.

---

## Что сделано

### Изменённые файлы

- `src/app/join/[code]/page.tsx` — в `handleLeaveRoom` заменён редирект `router.push("/")` на `router.push("/join")`.

### Новые файлы

- `codex-reports/214-leave-redirect-to-join.md` — отчёт по TASK-214.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/join/[code]/page.tsx | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance: `room:leave` + `/join` | ✅ | `emit("room:leave", {})` и `setConfirmLeave(false)` сохранены, маршрут изменён на `/join` |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверить единственную production-правку в `src/app/join/[code]/page.tsx`: `handleLeaveRoom`.
