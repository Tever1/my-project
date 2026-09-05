# REPORT TASK-326: «Кто я?» — черновой TV-рендер

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-02 22:03
> - **Финиш:** 2026-07-02 22:24
> - **Длительность:** 21 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен черновой кастомный TV-рендер для `who-am-i` перед generic fallback. TV теперь зеркалит `game:action` payload'ы, показывает lobby/playing/finished, скрывает персонажа активного игрока, обновляет счётчики и кратко показывает результат угадывания.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — добавлены локальные типы/state для `WhoAmIState`, обработка `action === 'who-am-i'` в общем `game:action`-листенере и JSX-рендер трёх фаз через `GameSurface`.

### Новые файлы

- `codex-reports/326-whoami-tv-screen-draft.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/tv/[roomId]/[gameType]/page.tsx | 312 ++++++++++++++++++++++++++++++++
 codex-reports/326-whoami-tv-screen-draft.md | 79 ++++++++
```

Примечание: в рабочем дереве уже были незакоммиченные изменения по `.codex/STATUS.md`, `codex-tasks/_DONE.md`, `docs/who-am-i-design-brief.md` и `src/app/game/[roomId]/who-am-i/page.tsx`; я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance: кастомный TV-рендер вместо GENERIC | ✅ | добавлен `if (gameType === 'who-am-i')` перед generic fallback |
| Acceptance: активный персонаж замаскирован | ✅ | hero-карточка всегда показывает `???`, с комментарием в JSX |
| Acceptance: live-счётчики | ✅ | `guessedPlayers`, `turnOrder`, `questionsAsked` обновляются из `game:action` |
| Acceptance: overlay угадывания | ✅ | `lastWhoAmIGuessResult` очищается через `window.setTimeout` за 3 секунды |
| Acceptance: финальная таблица | ✅ | сортировка по `scores`, медали топ-3 |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Новый `request-state`/socket event не добавлялся.

---

## Открытые вопросы для Claude

В `.codex/STATUS.md` активным всё ещё указан TASK-323, но whitelist там не пересекается с TASK-326. Продолжил по явному task-файлу `codex-tasks/326-whoami-tv-screen-draft.md`.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверь ветку `action === 'who-am-i'` в общем listener: она намеренно повторяет mobile reducer, без request-state.
- Проверь TV JSX-блок перед generic fallback: это черновая структура фаз, без финальной визуальной полировки.
