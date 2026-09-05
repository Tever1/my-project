# REPORT TASK-315: Alias TV "Объясняет" — убрать аватар-кружок

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-30 23:50
> - **Финиш:** 2026-06-30 23:54
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В Alias TV в фазе `explaining` удалён аватар-кружок рядом с подписью "Объясняет". Остался только крупный текст с именем игрока; остальные использования `PlayerAvatar` в TV-файле не тронуты.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — удалён `<PlayerAvatar nickname={explainerName} sizePx={88} ring="#ec4899" />` из блока Alias "Explainer + letter"; обёртка имени упрощена до `min-w-0`, без `flex`/`gap-6`.

### Новые файлы

- `codex-reports/315-alias-tv-explaining-no-avatar-circle.md` — отчёт по TASK-315.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/tv/[roomId]/[gameType]/page.tsx | 3 +--
 1 file changed, 1 insertion(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run lint` | ✅ | чисто |
| `npm run build` | ❌ | Turbopack panic в sandbox: `creating new process` / `binding to a port` / `Operation not permitted`; кодовая ошибка не выявлена |
| Acceptance: убрать avatar в Alias TV explaining | ✅ | удалён только этот `<PlayerAvatar>` |
| Acceptance: остальные `PlayerAvatar` не задеты | ✅ | в TV-файле остались использования на строках 1576 и 1612 |

---

## Отклонения от ТЗ

Нет отклонений по изменению кода. Дополнительно запускался `npm run build` по проектному workflow; он упал из-за ограничения окружения/Turbopack, не из-за TypeScript или lint.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx` в блоке Alias `Explainer + letter`: diff должен быть ровно удалением аватара и `gap`.
- В рабочем дереве до старта уже были изменения TASK-314: `src/app/game/[roomId]/alias/page.tsx`, `codex-reports/314-alias-turnresult-word-list-colors.md`, `codex-tasks/314-alias-turnresult-word-list-colors.md`, `codex-tasks/315-alias-tv-explaining-no-avatar-circle.md`. Я их не трогал.
