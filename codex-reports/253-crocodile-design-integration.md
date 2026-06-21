# REPORT TASK-253: Крокодил — интеграция Claude Design Вариант 2

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-17 18:40
> - **Финиш:** 2026-06-17 19:00
> - **Длительность:** 20 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Интегрировал красный Variant 2 UI для фазы `explaining` в мобильном Крокодиле и TV-режиме. Игровая логика, socket events, схема очков и `game-data` не менялись.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/crocodile/page.tsx` — обновлён мобильный `explaining`: статус-бар с `m:ss`, красная карточка слова для объясняющего, информационные чипы угадывающих, нейтральный skip, success guessed, кнопка передачи хода через существующий `croc:next-player`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — обновлён Crocodile TV `explaining`: header counters, круговой таймер, герой с объясняющим и карточная таблица очков.
- `src/components/ui/PlayerAvatar.tsx` — добавлены обратносовместимые пропсы `sizePx?` и `ring?`.

### Новые файлы

- `codex-reports/253-crocodile-design-integration.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/crocodile/page.tsx | 176 +++++++++++++++++++++----------
 src/app/globals.css                      |   5 +
 src/app/tv/[roomId]/[gameType]/page.tsx  | 175 ++++++++++++++++++++++--------
 src/components/ui/PlayerAvatar.tsx       |  11 +-
 4 files changed, 267 insertions(+), 100 deletions(-)
```

Примечание: `src/app/globals.css` уже был изменён до моей работы (TASK-252 фон). Я его не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | не запускал | по acceptance build не запускать |
| `npm run dev` | ⚠️ | sandbox блокирует `tsx` IPC pipe: `listen EPERM` |

---

## Отклонения от ТЗ

Нет по реализации UI. Браузерную smoke-проверку не удалось провести из-за sandbox `EPERM` при запуске `tsx server.mts`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

- Не запускал production build, согласно acceptance.
- Не проверял визуально в браузере, потому что dev-сервер не стартует в sandbox из-за `listen EPERM` на pipe `tsx`.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/crocodile/page.tsx`: кнопка «Передать ход» использует только существующий `croc:next-player`.
- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx`: слово на TV не показывается, категория не добавлялась.
- Проверь `src/components/ui/PlayerAvatar.tsx`: новые пропсы опциональные и не должны менять существующие вызовы.
