# REPORT TASK-363: TV «100 к 1» — captainSelect center message

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 21:20 PDT
> - **Финиш:** 2026-07-20 21:25 PDT
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На TV-экране «100 к 1» центральная панель для фазы `captainSelect` теперь показывает текст ожидания выбора капитанов вместо QR-кода. Фаза `teamNames` осталась на прежней QR-ветке.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — тернарник центральной панели подготовки «100 к 1» расширен до трёх веток: `roleSelect`, `captainSelect`, остальные фазы (`teamNames`) с QR-кодом.

### Новые файлы

- `codex-reports/363-h2o-tv-captainselect-center-message.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff по строкам

- `src/app/tv/[roomId]/[gameType]/page.tsx:1359` — добавлена отдельная ветка `h.phase === 'captainSelect'`.
- `src/app/tv/[roomId]/[gameType]/page.tsx:1360-1362` — добавлен блок с тем же стилем, что у «Все выбрали роль ✓», и текстом `{l('Команды выбирают капитанов...', 'Teams are choosing captains...')}`.
- `src/app/tv/[roomId]/[gameType]/page.tsx:1363` — QR-блок оставлен в финальной ветке, поэтому продолжает применяться для `teamNames`.

---

## Diff stat

```
src/app/tv/[roomId]/[gameType]/page.tsx | 647 +++++++++++++++++++++++---------
1 file changed, 473 insertions(+), 174 deletions(-)
```

Примечание: stat включает уже существующие незакоммиченные изменения в этом файле до TASK-363. Фактическая правка TASK-363 — добавление ветки `captainSelect` на строках 1359-1362.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| Acceptance: `captainSelect` без QR | ✅ | JSX-ветка заменяет QR на текстовый блок |
| Acceptance: `teamNames` с QR | ✅ | QR-блок остался в финальной ветке |

---

## Отклонения от ТЗ

Нет отклонений по production-файлам. Отчёт создан в `codex-reports/` по требованию ТЗ.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Визуальный браузерный прогон не запускался; изменение проверено статически по JSX и acceptance. `tsc` и `lint` прошли.

---

## Подсказки для ревью

- Проверить `src/app/tv/[roomId]/[gameType]/page.tsx:1359` — ветка `captainSelect` вставлена между `roleSelect` и QR-фоллбэком.
