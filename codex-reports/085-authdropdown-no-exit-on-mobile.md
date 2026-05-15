# REPORT TASK-085: AuthDropdown no exit on mobile

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-14 20:57
> - **Финиш:** 2026-05-14 21:03
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

TASK-085 выполнен по ТЗ: у `AuthDropdown` на мобильном отключена exit-анимация, чтобы панель исчезала мгновенно и не моргала во время обновления auth-context. Десктопное поведение оставлено прежним. Коммит не делал.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — в `AuthDropdown` mobile `exit` изменён на `{ opacity: 1 }`, mobile `transition` на `{ duration: 0 }`; desktop `exit={{ opacity: 0 }}` и `duration: 0.15 easeOut` сохранены.

### Новые файлы

- `codex-reports/085-authdropdown-no-exit-on-mobile.md` — отчёт по TASK-085.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/components/lobby/Lobby.tsx | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npm run build` | ✅ | первый запуск упал из-за sandbox `binding to a port`; escalated-запуск прошёл с exit 0. В output остаётся существующий `ReferenceError: location is not defined`, сборку не валит |
| Acceptance #1 | ✅ | mobile `AuthDropdown`: `exit={isMobile ? { opacity: 1 } : { opacity: 0 }}` и `duration: 0` |
| Acceptance #2 | ✅ | реализация убирает mobile exit fade |
| Acceptance #3 | ✅ | desktop exit/duration сохранены |

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

- Проверить `src/components/lobby/Lobby.tsx`:1356 — единственная правка TASK-085 в `AuthDropdown` motion container.
