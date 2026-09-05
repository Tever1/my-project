# REPORT TASK-133: TV/phone бейджи на тайлах игр в лобби

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-24 20:17 PDT
> - **Финиш:** 2026-05-24 20:27 PDT
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавил UI-only поле `support` в локальный `GameInfo`, проставил TV/phone поддержку всем 7 играм и вывел два glass-бейджа в правом верхнем углу каждого тайла. Иконки сделаны inline SVG, без emoji в JSX.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлено поле `support`, все 7 игр получили `{ tv: true, phone: true }`; в `Tile` добавлены top-right бейджи с общим стилем и inline SVG `TvBadgeIcon` / `PhoneBadgeIcon`.

### Новые файлы

- `codex-reports/133-tv-phone-badges-on-tiles.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/components/lobby/Lobby.tsx | 62 ++++++++++++++++++++++++++++++++++++++++++
1 file changed, 62 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull --ff-only` | ✅ | Already up to date |
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ⚠️ | Turbopack упал из-за sandbox: `Operation not permitted`, `creating new process`, `binding to a port` при обработке `src/app/globals.css` |
| Dev server / browser QA | ⚠️ | `npm run dev` не стартует в sandbox: `tsx` получает `listen EPERM` на IPC pipe |
| Emoji check | ✅ | `grep` по `📺` / `📱` в `Lobby.tsx` ничего не нашёл |
| Acceptance: support field/data | ✅ | `GameInfo.support`, 7 записей games с `{ tv: true, phone: true }` |
| Acceptance: inline SVG badges | ✅ | `TvBadgeIcon` и `PhoneBadgeIcon`, `aria-label`/`title` без emoji |

---

## Отклонения от ТЗ

Нет отклонений в коде. Визуальную проверку localhost/mobile viewport выполнить не удалось из-за sandbox-ограничений на запуск `tsx` dev-сервера.

---

## Открытые вопросы для Claude

Нет.

---

## Подсказки для ревью

- Проверь расположение блока бейджей в `Tile`: он вставлен после full-tile `GameIcon` и до нижнего label-gradient, с `pointerEvents: "none"` и `zIndex: 2`.
- В рабочем дереве до моей работы уже были изменения `.codex/STATUS.md` и untracked `codex-tasks/133-tv-phone-badges-on-tiles.md`; я их не редактировал.
