# REPORT TASK-014: Sync DOM focus с activeGame при ←/→

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 22:58
> - **Финиш:** 2026-05-03 23:01
> - **Длительность:** 3 минуты
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

В `src/app/lobby-preview/page.tsx` синхронизировал DOM focus с новым `activeGame` при навигации ←/→ из tile-strip или body. Кодовое изменение сделано по ТЗ, но `npm run build` не удалось подтвердить из-за sandbox/Turbopack `Operation not permitted`; общий `npm run lint` также падает на существующих ошибках вне whitelist.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — в `keydown` handler стрелки ←/→ теперь вычисляют `nextId` синхронно от focused tile или `activeGame`, обновляют state и фокусируют DOM-тайл с `data-game-id="${nextId}"`, если навигация идёт из strip/body.

### Новые файлы

- `codex-reports/014-tile-arrow-sync-focus.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/lobby-preview/page.tsx | 19 +++++++++++++------
 1 file changed, 13 insertions(+), 6 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox: `cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npm run lint` | ❌ | Падает на существующих ошибках вне whitelist (`.agents`, `mobile`, игровые страницы, shared hooks). В изменённом файле новых ошибок не видно. |
| `npx eslint src/app/lobby-preview/page.tsx` | ✅ | Изменённый whitelist-файл проходит отдельно. |
| `npm run build` | ❌ | Turbopack internal error: `creating new process`, `binding to a port`, `Operation not permitted` при обработке `geistmono_*.module.css`. |
| Acceptance #1 | ⚠️ | Логика реализована; ручной preview QA не запускал. |
| Acceptance #2 | ⚠️ | Логика реализована через `curId` от focused tile; ручной preview QA не запускал. |

---

## Отклонения от ТЗ

Кодовое изменение сделано в пределах whitelist. Проверка `npm run build` не подтверждена из-за sandbox/Turbopack ограничения окружения, не из-за диагностированной ошибки в изменённом файле.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не подтверждён `npm run build`: сборка падает из-за `Operation not permitted` в Turbopack.
- Не выполнен ручной preview MCP QA; по ТЗ его будет делать Claude.

---

## Подсказки для ревью

- Проверь блок `keydown` handler в `src/app/lobby-preview/page.tsx`: теперь направление считается от `focused.dataset.gameId`, когда фокус уже на тайле, и от `activeGame`, когда фокус на body/не tile-strip.
