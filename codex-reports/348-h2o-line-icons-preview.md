# REPORT TASK-348: «100 к 1» — превью вариантов плоских line-иконок на /design-tokens

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-13 22:09
> - **Финиш:** 2026-07-13 22:13
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен новый preview-блок для плоских line-иконок «100 к 1» на `/design-tokens`.
Игровые экраны и TV не трогал; иконки существуют только на internal preview-странице.

---

## Что сделано

### Изменённые файлы

- `src/app/design-tokens/page.tsx` — добавлены `H2O_BG_DARK`/`H2O_BG_CARD`, 8 inline SVG-компонентов `Ho*`, массив `H2O_SAMPLE_ICONS`, компонент `HundredToOneIconPreview()` и подключение после `WhoAmIIconPreview`.

### Новые файлы

- `codex-reports/348-h2o-line-icons-preview.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Для файла задачи:

```text
 src/app/design-tokens/page.tsx | 125 +++++++++++++++++++++++++++++++++++++++++
 1 file changed, 125 insertions(+)
```

Примечание: в рабочем дереве до/параллельно задаче уже были unrelated изменения/файлы по TASK-346/347 и `src/app/tv/[roomId]/[gameType]/page.tsx`; я их не менял.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | чисто |
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run build` | ❌ | Turbopack sandbox failure: `creating new process` / `binding to a port` / `Operation not permitted`; не похоже на ошибку кода |
| Acceptance #1 | ✅ | lint + tsc чисто |
| Acceptance #2 | ✅ | секция подключена после WhoAmI, 8 иконок на двух панелях, русский текст |
| Acceptance #3 | ✅ | игровые файлы «100 к 1» и TV не редактировались в этой задаче |

---

## Отклонения от ТЗ

Нет отклонений по функциональному ТЗ. `npm run build` дополнительно запускался по workflow проекта, но упал на ограничении sandbox/Turbopack, не на изменённом коде.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Посмотреть визуально формы `HoQuestion`, `HoAnswer`, `HoStrike`, `HoFund`, `HoBuzzer`, `HoRounds`, `HoDuel`, `HoTrophy` в новой секции `/design-tokens`.
- Проверить, что градиенты янтарной темы достаточно консистентны с существующими Spy/Alias/WhoAmI preview-блоками.
