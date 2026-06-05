# REPORT TASK-211: TV HUD away state

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-04 21:00
> - **Финиш:** 2026-06-04 21:03
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В TV-странице квиза верхний scoreboard теперь сохраняет away-состояние игрока и приглушает чип, если игрок отключён или свернул/заблокировал телефон. Изменение ограничено quiz HUD в `src/app/tv/[roomId]/[gameType]/page.tsx`.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлен `PlayerInfo.isAway?: boolean`, в quiz scoreboard проброшен `away`, чипы away-игроков получают `opacity-40 grayscale`.

### Новые файлы

- `codex-reports/211-tv-hud-away-state.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/tv/[roomId]/[gameType]/page.tsx | 83 +++++++++++++++++++++++++++++++--
1 file changed, 80 insertions(+), 3 deletions(-)
```

Примечание: в целевом файле уже были незакоммиченные изменения до TASK-211; этот stat включает их тоже. Изменения TASK-211 — только `isAway`, `away` в `scoreboard` и CSS-модификатор чипа.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | 0 ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance #1 | ✅ | TypeScript проходит |
| Acceptance #2 | ✅ | ESLint проходит |

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

- В рабочем дереве уже есть чужие изменения в `src/app/tv/[roomId]/[gameType]/page.tsx`; для TASK-211 смотреть только добавление `isAway`, вычисление `away` в `scoreboard` и `entry.away ? 'opacity-40 grayscale' : ''`.
