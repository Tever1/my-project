# REPORT TASK-157: Расширить useNavigateOnGameEnd для TV-страницы

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-27 20:20 PDT
> - **Финиш:** 2026-05-27 20:27 PDT
> - **Длительность:** 7 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

`useNavigateOnGameEnd` расширен параметром `target: 'phone' | 'tv'` с дефолтом `'phone'`.
TV-страница теперь использует общий хук с `target='tv'`, а inline-подписка на `game:ended` удалена.

---

## Что сделано

### Изменённые файлы

- `src/lib/use-navigate-on-game-end.ts` — добавлены `NavigateTarget`, `TARGET_PATHS`, дефолт `'phone'`; маршрут телефона остался `/join/${roomId}`, маршрут TV — `/lobby/${roomId}`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен вызов `useNavigateOnGameEnd(roomId, 'tv')`; удалены inline `game:ended` listener, `unsub3`, `router` dependency, `useRouter` import/call.

### Новые файлы

- `codex-reports/157-extend-game-end-hook-for-tv.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/tv/[roomId]/[gameType]/page.tsx | 12 ++++--------
 src/lib/use-navigate-on-game-end.ts     | 21 +++++++++++++++------
 2 files changed, 19 insertions(+), 14 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `grep -RIn "game:ended" src/app/ \| wc -l` | ✅ 0 | Inline-подписок в `src/app/` не осталось |
| `grep -n "game:ended" src/lib/use-navigate-on-game-end.ts \| wc -l` | ✅ 1 | Единственная подписка живёт в хуке |
| `grep -RIn "useNavigateOnGameEnd" src/app/ \| wc -l` | ⚠️ 16 | 8 импортов + 8 вызовов; фактических call sites ровно 8 |
| `grep -RIn "useNavigateOnGameEnd(roomId" src/app/ \| wc -l` | ✅ 8 | 7 игровых страниц + TV |
| `grep -n "useRouter\|router\\." 'src/app/tv/[roomId]/[gameType]/page.tsx' \| wc -l` | ✅ 0 | `useRouter` из TV game page удалён |
| `npm run lint` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run build` | ⚠️ environment-blocked | Turbopack panic: `creating new process - binding to a port - Operation not permitted (os error 1)` при обработке `src/app/globals.css` |

---

## Отклонения от ТЗ

Буквальная acceptance-команда `grep -RIn "useNavigateOnGameEnd" src/app/` возвращает 16 строк, потому что считает и импорты, и вызовы.
Поведенчески требование выполнено: вызовов `useNavigateOnGameEnd(...)` в `src/app/` ровно 8.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ничего по задаче не осталось. `npm run build` не подтвердился из-за ограничения окружения/Turbopack, не из-за TypeScript или lint ошибки.

---

## Подсказки для ревью

- Проверить `src/lib/use-navigate-on-game-end.ts`: дефолт `'phone'` сохраняет поведение семи игровых страниц.
- Проверить `src/app/tv/[roomId]/[gameType]/page.tsx`: `useRouter` удалён, `game:action` effect больше не зависит от `router`.
