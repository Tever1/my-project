# REPORT TASK-356: «100 к 1» TV — убрать подсказку и увеличить шрифт темы

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-15 22:39
> - **Финиш:** 2026-07-15 22:45
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В TV-экране «100 к 1» удалена подсказка под заголовком ожидания выбора темы.
На экране подготовки размер строки с названием темы увеличен с `text-[14px]` до `text-[28px]`.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — в блоке `gameType === 'hundred-to-one'` удалён `<p>` с текстом «Тема появится на экране после выбора.»; строка `Тема: ...` на prep-экране увеличена до `text-[28px]`.

### Новые файлы

- `codex-reports/356-h2o-topicselect-text-tweaks.md` — отчёт по TASK-356.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 .codex/STATUS.md                              |  38 ++
 src/app/design-tokens/page.tsx                | 125 ++++
 src/app/game/[roomId]/hundred-to-one/page.tsx | 870 +++++++++++++++-----------
 src/app/tv/[roomId]/[gameType]/page.tsx       | 603 ++++++++++++------
 src/components/games/GameLayout.tsx           |   4 +-
 5 files changed, 1101 insertions(+), 539 deletions(-)
```

Примечание: рабочее дерево уже было dirty до TASK-356. Мои production-изменения в рамках этого таска — только две точечные правки в `src/app/tv/[roomId]/[gameType]/page.tsx`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npx tsc --noEmit` | ✅ | — |
| Acceptance #1 | ✅ | Подсказка «Тема появится...» удалена |
| Acceptance #2 | ✅ | Блок названия темы изменён на `text-[28px]` |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Ничего.

---

## Подсказки для ревью

- Проверить `src/app/tv/[roomId]/[gameType]/page.tsx` в блоках `h.phase === 'topicSelect'` и `h.phase === 'roleSelect' || h.phase === 'captainSelect' || h.phase === 'teamNames'`.
