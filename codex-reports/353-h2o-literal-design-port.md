# REPORT TASK-353: «100 к 1» — буквальный порт дизайна из design-ref

> **Метаданные**
> - **Старт:** 2026-07-15 18:05 PDT
> - **Финиш:** 2026-07-15 19:16 PDT
> - **Длительность:** ~71 минута
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Перенёс мобильный и TV-визуал «100 к 1» на h2o-дизайн из 13 HTML-макетов: amber stage, beam/glow фон через `GameSurface`, glass/strong glass карточки, семантические цвета команд, SVG-иконки без emoji. Игровую механику, socket actions и reducer/state-flow не менял; расширил только TV snapshot type под уже приходящие поля подготовки.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — мобильные фазы переведены на h2o-визуал: role select, team names/captain/title по аналогии, buzzer, playing player/host, results, Big Game input/check, final.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — заменён только блок `gameType === 'hundred-to-one'`: TV splash, prep, buzzer, round board, results, Big Game, final.

### Новые файлы

- `src/components/games/HundredToOneIcon.tsx` — SVG-иконки из макетов: bell, mic, question, timer, cross, check, trophy, phone, board, shuffle, users.

### Удалённые файлы

- нет

---

## Design Mapping

- Фон `h2o-bg`: взял из всех макетов структуру темной amber-сцены с двумя диагональными beams и центральным glow; в коде реализовано через `GameSurface` `gradientClass`/TV root classes, без ручных background images.
- Glass: `.glass` = `rgba(255,255,255,.06)` + `border rgba(255,255,255,.10)` + `blur(20px)`; `.glass-strong` = `rgba(255,255,255,.10)` + `border rgba(255,255,255,.16)` + `blur(24px)`.
- Радиусы: `--r-md/lg/xl/2xl/full` замаплены на `--radius-md/lg/xl/2xl/full`.
- Акцент: `--h2o-1/#f59e0b` замаплен на amber gradient/`--color-game-h2o` визуально; командные `#ffe155` и `#ff7a70` сохранены отдельно.
- Отсутствующие токены: `--font-display` заменён на основной Geist `font-sans` с `font-bold/extrabold`; `--text-tertiary/quaternary` заменены на `text-white/40`, `text-white/30`, `text-white/25`; `--glass-border-strong` заменён на `rgba(255,255,255,.16)` по тому же принципу, что текущие glass-порты Who Am I/Spy используют более плотные white-alpha borders.
- Фазы без макета: `topicSelect`, `teamNames`, `captainSelect`, `title`, `r4rules`, `results`, ожидание Big Game сделаны по соседним h2o-паттернам: role cards, score cards, round header, glass panels, h2o buttons.

---

## Diff stat

```
src/app/game/[roomId]/hundred-to-one/page.tsx | large visual JSX/style rewrite
src/app/tv/[roomId]/[gameType]/page.tsx       | hundred-to-one TV block visual rewrite
src/components/games/HundredToOneIcon.tsx     | new SVG icon component
```

В рабочем дереве до старта уже были изменения вне whitelist (`.codex/STATUS.md`, `src/app/design-tokens/page.tsx`, `src/components/games/GameLayout.tsx`) и untracked TASK/design-ref files. Я их не менял и не откатывал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | чисто |
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run build` | ⚠️ | Turbopack internal error: `Operation not permitted (os error 1)` при `creating new process` / `binding to a port` во время обработки `src/app/globals.css`; не похоже на ошибку кода TASK-353 |
| Acceptance: SVG вместо emoji | ✅ | h2o-контент переведён на `HundredToOneIcon`; системные чужие места вне whitelist не трогал |
| Acceptance: team colors | ✅ | `#ffe155` / `#ff7a70` сохранены |

---

## Отклонения от ТЗ

Нет по коду/whitelist. `npm run build` не подтвердился из-за sandbox/Turbopack ограничения, при этом lint и tsc чистые.

---

## Открытые вопросы для Claude

Нет.

---

## Подсказки для ревью

- Проверь визуально `hundred-to-one` mobile фазу `bigGame`: я сохранил существующую механику проверки/ручного зачёта, но уплотнил строки под макет `Phone - Большая игра`.
- Проверь TV prep на реальных комнатах: экран использует `players/roles/captains` из `h2o:sync`; эти поля уже есть в mobile state и full-state broadcast.
