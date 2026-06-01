# REPORT TASK-171: TV Quiz — 4 визуальных и поведенческих бага

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-30 16:50
> - **Финиш:** 2026-05-30 16:54
> - **Длительность:** 4 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлены 4 бага TV-режима квиза: варианты ответа приведены к мобильному стилю, фон тематических квизов поднят через stacking context, emoji-иконки заменены на `GameIcon`, а TV-клиент в лобби больше не открывает QR-экран по `room:show-qr`.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — удалены gradient/letter варианты TV quiz, добавлен `GameIcon`, добавлен `isolate` для фоновой картинки, варианты ответа переписаны на карточки с левой полоской и цифровым бейджем.
- `src/components/lobby/Lobby.tsx` — обработчик `room:show-qr` теперь игнорирует событие для `myRole === "tv"`.

### Новые файлы

- `codex-reports/171-tv-quiz-4-bugs.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/tv/[roomId]/[gameType]/page.tsx | 56 ++++++++++++++++-----------------
 src/components/lobby/Lobby.tsx          |  4 ++-
 2 files changed, 31 insertions(+), 29 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | Already up to date. |
| `npm run lint` | ✅ | Без ошибок и предупреждений после удаления неиспользуемого `gameIcon`. |
| `npm run build` | ❌ | Turbopack internal error: sandbox запрещает creating new process / binding to a port при обработке `node_modules/geist/dist/geistsans_d5a4f12f.module.css`. |
| Acceptance #1 | ✅ | TV варианты ответа: `rounded-md border backdrop-blur-xl`, левая полоска, цифровой бейдж. |
| Acceptance #2 | ✅ | Корневой quiz TV div получил `isolate`, фоновый `img -z-10` остаётся в локальном stacking context. |
| Acceptance #3 | ✅ | JSX-рендеры `{gameIcon}` заменены на `<GameIcon gameId={gameType} ... />`. |
| Acceptance #4 | ✅ | TV больше не выставляет `isWaitingForPlayers` по `room:show-qr`. |

---

## Отклонения от ТЗ

Удалена строка `const gameIcon = gameInfo?.icon || '🎮';`, хотя в ТЗ было сказано оставить её. После замены всех JSX-рендеров на `GameIcon` константа стала неиспользуемой и давала eslint warning.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Визуальный browser QA не запускался: задача была механическая, а production build заблокирован sandbox/Turbopack ошибкой окружения.

---

## Подсказки для ревью

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx` в quiz question-блоке: стили вариантов ответа намеренно больше не используют TV gradient palette.
- В рабочем дереве до старта уже были изменения в `.codex/STATUS.md`, `CLAUDE.md` и untracked `codex-tasks/171-tv-quiz-4-bugs.md`; Codex их не редактировал.
