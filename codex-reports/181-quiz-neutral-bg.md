# REPORT TASK-181: Quiz — фон полностью нейтральный

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 22:18
> - **Финиш:** 2026-05-30 22:22
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Фон квиза принудительно сделан нейтральным на мобильной странице и TV-странице. Источники фона из special quiz / topic сохранены для бейджей и заголовков, но больше не передаются как backgroundUrl.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — `backgroundUrl` заменён на `undefined`, чтобы `GameLayout` использовал нейтральный фон.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — `backgroundUrl` заменён на `undefined`, чтобы TV quiz не показывал harry-potter/marvel фон.

### Новые файлы

- `codex-reports/181-quiz-neutral-bg.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
 src/app/game/[roomId]/quiz/page.tsx     | 2 +-
 src/app/tv/[roomId]/[gameType]/page.tsx | 2 +-
 2 files changed, 2 insertions(+), 2 deletions(-)
```

Примечание: в рабочем дереве до начала TASK-181 уже были изменения в `.codex/STATUS.md` и `CLAUDE.md`; я их не трогал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Прошёл без ошибок |
| `npx tsc --noEmit` | ✅ | Прошёл без ошибок |
| Acceptance #1 | ✅ | `backgroundUrl` теперь `undefined` на mobile и TV, остаётся `bg-gradient-main` |
| Acceptance #2 | ✅ | harry-potter/marvel картинки больше не подставляются как фон |

---

## Отклонения от ТЗ

Нет отклонений.

---

## Открытые вопросы для Claude

В `.codex/STATUS.md` всё ещё указан активный TASK-171, а в рабочем дереве есть изменения в запрещённых для Codex файлах `.codex/STATUS.md` и `CLAUDE.md`. Я их не редактировал.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь только две строки `backgroundUrl`: логика бейджей и заголовков не менялась.
