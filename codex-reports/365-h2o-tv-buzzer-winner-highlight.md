# REPORT TASK-365: TV «100 к 1» — подсветить рамку выигравшей команды на фазе buzzer

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 21:35
> - **Финиш:** 2026-07-20 21:35
> - **Длительность:** <1 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В TV-экране «100 к 1» для фазы `buzzer` добавлены условные классы рамки карточек капитанов. При `buzzerWinner === 0` базовые цвета остались прежними, при победителе его карточка получает `border-2`, яркую рамку и glow-shadow, а проигравшая приглушается.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — в блоке `h.phase === 'buzzer'` заменены статичные классы рамки/фона team1 и team2 на условные классы от `h.buzzerWinner`.

### Новые файлы

- `codex-reports/365-h2o-tv-buzzer-winner-highlight.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/tv/[roomId]/[gameType]/page.tsx | 647 +++++++++++++++++++++++---------
1 file changed, 473 insertions(+), 174 deletions(-)
```

Важно: этот stat отражает весь незакоммиченный diff TV-файла, который уже существовал в рабочем дереве до TASK-365. Точечные изменения TASK-365 находятся на строках 1410-1439.

---

## Diff по строкам TASK-365

- `src/app/tv/[roomId]/[gameType]/page.tsx:1410` — team1 card теперь содержит `transition-all duration-500` и условие:
  `winner=1` → `border-2 border-yellow-300 bg-yellow-300/[.18] shadow-[0_0_50px_rgba(250,204,21,.4)]`;
  `winner=2` → `border-yellow-200/10 bg-yellow-300/[.04] opacity-50`;
  `winner=0` → прежние `border-yellow-200/25 bg-yellow-300/[.10]`.
- `src/app/tv/[roomId]/[gameType]/page.tsx:1433` — team2 card теперь содержит симметричное условие:
  `winner=2` → `border-2 border-red-300 bg-red-400/[.18] shadow-[0_0_50px_rgba(248,113,113,.4)]`;
  `winner=1` → `border-red-300/10 bg-red-400/[.04] opacity-50`;
  `winner=0` → прежние `border-red-300/25 bg-red-400/[.10]`.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | Без вывода, exit code 0 |
| `npm run lint` | ✅ | ESLint без warnings/errors |
| Acceptance: `buzzerWinner === 0` | ✅ | Базовые классы сохранены в fallback-ветке |
| Acceptance: winner highlight | ✅ | Победитель получает `border-2`, яркую рамку, усиленный фон и glow-shadow; проигравший получает приглушённый border/bg + `opacity-50` |
| Acceptance: не трогать другие фазы | ✅ | Изменены только два `className` внутри `h.phase === 'buzzer'` |

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

- Смотреть точечно `src/app/tv/[roomId]/[gameType]/page.tsx:1410` и `src/app/tv/[roomId]/[gameType]/page.tsx:1433`.
- В рабочем дереве до старта уже были незакоммиченные изменения в нескольких файлах; TASK-365 добавляет только условные классы в buzzer-блоке и новый отчёт.
