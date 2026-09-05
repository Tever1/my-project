# REPORT TASK-009: Remove floating badges from TiltedPreview

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 20:15 PDT
> - **Финиш:** 2026-05-03 20:21 PDT
> - **Длительность:** 6 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Два floating-бейджа «8 онлайн» и «2 480» удалены из `TiltedPreview`.
Компонент `FloatingBadge` удалён, ссылок на него в `src/` не осталось.
Глобальные проверки не стали зелёными из-за уже существующих lint-ошибок вне whitelist и sandbox-ошибки Turbopack build.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — удалены оба JSX-вызова `<FloatingBadge />` внутри `TiltedPreview`; удалено объявление `function FloatingBadge`.

### Новые файлы

- `codex-reports/009-remove-floating-badges.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
src/app/lobby-preview/page.tsx | 90 ------------------------------------------
1 file changed, 90 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `grep -rn FloatingBadge src/` | ✅ | Ничего не найдено |
| `npx eslint src/app/lobby-preview/page.tsx` | ✅ | Без вывода |
| `npm run lint` | ❌ | 73 существующие проблемы вне изменённого файла: `.agents/skills/*`, `mobile/*`, `src/app/game/*`, `src/lib/*` |
| `npm run build` | ❌ | Turbopack internal error: sandbox запретил `creating new process` / `binding to a port` при обработке `src/app/globals.css` |

---

## Отклонения от ТЗ

- Acceptance `npm run lint` не выполнен полностью: команда падает на существующих ошибках вне whitelist. Изменённый файл отдельно проходит ESLint.
- Acceptance `npm run build` не выполнен из-за sandbox/Turbopack error, не связанного с изменением `lobby-preview`.
- `git pull` не смог выполниться из-за ограничения доступа к `.git/FETCH_HEAD`.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не исправлял глобальные lint-ошибки, потому что они вне whitelist TASK-009.
- Не обходил Turbopack build через изменение конфигурации или окружения, потому что это вне whitelist TASK-009.

---

## Подсказки для ревью

- Проверь только `src/app/lobby-preview/page.tsx`: diff должен содержать удаление двух JSX-блоков и удаление `function FloatingBadge`.
- В рабочем дереве уже присутствуют изменения/файлы вне моего production-diff: `.codex/STATUS.md` и untracked `codex-tasks/009-remove-floating-badges.md`; я их не редактировал.
