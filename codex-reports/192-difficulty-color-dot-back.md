# REPORT TASK-192: Вернуть цветную точку сложности в бейдж сложности

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 21:59
> - **Финиш:** 2026-05-31 22:03
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

В general waiting бейдж сложности снова добавлен `DifficultyIcon` с размером 16 и `gap-2`. Бейдж темы не менялся.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/quiz/page.tsx` — в мобильный waiting difficulty-бейдж добавлены `gap-2` и `<DifficultyIcon difficulty={diffInfo.id} size={16} />`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — в TV waiting difficulty-бейдж добавлены `gap-2` и `<DifficultyIcon difficulty={diffInfo.id} size={16} />`.

### Новые файлы

- `codex-reports/192-difficulty-color-dot-back.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx     | 3 ++-
 src/app/tv/[roomId]/[gameType]/page.tsx | 3 ++-
 2 files changed, 4 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date. |
| `npm run lint` | ✅ | Без ошибок. |
| `npm run build` | ❌ | Turbopack internal error окружения: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `node_modules/geist/dist/geistsans_d5a4f12f.module.css`. |
| Acceptance #1 | ✅ | Оба difficulty-бейджа содержат `<DifficultyIcon difficulty={diffInfo.id} size={16} />` и `gap-2`. |
| Acceptance #2 | ✅ | Topic-бейджи в waiting-блоках не изменялись и остались без добавленной иконки сложности. |

---

## Отклонения от ТЗ

Нет отклонений в коде. `npm run build` не прошёл из-за sandbox/Turbopack ошибки окружения, не связанной с изменением.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Production build не удалось подтвердить из-за Turbopack internal error в sandbox.

---

## Подсказки для ревью

- Проверь только waiting-блоки general quiz: `diffInfo` получил цветную точку, `topicInfo` рядом остался без неё.
