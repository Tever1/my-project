# REPORT TASK-310: Alias TV no words in classic turn result + mobile card height

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-30 01:26
> - **Финиш:** 2026-06-30 01:30
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Сделаны два точечных UI-изменения по ТЗ: TV Alias classic больше не показывает список слов на `turnResult`, а мобильный экран `explaining` всегда резервирует слот высотой кнопок. Логика игры, счётчики, team scores и letter mode не менялись.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — список `turnHistory` в Alias TV `turnResult` теперь рендерится только при `aliasState.mode !== 'classic'`.
- `src/app/game/[roomId]/alias/page.tsx` — блок действий в `explaining` стал постоянным слотом: у объясняющего прежние две кнопки, у остальных пустой placeholder `h-[76px]`.

### Новые файлы

- `codex-reports/310-alias-tv-nowords-mobile-height.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/alias/page.tsx    | 323 ++++++++++++++++++--------------
 src/app/tv/[roomId]/[gameType]/page.tsx | 199 +++++++++++++-------
 2 files changed, 312 insertions(+), 210 deletions(-)
```

Примечание: эти два файла уже имели незакоммиченные изменения до TASK-310, поэтому stat выше отражает весь текущий diff против HEAD по этим файлам, а не только две строки/обёртки этой задачи.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run lint` | ✅ | Без ошибок |
| `npm run build` | N/A | Не запускал по ТЗ |
| Acceptance: TV classic без списка слов | ✅ | Условие `aliasState.mode !== 'classic'` добавлено |
| Acceptance: TV letter сохраняет список слов | ✅ | Для non-classic условие оставляет прежний render |
| Acceptance: mobile explaining одинаковая высота | ✅ | Для не-объясняющего добавлен placeholder `h-[76px]` |

---

## Отклонения от ТЗ

Нет отклонений. Build не запускался согласно прямому ограничению задачи.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

N/A.

---

## Подсказки для ревью

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx` в блоке Alias `turnResult`: счётчики и team scores остались вне нового условия.
- Проверь `src/app/game/[roomId]/alias/page.tsx` в `explaining`: классы и handlers кнопок не менялись, добавлен только постоянный слот и placeholder.
