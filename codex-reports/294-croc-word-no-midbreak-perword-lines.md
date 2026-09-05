# REPORT TASK-294: Крокодил — слово без разрыва, фраза по словам

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-25 21:03
> - **Финиш:** 2026-06-25 21:05
> - **Длительность:** 2 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Запрещён перенос внутри слова в `FitText`, а explainer-карточка Крокодила теперь передаёт фразы с явными переносами между словами. Проверки `npx tsc --noEmit` и `npm run lint` прошли без ошибок.

---

## Что сделано

### Изменённые файлы

- `src/components/games/FitText.tsx` — заменён inline-style у `<p>`: `overflowWrap: 'normal'`, `wordBreak: 'normal'`, `whiteSpace: 'pre-line'`.
- `src/app/game/[roomId]/crocodile/page.tsx` — в explainer-карточке текст слова/фразы передаётся в `FitText` через `.replace(/\s+/g, '\n')`.

### Новые файлы

- `codex-reports/294-croc-word-no-midbreak-perword-lines.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/crocodile/page.tsx | 24 +++++++++++++-----------
 src/components/games/FitText.tsx         |  2 +-
 2 files changed, 14 insertions(+), 12 deletions(-)
```

Примечание: stat по `crocodile/page.tsx` включает уже существующие незакоммиченные изменения TASK-293 (`relative` / `absolute inset-0`, `max={128}`), которые были в рабочем дереве до старта TASK-294. В рамках TASK-294 в этом файле изменён только prop `text`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без ошибок |
| Acceptance #1 | ✅ | одно слово больше не получает `overflowWrap: 'anywhere'`, FitText уменьшает шрифт до влезания по ширине/высоте |
| Acceptance #2 | ✅ | пробелы во фразе заменяются на `\n`, `whiteSpace: 'pre-line'` рендерит слова отдельными строками |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- В `src/app/game/[roomId]/crocodile/page.tsx` стоит смотреть только изменение prop `text`; обёртка и `max={128}` относятся к уже существующему TASK-293.
