# REPORT TASK-538: Admin content workflow и persistent очередь

> **Метаданные**
> - **Старт:** 2026-09-20 (сквозная сессия; точное время не фиксировалось)
> - **Финиш:** 2026-09-20 17:54 PDT
> - **Длительность:** не определена без надёжного замера
> - **Статус:** ✅ done

## Резюме (TL;DR)

Админка получила последовательный content workflow: генерация русского
оригинала, проверка фактов, отдельный перевод, утверждение и публикация. Долгие
операции хранятся в постоянной локальной очереди с прогрессом, а обычный код без
модели заранее находит структурные проблемы. Добавлены массовые действия,
тематические правила, preview, health-dashboard и rollback вопроса.

## Что сделано

### Изменённые файлы

- `src/components/admin/ContentStudio.tsx` — lifecycle, очередь, preflight,
  тематические профили, bulk-actions, preview, dashboard и история.
- `src/app/api/admin/content/route.ts` — массовые действия и API истории.
- `src/lib/content/catalog.ts` — metadata перевода и профиль тематического квиза.
- `src/lib/content/store.ts` — последние 30 снимков и восстановление вопроса.
- `src/lib/content/fact-check.ts` — исправление сбрасывает устаревший перевод.
- `src/lib/content/quiz-policy.ts` — пользовательский профиль тематической
  проверки с версионированием результата.
- `src/lib/content/store.test.ts`, `src/lib/content/quiz-policy.test.ts` —
  regression-тесты rollback и тематического профиля.

### Новые файлы

- `src/lib/content/admin-jobs.ts` и `src/app/api/admin/content-jobs/route.ts` —
  persistent последовательная очередь.
- `src/lib/content/admin-content-services.ts` — серверные операции генерации,
  Russian-only fact-check и перевода.
- `src/lib/content/quality.ts` — локальные проверки без модели.
- `src/lib/content/lifecycle.ts` — единые статусы вопроса.
- `src/components/admin/ContentJobsPanel.tsx` — прогресс/retry/cancel.
- `src/components/admin/QuizHealthPanel.tsx` — метрики качества и фильтр.
- `src/components/admin/QuestionPreview.tsx` — phone/TV/trial preview контента.
- `src/components/admin/QuestionHistory.tsx` — история и rollback вопроса.
- `src/lib/content/admin-jobs.test.ts`, `quality.test.ts`,
  `lifecycle.test.ts` — новые unit-тесты.
- `docs/decisions/007-local-admin-content-jobs-and-history.md` — решение по
  локальной очереди и истории.

### Удалённые файлы

- нет.

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| Scoped ESLint | ✅ | Все затронутые TS/TSX файлы |
| `npm run typecheck` | ✅ | TypeScript без ошибок |
| Целевые content/admin тесты | ✅ | 20/20, затем config 3/3 |
| `npm test` | ✅ | 219/219, включая Socket.io/reconnect |
| `git diff --check` | ✅ | Проблем форматирования diff нет |
| Browser QA | ⏸️ | Не выполнялся: нет явного разрешения |
| Production build | ⏸️ | Не выполнялся: нет явного разрешения |

Первый sandbox-запуск полного набора дал 28 `listen EPERM` и одну уже
исправленную проверку UI-copy. Повторный запуск с разрешёнными локальными
портами прошёл 219/219; сетевые падения не были дефектами проекта.

## Отклонения от scope/плана

- Библиотека доверенных источников не добавлена по решению Анастасии.
- Очередь охватывает текстовые content jobs. Генерация изображений остаётся
  отдельным preview/save flow, поскольку требует явного визуального выбора.
- Preview показывает композицию контента phone/TV/trial, но не создаёт комнату
  и не заменяет production browser QA.

## Решения, требующие Анастасии

- Разрешить отдельный свежий review общего admin API/persistence контура.
- Отдельно разрешить browser QA `/admin`, если нужно проверить визуальное
  поведение очереди, reload, cancel, bulk-actions, preview и rollback.

## Что НЕ сделано

- Реальные Codex-запросы не запускались, чтобы не расходовать лимиты без
  отдельного пользовательского действия.
- Browser QA, production build, commit и push не выполнялись.

## Подсказки для ревью

- Проверить восстановление `running → queued` после рестарта и гонку добавления
  задания на границе завершения runner.
- Проверить stale-signature защиту RU-check/translation при параллельной правке.
- Проверить ограничение истории 30 снимками и восстановление удалённого вопроса.
- Проверить, что metadata проверки/перевода не попадает в публичный каталог.

## Передача контекста

- `/context-save`: ❌ не выполнен
- Checkpoint: —
- Передача в `Party Games Hub — Общий прогресс`: этот чат является общим
