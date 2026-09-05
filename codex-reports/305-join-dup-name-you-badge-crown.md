# REPORT TASK-305: Join lobby duplicate name, you badge, host crown

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-30 00:30
> - **Финиш:** 2026-06-30 00:38
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделана серверная и клиентская защита от входа с занятым именем в `/join/[code]`.
В списке игроков текст `ведущий` заменён на `CrocIcon name="crown"`, а текущий игрок получает бейдж `Вы`/`You`.

---

## Что сделано

### Изменённые файлы

- `src/server/socket-handlers.mts` — в `room:join` перед созданием нового игрока добавлен guard на дубликат nickname среди игроков с `role !== 'tv'` (`name-taken`, без broadcast).
- `src/app/join/[code]/page.tsx` — добавлен импорт `CrocIcon`, i18n-ключи `nameTaken` и `you`, клиентская предпроверка дубликата имени, локализация серверного `name-taken`, корона ведущего и бейдж текущего игрока.

### Новые файлы

- `codex-reports/305-join-dup-name-you-badge-crown.md` — отчёт по TASK-305.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/join/[code]/page.tsx   | 53 +++++++++++++++++++++++++++++++++++++-----
src/server/socket-handlers.mts |  9 +++++++
2 files changed, 56 insertions(+), 6 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| `npm run build` | Не запускался | по ТЗ: не запускать из-за Turbopack EPERM |
| Whitelist | ✅ | изменения TASK-305 только в разрешённых файлах |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Неприменимо.

---

## Подсказки для ревью

- `src/server/socket-handlers.mts:288` — guard стоит только в ветке нового игрока, поэтому reconnect по `existingPlayer` не затронут.
- `src/app/join/[code]/page.tsx:167` — клиентская проверка использует тот же trim/lowercase и игнорирует `tv`.
- `src/app/join/[code]/page.tsx:405` — если строка одновременно host и текущий игрок, рендерятся обе метки: корона, затем `Вы`/`You`.
