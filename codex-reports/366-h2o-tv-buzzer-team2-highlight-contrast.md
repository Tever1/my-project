# REPORT TASK-366: TV «100 к 1» — усилить контраст подсветки team2 на фазе buzzer

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 21:43 PDT
> - **Финиш:** 2026-07-20 21:43 PDT
> - **Длительность:** <1 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Усилена только победная подсветка team2 на TV-фазе `buzzer`: красная рамка/фон/свечение стали ярче и контрастнее. Для консистентности победная рамка team1 тоже переведена с `border-2` на `border-[3px]`; цвет/фон/свечение team1 не менялись.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — в блоке hundred-to-one TV `buzzer`:
  - team1 winner: `border-2` → `border-[3px]`;
  - team2 winner: `border-2 border-red-300 bg-red-400/[.18] shadow-[0_0_50px_rgba(248,113,113,.4)]` → `border-[3px] border-red-400 bg-red-500/[.28] shadow-[0_0_70px_rgba(248,113,113,.65)]`.

### Новые файлы

- `codex-reports/366-h2o-tv-buzzer-team2-highlight-contrast.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff по строкам

```diff
1411   h.buzzerWinner === 1
-1412    ? 'border-2 border-yellow-300 bg-yellow-300/[.18] shadow-[0_0_50px_rgba(250,204,21,.4)]'
+1412    ? 'border-[3px] border-yellow-300 bg-yellow-300/[.18] shadow-[0_0_50px_rgba(250,204,21,.4)]'
...
1434   h.buzzerWinner === 2
-1435    ? 'border-2 border-red-300 bg-red-400/[.18] shadow-[0_0_50px_rgba(248,113,113,.4)]'
+1435    ? 'border-[3px] border-red-400 bg-red-500/[.28] shadow-[0_0_70px_rgba(248,113,113,.65)]'
```

Ветки проигравшего/нейтрального состояния оставлены без изменений:

```tsx
// team1 loser/neutral
'border-yellow-200/10 bg-yellow-300/[.04] opacity-50'
'border-yellow-200/25 bg-yellow-300/[.10]'

// team2 loser/neutral
'border-red-300/10 bg-red-400/[.04] opacity-50'
'border-red-300/25 bg-red-400/[.10]'
```

---

## Diff stat

```text
src/app/tv/[roomId]/[gameType]/page.tsx | 647 +++++++++++++++++++++++---------
1 file changed, 473 insertions(+), 174 deletions(-)
```

Примечание: stat выше по whitelisted TV-файлу включает ранее существующие незакоммиченные изменения в этом файле. Изменение TASK-366 локально ограничено двумя строками winner-классов, показанными в секции "Diff по строкам".

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без вывода |
| `npm run lint` | ✅ | без warnings/errors |
| Обе winner-рамки `border-[3px]` | ✅ | team1 line 1412, team2 line 1435 |
| Красная winner-подсветка team2 усилена | ✅ | `red-400`, `red-500/[.28]`, glow `70px/.65` |
| Ветки loser/neutral не изменены | ✅ | проверено по строкам 1414-1415 и 1437-1438 |

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

- Проверить только `src/app/tv/[roomId]/[gameType]/page.tsx:1412` и `src/app/tv/[roomId]/[gameType]/page.tsx:1435`: это весь production-code diff TASK-366.
