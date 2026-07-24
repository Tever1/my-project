# REPORT TASK-359: «100 к 1» mobile — экран title: «Тема: {название}» вдвое крупнее

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-15 23:19
> - **Финиш:** 2026-07-15 23:23
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На mobile title-экране «100 к 1» строка темы теперь выводится как `Тема: {название}` / `Topic: {name}` и увеличена с `text-[12px]` до `text-[24px]`. Изменение точечное, только в whitelist-файле.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — в фазе `s.phase === 'title'` добавлен локализованный префикс темы и увеличен размер строки темы до `text-[24px]`.

### Новые файлы

- `codex-reports/359-h2o-mobile-title-topic-label.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Текущий `git diff --stat` включает незакоммиченные изменения, которые уже были в рабочем дереве до TASK-359:

```
 .codex/STATUS.md                              |  38 ++
 src/app/design-tokens/page.tsx                | 125 ++++
 src/app/game/[roomId]/hundred-to-one/page.tsx | 872 +++++++++++++++-----------
 src/app/tv/[roomId]/[gameType]/page.tsx       | 643 ++++++++++++++-----
 src/components/games/GameLayout.tsx           |   4 +-
 5 files changed, 1143 insertions(+), 539 deletions(-)
```

Собственная правка TASK-359: одна JSX-строка в `src/app/game/[roomId]/hundred-to-one/page.tsx` плюс этот отчёт.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | чисто |
| `npx tsc --noEmit` | ✅ | чисто |
| Acceptance #1 | ✅ | lint и tsc прошли |
| Acceptance #2 | ✅ | строка title теперь `Тема: {название}` / `Topic: {name}` и `text-[24px]` |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить только title-блок в `src/app/game/[roomId]/hundred-to-one/page.tsx`: добавлен `l('Тема:', 'Topic:')`, размер изменён на `text-[24px]`.
