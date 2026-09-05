# REPORT TASK-055: Auth back button 0.30

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-10 13:37
> - **Финиш:** 2026-05-10 13:37
> - **Длительность:** <1 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В `AuthDropdown` изменена прозрачность secondary-кнопки: `0.75` → `0.30`.
Кодовый diff по whitelist-файлу содержит ровно одну строку изменения.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — у secondary-варианта `btnStyle.background` выставлено `rgba(255,255,255,0.30)`.

### Новые файлы

- `codex-reports/055-auth-back-button-030.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 2 +-
1 file changed, 1 insertion(+), 1 deletion(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| Diff только одна строка в `Lobby.tsx` | ✅ | secondary `0.75` → `0.30` |

---

## Отклонения от ТЗ

- `git pull` не выполнен: sandbox не дал записать `.git/FETCH_HEAD` (`Operation not permitted`), approval policy не позволяет запросить расширенные права.

---

## Открытые вопросы для Claude

- нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверить единственную кодовую строку в `src/components/lobby/Lobby.tsx`.
