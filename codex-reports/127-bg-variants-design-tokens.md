# REPORT TASK-127: Background variants — секция в /design-tokens

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-21 21:39 PDT
> - **Финиш:** 2026-05-21 21:45 PDT
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлена секция `Game Backgrounds` в `/design-tokens` с тремя статичными превью игровых экранов. Варианты A/B/C используют заданные фоны, включая SVG-noise слой для варианта C.

---

## Что сделано

### Изменённые файлы

- `src/app/design-tokens/page.tsx` — добавлены `BACKGROUND_VARIANTS`, секция `Game Backgrounds` и компонент `GameBackgroundPreview` с общей заглушкой квизового экрана.

### Новые файлы

- `codex-reports/127-bg-variants-design-tokens.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/design-tokens/page.tsx | 148 +++++++++++++++++++++++++++++++++++++++++
1 file changed, 148 insertions(+)
```

Примечание: в рабочем дереве также уже есть изменения в `.codex/STATUS.md` и `src/app/game/[roomId]/quiz/page.tsx`, а также untracked task/report файлы по TASK-126/127. Они не относятся к моей работе по TASK-127 и не редактировались, кроме этого отчёта.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date |
| `npm run lint` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run build` | ⚠️ | Turbopack panic: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `src/app/globals.css` |
| `/design-tokens` визуально | ⚠️ | Не удалось открыть: `npm run dev` падает в sandbox на `tsx` IPC pipe с `listen EPERM` |
| Acceptance #1 | ✅ | `npm run lint` чистый |
| Acceptance #2 | ⚠️ | Страница не открывалась из-за sandbox-ограничения dev-сервера |
| Acceptance #3 | ✅ | В JSX добавлен grid `repeat(3, 1fr)` и три карточки-заглушки |
| Acceptance #4 | ✅ | Лейблы `ВАРИАНТ A/B/C` добавлены |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Проверка страницы в браузере и production build заблокированы ограничениями окружения, а не ошибками TypeScript/lint.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверить визуально `/design-tokens`, когда dev-сервер можно запустить вне sandbox.
- Обратить внимание на слой `.bg-noise::before`: он добавлен inline-стилем внутри секции и поднимает шум под контентом через `z-index`.
