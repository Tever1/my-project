# REPORT TASK-378: «Мафия» — превью плоских line-иконок на `/design-tokens`

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-21 20:54
> - **Финиш:** 2026-07-21 20:59
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлена preview-секция плоских line-иконок для «Мафии» на `/design-tokens`.
Секция повторяет структуру `HundredToOneIconPreview`: две панели, одинаковая сетка, размер иконок 34px.

---

## Что сделано

### Изменённые файлы

- `src/app/design-tokens/page.tsx` — добавлены мафийские фоновые градиенты, 8 inline SVG-иконок `Mf*`, массив `MAFIA_SAMPLE_ICONS`, функция `MafiaIconPreview()`, вызов секции в композиции страницы.

### Новые файлы

- `codex-reports/378-mafia-line-icons-preview.md` — отчёт по TASK-378.

### Удалённые файлы

- (нет)

---

## Diff по строкам

- `src/app/design-tokens/page.tsx:498` — `MAFIA_BG_DARK` / `MAFIA_BG_CARD`.
- `src/app/design-tokens/page.tsx:504` — 8 SVG-компонентов `MfRole`, `MfNight`, `MfDay`, `MfVote`, `MfDetective`, `MfDoctor`, `MfEliminated`, `MfTrophy`.
- `src/app/design-tokens/page.tsx:558` — `MAFIA_SAMPLE_ICONS`.
- `src/app/design-tokens/page.tsx:1351` — подключение `<MafiaIconPreview />`.
- `src/app/design-tokens/page.tsx:1686` — функция `MafiaIconPreview()`.

---

## Diff stat

```
src/app/design-tokens/page.tsx | 247 +++++++++++++++++++++++++++++++++++++++++
1 file changed, 247 insertions(+)
```

Примечание: stat по `src/app/design-tokens/page.tsx` включает уже существующие незакоммиченные изменения в этом файле до старта TASK-378, в том числе секцию 100 к 1. Строки выше перечисляют добавления TASK-378.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| `npm run build` | ❌ | Turbopack internal error: `creating new process` / `binding to a port` → `Operation not permitted (os error 1)` при обработке `src/app/globals.css`; похоже на ограничение sandbox, не на ошибку TASK-378 |
| Acceptance: секция «Мафия · плоские иконки (превью)» | ✅ | добавлены 2 панели и 8 иконок в стиле остальных preview |
| Acceptance: игровые файлы не редактировались в рамках TASK-378 | ✅ | TASK-378 менял только `src/app/design-tokens/page.tsx` и этот отчёт |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Ничего.

---

## Подсказки для ревью

- Проверь визуально читаемость длинных подписей «Проверка детектива» и «Спасение доктора» в grid `minmax(92px, 1fr)`.
- В рабочем дереве до старта TASK-378 уже были изменения в других файлах; они не относятся к этому таску и не трогались.
